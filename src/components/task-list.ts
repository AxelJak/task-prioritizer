import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Task, TaskCategory } from '../utils/types.js';
import './priority-card.ts';

type SortOption = 'score-desc' | 'score-asc' | 'created-desc' | 'created-asc' | 'alphabetical';

@customElement('task-list')
export class TaskList extends LitElement {
  @property({ type: Array }) tasks: Task[] = [];
  @state() private sortBy: SortOption = 'score-desc';
  @state() private filterCategory: TaskCategory | 'all' = 'all';

  static styles = css`
    :host {
      display: block;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .controls {
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .control-label {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-secondary, #666);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .select {
      padding: 8px 12px;
      border: 1px solid var(--input-border, #e0e0e0);
      border-radius: 4px;
      font-size: 14px;
      background: white;
      cursor: pointer;
      outline: none;
    }

    .select:focus {
      border-color: var(--primary-color, #007bff);
    }

    .task-count {
      font-size: 14px;
      color: var(--text-secondary, #666);
    }

    .categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-top: 20px;
    }

    .category-section {
      background: var(--category-bg, #f8f9fa);
      border-radius: 8px;
      padding: 16px;
      border: 1px solid var(--category-border, #e9ecef);
    }

    .category-header {
      display: flex;
      justify-content: between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--category-accent, #007bff);
    }

    .category-title {
      font-size: 16px;
      font-weight: 600;
      text-transform: capitalize;
      color: var(--text-color, #333);
      margin: 0;
    }

    .category-count {
      background: var(--category-accent, #007bff);
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-left: auto;
    }

    .category-section.urgent-important {
      --category-accent: #ff4757;
      --category-bg: #fff5f5;
      --category-border: #fed7d7;
    }

    .category-section.important-not-urgent {
      --category-accent: #3742fa;
      --category-bg: #f0f4ff;
      --category-border: #c3dafe;
    }

    .category-section.urgent-not-important {
      --category-accent: #ffa502;
      --category-bg: #fffaf0;
      --category-border: #fed7aa;
    }

    .category-section.neither {
      --category-accent: #747d8c;
      --category-bg: #f8f9fa;
      --category-border: #e9ecef;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary, #666);
      font-style: italic;
    }

    .empty-category {
      text-align: center;
      padding: 20px;
      color: var(--text-secondary, #666);
      font-size: 14px;
      font-style: italic;
    }

    .export-btn {
      padding: 8px 16px;
      background: var(--secondary-color, #6c757d);
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s ease;
    }

    .export-btn:hover {
      background: var(--secondary-color-hover, #545b62);
    }

    @media (max-width: 768px) {
      .categories {
        grid-template-columns: 1fr;
      }
      
      .header {
        flex-direction: column;
        align-items: stretch;
      }
      
      .controls {
        justify-content: space-between;
      }
    }
  `;

  private get sortedAndFilteredTasks(): Task[] {
    let filtered = this.tasks;

    // Filter by category
    if (this.filterCategory !== 'all') {
      filtered = filtered.filter(task => {
        const category = task.aiPriority?.category || task.localPriority?.category;
        return category === this.filterCategory;
      });
    }

    // Sort tasks
    return filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'score-desc':
          const scoreA = a.aiPriority?.score || a.localPriority?.score || 0;
          const scoreB = b.aiPriority?.score || b.localPriority?.score || 0;
          return scoreB - scoreA;
        
        case 'score-asc':
          const scoreA2 = a.aiPriority?.score || a.localPriority?.score || 0;
          const scoreB2 = b.aiPriority?.score || b.localPriority?.score || 0;
          return scoreA2 - scoreB2;
        
        case 'created-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        
        case 'created-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        
        case 'alphabetical':
          return a.text.localeCompare(b.text);
        
        default:
          return 0;
      }
    });
  }

  private getCategoryTasks(category: TaskCategory): Task[] {
    return this.tasks.filter(task => {
      const taskCategory = task.aiPriority?.category || task.localPriority?.category;
      return taskCategory === category;
    }).sort((a, b) => {
      const scoreA = a.aiPriority?.score || a.localPriority?.score || 0;
      const scoreB = b.aiPriority?.score || b.localPriority?.score || 0;
      return scoreB - scoreA;
    });
  }

  private handleSortChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.sortBy = target.value as SortOption;
  }

  private handleFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.filterCategory = target.value as TaskCategory | 'all';
  }

  private exportTasks() {
    const data = this.tasks.map(task => ({
      text: task.text,
      createdAt: task.createdAt,
      localScore: task.localPriority?.score,
      localCategory: task.localPriority?.category,
      aiScore: task.aiPriority?.score,
      aiCategory: task.aiPriority?.category,
      aiReasoning: task.aiPriority?.reasoning,
      aiConfidence: task.aiPriority?.confidence
    }));

    const csv = [
      'Text,Created At,Local Score,Local Category,AI Score,AI Category,AI Reasoning,AI Confidence',
      ...data.map(task => [
        `"${task.text.replace(/"/g, '""')}"`,
        task.createdAt,
        task.localScore || '',
        task.localCategory || '',
        task.aiScore || '',
        task.aiCategory || '',
        task.aiReasoning ? `"${task.aiReasoning.replace(/"/g, '""')}"` : '',
        task.aiConfidence || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private renderCategoryGrid() {
    const categories: TaskCategory[] = ['urgent-important', 'important-not-urgent', 'urgent-not-important', 'neither'];
    
    return html`
      <div class="categories">
        ${categories.map(category => {
          const categoryTasks = this.getCategoryTasks(category);
          const categoryTitle = category.replace('-', ' ');
          
          return html`
            <div class="category-section ${category}">
              <div class="category-header">
                <h3 class="category-title">${categoryTitle}</h3>
                <span class="category-count">${categoryTasks.length}</span>
              </div>
              
              ${categoryTasks.length > 0 ? html`
                ${categoryTasks.map(task => html`
                  <priority-card .task=${task}></priority-card>
                `)}
              ` : html`
                <div class="empty-category">No tasks in this category</div>
              `}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderSortedList() {
    const sortedTasks = this.sortedAndFilteredTasks;
    
    return html`
      ${sortedTasks.map(task => html`
        <priority-card .task=${task}></priority-card>
      `)}
    `;
  }

  render() {
    if (this.tasks.length === 0) {
      return html`
        <div class="empty-state">
          No tasks yet. Add some tasks above to get started!
        </div>
      `;
    }

    const displayTasks = this.filterCategory === 'all' ? this.tasks : this.sortedAndFilteredTasks;

    return html`
      <div class="header">
        <div class="task-count">
          ${displayTasks.length} task${displayTasks.length === 1 ? '' : 's'}
          ${this.filterCategory !== 'all' ? ` (${this.filterCategory.replace('-', ' ')})` : ''}
        </div>
        
        <div class="controls">
          <div class="control-group">
            <label class="control-label">Filter</label>
            <select class="select" @change=${this.handleFilterChange} .value=${this.filterCategory}>
              <option value="all">All Categories</option>
              <option value="urgent-important">Urgent & Important</option>
              <option value="important-not-urgent">Important, Not Urgent</option>
              <option value="urgent-not-important">Urgent, Not Important</option>
              <option value="neither">Neither</option>
            </select>
          </div>
          
          <div class="control-group">
            <label class="control-label">Sort</label>
            <select class="select" @change=${this.handleSortChange} .value=${this.sortBy}>
              <option value="score-desc">Priority (High to Low)</option>
              <option value="score-asc">Priority (Low to High)</option>
              <option value="created-desc">Newest First</option>
              <option value="created-asc">Oldest First</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
          
          <button class="export-btn" @click=${this.exportTasks}>
            Export CSV
          </button>
        </div>
      </div>

      ${this.filterCategory === 'all' 
        ? this.renderCategoryGrid() 
        : this.renderSortedList()}
    `;
  }
}