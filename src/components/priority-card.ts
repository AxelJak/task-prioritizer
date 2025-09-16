import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Task } from '../utils/types.js';

@customElement('priority-card')
export class PriorityCard extends LitElement {
  @property({ type: Object }) task!: Task;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 12px;
    }

    .card {
      background: var(--card-bg, #ffffff);
      border: 1px solid var(--card-border, #e0e0e0);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s ease;
    }

    .card:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .task-text {
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 12px 0;
      color: var(--text-color, #333);
    }

    .priority-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    .score {
      font-weight: bold;
      font-size: 18px;
      padding: 4px 8px;
      border-radius: 4px;
      min-width: 32px;
      text-align: center;
    }

    .score--high { background: #ff6b6b; color: white; }
    .score--medium { background: #ffd93d; color: #333; }
    .score--low { background: #6bcf7f; color: white; }

    .category {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 500;
    }

    .category--urgent-important { background: #ff4757; color: white; }
    .category--important-not-urgent { background: #3742fa; color: white; }
    .category--urgent-not-important { background: #ffa502; color: white; }
    .category--neither { background: #747d8c; color: white; }

    .ai-info {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--card-border, #e0e0e0);
      display: none;
    }

    .ai-info.show {
      display: block;
    }

    .reasoning {
      font-size: 12px;
      color: var(--text-secondary, #666);
      font-style: italic;
      margin-bottom: 4px;
    }

    .confidence {
      font-size: 11px;
      color: var(--text-tertiary, #999);
    }

    .confidence-bar {
      height: 3px;
      background: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      margin: 4px 0;
    }

    .confidence-fill {
      height: 100%;
      background: var(--primary-color, #007bff);
      transition: width 0.3s ease;
    }

    .source-indicator {
      font-size: 10px;
      color: var(--text-tertiary, #999);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .loading {
      opacity: 0.7;
      position: relative;
    }

    .loading::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shimmer 1.5s infinite;
    }

    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;

  private getScoreClass(score: number): string {
    if (score >= 7) return 'score--high';
    if (score >= 4) return 'score--medium';
    return 'score--low';
  }

  private getCategoryClass(category: string): string {
    return `category--${category.replace(' ', '-')}`;
  }

  render() {
    const priority = this.task.aiPriority || this.task.localPriority;
    const isAIAnalyzed = !!this.task.aiPriority;
    const isLoading = !priority;

    return html`
      <div class="card ${isLoading ? 'loading' : ''}">
        <p class="task-text">${this.task.text}</p>
        
        ${priority ? html`
          <div class="priority-info">
            <span class="score ${this.getScoreClass(priority.score)}">
              ${priority.score}
            </span>
            <span class="category ${this.getCategoryClass(priority.category)}">
              ${priority.category.replace('-', ' ')}
            </span>
            <span class="source-indicator">
              ${isAIAnalyzed ? `AI (${this.task.aiPriority?.provider?.toUpperCase()})` : 'Local'}
            </span>
          </div>
        ` : html`
          <div class="priority-info">
            <span class="source-indicator">Analyzing...</span>
          </div>
        `}

        ${this.task.aiPriority ? html`
          <div class="ai-info show">
            <div class="reasoning">${this.task.aiPriority.reasoning}</div>
            <div class="confidence">
              Confidence: ${Math.round(this.task.aiPriority.confidence * 100)}%
              <div class="confidence-bar">
                <div class="confidence-fill" 
                     style="width: ${this.task.aiPriority.confidence * 100}%"></div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}