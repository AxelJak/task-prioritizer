export type TaskCategory = 'urgent-important' | 'important-not-urgent' | 'urgent-not-important' | 'neither';

export type AIProvider = 'anthropic' | 'openai' | 'gemini';

export interface LocalPriority {
  score: number;
  category: string;
}

export interface AIPriority {
  score: number;
  category: TaskCategory;
  reasoning: string;
  confidence: number;
  provider: AIProvider;
}

export interface Task {
  id: string;
  text: string;
  createdAt: Date;
  localPriority?: LocalPriority;
  aiPriority?: AIPriority;
}

export interface AIAnalysisRequest {
  tasks: Task[];
  timestamp: number;
}

export interface AIAnalysisResponse {
  tasks: Array<{
    index: number;
    score: number;
    category: TaskCategory;
    reasoning: string;
    confidence: number;
  }>;
}

export interface CachedResponse {
  hash: string;
  response: AIAnalysisResponse;
  timestamp: number;
}

export interface AppState {
  tasks: Task[];
  isOnline: boolean;
  isAnalyzing: boolean;
  analysisQueue: Task[];
}