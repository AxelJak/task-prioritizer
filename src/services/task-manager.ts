import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Task, CachedResponse } from '../utils/types.js';

interface TaskDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
  };
  cache: {
    key: string;
    value: CachedResponse;
  };
}

class TaskManager {
  private db: IDBPDatabase<TaskDB> | null = null;

  async init(): Promise<void> {
    this.db = await openDB<TaskDB>('TaskPrioritizer', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'hash' });
        }
      },
    });
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    if (!this.db) await this.init();
    
    const tx = this.db!.transaction('tasks', 'readwrite');
    await Promise.all([
      ...tasks.map(task => tx.store.put(task)),
      tx.done
    ]);
  }

  async saveTask(task: Task): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('tasks', task);
  }

  async getAllTasks(): Promise<Task[]> {
    if (!this.db) await this.init();
    const tasks = await this.db!.getAll('tasks');
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('tasks', id);
  }

  async clearAllTasks(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('tasks');
  }

  async updateTask(task: Task): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('tasks', task);
  }

  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  parseTasksFromText(text: string): Task[] {
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return lines.map(line => ({
      id: this.generateId(),
      text: line,
      createdAt: new Date(),
    }));
  }
}

export const taskManager = new TaskManager();