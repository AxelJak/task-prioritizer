import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Task, AIAnalysisResponse, CachedResponse } from '../utils/types.js';

interface CacheDB extends DBSchema {
  cache: {
    key: string;
    value: CachedResponse;
  };
}

class CacheManager {
  private db: IDBPDatabase<CacheDB> | null = null;
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

  async init(): Promise<void> {
    this.db = await openDB<CacheDB>('TaskCache', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'hash' });
        }
      },
    });
  }

  private generateHash(tasks: Task[]): string {
    const taskTexts = tasks.map(t => t.text).sort().join('|');
    return btoa(taskTexts).replace(/[^a-zA-Z0-9]/g, '');
  }

  async getCachedResponse(tasks: Task[]): Promise<AIAnalysisResponse | null> {
    if (!this.db) await this.init();
    
    const hash = this.generateHash(tasks);
    const cached = await this.db!.get('cache', hash);
    
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_EXPIRY) {
      await this.db!.delete('cache', hash);
      return null;
    }
    
    return cached.response;
  }

  async cacheResponse(tasks: Task[], response: AIAnalysisResponse): Promise<void> {
    if (!this.db) await this.init();
    
    const hash = this.generateHash(tasks);
    const cachedResponse: CachedResponse = {
      hash,
      response,
      timestamp: Date.now()
    };
    
    await this.db!.put('cache', cachedResponse);
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();
    
    const now = Date.now();
    const allCached = await this.db!.getAll('cache');
    
    const expiredHashes = allCached
      .filter(cached => now - cached.timestamp > this.CACHE_EXPIRY)
      .map(cached => cached.hash);
    
    const tx = this.db!.transaction('cache', 'readwrite');
    await Promise.all([
      ...expiredHashes.map(hash => tx.store.delete(hash)),
      tx.done
    ]);
  }

  async clearAllCache(): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.clear('cache');
  }
}

export const cacheManager = new CacheManager();