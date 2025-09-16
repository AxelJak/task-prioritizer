import type { Task, LocalPriority, TaskCategory } from './types.js';

interface ScoreWeights {
  urgencyKeywords: string[];
  importanceKeywords: string[];
  lowPriorityKeywords: string[];
}

const SCORE_WEIGHTS: ScoreWeights = {
  urgencyKeywords: [
    'urgent', 'asap', 'immediately', 'now', 'today', 'critical', 'emergency',
    'blocking', 'broken', 'down', 'bug', 'crash', 'issue', 'problem',
    'deadline', 'due', 'overdue', 'late'
  ],
  importanceKeywords: [
    'important', 'critical', 'essential', 'key', 'major', 'significant',
    'revenue', 'security', 'data', 'user', 'customer', 'client',
    'launch', 'release', 'deploy', 'production', 'feature', 'functionality'
  ],
  lowPriorityKeywords: [
    'nice to have', 'optional', 'enhancement', 'improvement', 'polish',
    'minor', 'small', 'tiny', 'cosmetic', 'documentation', 'comment',
    'research', 'explore', 'consider', 'maybe', 'someday'
  ]
};

class LocalScoring {
  private calculateKeywordScore(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    return keywords.reduce((score, keyword) => {
      const matches = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
      return score + matches;
    }, 0);
  }

  private calculateUrgencyScore(text: string): number {
    let score = 0;
    
    // Check for urgency keywords
    score += this.calculateKeywordScore(text, SCORE_WEIGHTS.urgencyKeywords) * 2;
    
    // Check for time-sensitive patterns
    if (/\b(today|now|asap|immediately)\b/i.test(text)) score += 3;
    if (/\b(this week|urgent|critical)\b/i.test(text)) score += 2;
    if (/\b(next week|soon)\b/i.test(text)) score += 1;
    
    // Check for negative urgency indicators
    score -= this.calculateKeywordScore(text, SCORE_WEIGHTS.lowPriorityKeywords);
    
    return Math.max(0, Math.min(5, score)); // Cap between 0-5
  }

  private calculateImportanceScore(text: string): number {
    let score = 0;
    
    // Check for importance keywords
    score += this.calculateKeywordScore(text, SCORE_WEIGHTS.importanceKeywords) * 2;
    
    // Check for business impact patterns
    if (/\b(revenue|money|profit|cost|budget)\b/i.test(text)) score += 3;
    if (/\b(security|data|backup|recovery)\b/i.test(text)) score += 3;
    if (/\b(user|customer|client)\b/i.test(text)) score += 2;
    if (/\b(feature|functionality|capability)\b/i.test(text)) score += 1;
    
    // Check for negative importance indicators
    score -= this.calculateKeywordScore(text, SCORE_WEIGHTS.lowPriorityKeywords);
    
    return Math.max(0, Math.min(5, score)); // Cap between 0-5
  }

  private determineCategory(urgency: number, importance: number): TaskCategory {
    const urgentThreshold = 2.5;
    const importantThreshold = 2.5;
    
    const isUrgent = urgency >= urgentThreshold;
    const isImportant = importance >= importantThreshold;
    
    if (isUrgent && isImportant) return 'urgent-important';
    if (isImportant && !isUrgent) return 'important-not-urgent';
    if (isUrgent && !isImportant) return 'urgent-not-important';
    return 'neither';
  }

  scoreTask(task: Task): LocalPriority {
    const urgencyScore = this.calculateUrgencyScore(task.text);
    const importanceScore = this.calculateImportanceScore(task.text);
    
    // Combine scores: weighted average with slight importance bias
    const combinedScore = (urgencyScore + importanceScore * 1.2) / 2.2;
    const normalizedScore = Math.max(1, Math.min(10, Math.round(combinedScore * 2)));
    
    const category = this.determineCategory(urgencyScore, importanceScore);
    
    return {
      score: normalizedScore,
      category: category
    };
  }

  scoreTasks(tasks: Task[]): Task[] {
    return tasks.map(task => ({
      ...task,
      localPriority: this.scoreTask(task)
    }));
  }
}

export const localScoring = new LocalScoring();