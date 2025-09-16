import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Task, AIAnalysisResponse, AIPriority, AIProvider } from '../utils/types.js';
import { cacheManager } from './cache-manager.js';

export class AIAnalyzer {
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private gemini: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;
  private provider: AIProvider | null = null;
  private analysisQueue: Task[] = [];
  private isProcessing = false;
  private batchTimeout: number | null = null;

  setApiKey(apiKey: string, provider: AIProvider): void {
    this.apiKey = apiKey;
    this.provider = provider;
    
    // Clear all clients first
    this.anthropic = null;
    this.openai = null;
    this.gemini = null;
    
    // Initialize the selected provider
    switch (provider) {
      case 'anthropic':
        this.anthropic = new Anthropic({
          apiKey,
          dangerouslyAllowBrowser: true
        });
        break;
      case 'openai':
        this.openai = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true
        });
        break;
      case 'gemini':
        this.gemini = new GoogleGenerativeAI(apiKey);
        break;
    }
  }

  private createBatchPrompt(tasks: Task[]): string {
    return `Analyze these tasks and return JSON with priority scores (1-10), categories, and reasoning.

Categories:
- urgent-important: Critical tasks that need immediate attention
- important-not-urgent: Important tasks that can be planned
- urgent-not-important: Urgent but less critical tasks that could be delegated
- neither: Tasks with low urgency and importance

Tasks:
${tasks.map((t, i) => `${i+1}. ${t.text}`).join('\n')}

Return only valid JSON in this exact format:
{
  "tasks": [
    {
      "index": 1,
      "score": 8,
      "category": "urgent-important",
      "reasoning": "Brief explanation of why this score and category",
      "confidence": 0.9
    }
  ]
}`;
  }

  async analyzeTasks(tasks: Task[]): Promise<AIAnalysisResponse | null> {
    if (!this.provider || !this.apiKey) {
      throw new Error('API key and provider not set. Please configure an AI provider first.');
    }

    // Check cache first
    const cached = await cacheManager.getCachedResponse(tasks);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.createBatchPrompt(tasks);
      let analysisResponse: AIAnalysisResponse;
      
      switch (this.provider) {
        case 'anthropic':
          analysisResponse = await this.analyzeWithAnthropic(prompt);
          break;
        case 'openai':
          analysisResponse = await this.analyzeWithOpenAI(prompt);
          break;
        case 'gemini':
          analysisResponse = await this.analyzeWithGemini(prompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }
      
      // Cache the response
      await cacheManager.cacheResponse(tasks, analysisResponse);
      
      return analysisResponse;
    } catch (error) {
      console.error('AI Analysis error:', error);
      return null;
    }
  }

  queueTasks(tasks: Task[]): void {
    // Add tasks to queue, avoiding duplicates
    const newTasks = tasks.filter(task => 
      !this.analysisQueue.some(queued => queued.id === task.id)
    );
    
    this.analysisQueue.push(...newTasks);
    
    // Debounce processing
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = window.setTimeout(() => {
      this.processBatch();
    }, 2000);
  }

  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.analysisQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      const tasksToAnalyze = this.analysisQueue.splice(0, 10); // Process up to 10 tasks at once
      const response = await this.analyzeTasks(tasksToAnalyze);
      
      if (response) {
        // Dispatch custom event with analysis results
        const event = new CustomEvent('ai-analysis-complete', {
          detail: {
            tasks: tasksToAnalyze,
            analysis: response,
            provider: this.provider
          }
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.isProcessing = false;
      
      // Process remaining queue if any
      if (this.analysisQueue.length > 0) {
        setTimeout(() => this.processBatch(), 1000);
      }
    }
  }

  private async analyzeWithAnthropic(prompt: string): Promise<AIAnalysisResponse> {
    if (!this.anthropic) throw new Error('Anthropic client not initialized');
    
    const response = await this.anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return JSON.parse(content.text);
  }

  private async analyzeWithOpenAI(prompt: string): Promise<AIAnalysisResponse> {
    if (!this.openai) throw new Error('OpenAI client not initialized');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.1
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content);
  }

  private async analyzeWithGemini(prompt: string): Promise<AIAnalysisResponse> {
    if (!this.gemini) throw new Error('Gemini client not initialized');
    
    const model = this.gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  }

  isConfigured(): boolean {
    return this.provider !== null && this.apiKey !== null && (
      (this.provider === 'anthropic' && this.anthropic !== null) ||
      (this.provider === 'openai' && this.openai !== null) ||
      (this.provider === 'gemini' && this.gemini !== null)
    );
  }

  getProvider(): AIProvider | null {
    return this.provider;
  }

  static mapResponseToTasks(tasks: Task[], response: AIAnalysisResponse, provider: AIProvider): Task[] {
    return tasks.map((task, index) => {
      const analysis = response.tasks.find(a => a.index === index + 1);
      if (analysis) {
        const aiPriority: AIPriority = {
          score: analysis.score,
          category: analysis.category,
          reasoning: analysis.reasoning,
          confidence: analysis.confidence,
          provider
        };
        return { ...task, aiPriority };
      }
      return task;
    });
  }
}

export const aiAnalyzer = new AIAnalyzer();