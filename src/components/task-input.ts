import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { taskManager } from '../services/task-manager.js';
import { localScoring } from '../utils/local-scoring.js';
import { aiAnalyzer } from '../services/ai-analyzer.js';

@customElement('task-input')
export class TaskInput extends LitElement {
  @property({ type: String }) placeholder = 'Enter your tasks (one per line)...';
  @state() private inputValue = '';
  @state() private isProcessing = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 24px;
    }

    .input-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .textarea {
      width: 100%;
      min-height: 120px;
      padding: 16px;
      border: 2px solid var(--input-border, #e0e0e0);
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
      resize: vertical;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .textarea:focus {
      border-color: var(--primary-color, #007bff);
    }

    .textarea:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }

    .actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      outline: none;
    }

    .btn:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    .btn--primary {
      background: var(--primary-color, #007bff);
      color: white;
    }

    .btn--primary:hover:not(:disabled) {
      background: var(--primary-color-hover, #0056b3);
      transform: translateY(-1px);
    }

    .btn--secondary {
      background: #6c757d;
      color: white;
    }

    .btn--secondary:hover:not(:disabled) {
      background: #545b62;
    }

    .loading-text {
      font-size: 12px;
      color: var(--text-secondary, #666);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #e0e0e0;
      border-top: 2px solid var(--primary-color, #007bff);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .task-count {
      font-size: 12px;
      color: var(--text-secondary, #666);
      margin-left: auto;
    }
  `;

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    this.inputValue = target.value;
  }

  private getTaskCount(): number {
    return this.inputValue.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0).length;
  }

  private async processTasks() {
    if (!this.inputValue.trim()) return;

    this.isProcessing = true;

    try {
      // Parse tasks from input
      const newTasks = taskManager.parseTasksFromText(this.inputValue);
      
      if (newTasks.length === 0) return;

      // Apply local scoring immediately
      const tasksWithLocalScoring = localScoring.scoreTasks(newTasks);

      // Save to IndexedDB
      await taskManager.saveTasks(tasksWithLocalScoring);

      // Queue for AI analysis if configured
      if (aiAnalyzer.isConfigured()) {
        aiAnalyzer.queueTasks(tasksWithLocalScoring);
      }

      // Emit event for other components
      this.dispatchEvent(new CustomEvent('tasks-added', {
        detail: { tasks: tasksWithLocalScoring },
        bubbles: true
      }));

      // Clear input
      this.inputValue = '';
      
    } catch (error) {
      console.error('Error processing tasks:', error);
      
      // Emit error event
      this.dispatchEvent(new CustomEvent('processing-error', {
        detail: { error: error instanceof Error ? error.message : 'Unknown error' },
        bubbles: true
      }));
    } finally {
      this.isProcessing = false;
    }
  }

  private clearInput() {
    this.inputValue = '';
  }

  render() {
    const taskCount = this.getTaskCount();

    return html`
      <div class="input-container">
        <textarea
          class="textarea"
          .value=${this.inputValue}
          @input=${this.handleInput}
          placeholder=${this.placeholder}
          ?disabled=${this.isProcessing}
        ></textarea>
        
        <div class="actions">
          <button 
            class="btn btn--primary"
            @click=${this.processTasks}
            ?disabled=${this.isProcessing || !this.inputValue.trim()}
          >
            ${this.isProcessing ? 'Processing...' : 'Add Tasks'}
          </button>
          
          <button 
            class="btn btn--secondary"
            @click=${this.clearInput}
            ?disabled=${this.isProcessing || !this.inputValue.trim()}
          >
            Clear
          </button>

          ${this.isProcessing ? html`
            <div class="loading-text">
              <div class="spinner"></div>
              Processing tasks...
            </div>
          ` : ''}

          <div class="task-count">
            ${taskCount} task${taskCount === 1 ? '' : 's'}
          </div>
        </div>
      </div>
    `;
  }
}