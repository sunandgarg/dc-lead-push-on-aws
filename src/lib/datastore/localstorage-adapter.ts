// LocalStorage Adapter - Backup persistence layer

const STORAGE_PREFIX = 'dekhocampus_';
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit for safety

class LocalStorageAdapter {
  private isSupported: boolean;

  constructor() {
    this.isSupported = this.checkSupport();
  }

  private checkSupport(): boolean {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private getKey(storeName: string, key?: string): string {
    return key 
      ? `${STORAGE_PREFIX}${storeName}_${key}`
      : `${STORAGE_PREFIX}${storeName}`;
  }

  async put<T>(storeName: string, key: string, data: T): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const fullKey = this.getKey(storeName, key);
      const serialized = JSON.stringify(data);
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.warn('LocalStorage put failed:', error);
      return false;
    }
  }

  async putCollection<T>(storeName: string, items: T[]): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const fullKey = this.getKey(storeName);
      const serialized = JSON.stringify(items);
      
      // Check size before storing
      if (serialized.length > MAX_STORAGE_SIZE) {
        console.warn('Data too large for localStorage, storing partial data');
        // Store only the most recent items
        const partialItems = items.slice(0, Math.floor(items.length / 2));
        localStorage.setItem(fullKey, JSON.stringify(partialItems));
        return false;
      }
      
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.warn('LocalStorage putCollection failed:', error);
      return false;
    }
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    if (!this.isSupported) return undefined;

    try {
      const fullKey = this.getKey(storeName, key);
      const data = localStorage.getItem(fullKey);
      return data ? JSON.parse(data) : undefined;
    } catch (error) {
      console.warn('LocalStorage get failed:', error);
      return undefined;
    }
  }

  async getCollection<T>(storeName: string): Promise<T[]> {
    if (!this.isSupported) return [];

    try {
      const fullKey = this.getKey(storeName);
      const data = localStorage.getItem(fullKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.warn('LocalStorage getCollection failed:', error);
      return [];
    }
  }

  async delete(storeName: string, key: string): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const fullKey = this.getKey(storeName, key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.warn('LocalStorage delete failed:', error);
      return false;
    }
  }

  async clear(storeName: string): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const prefix = this.getKey(storeName);
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('LocalStorage clear failed:', error);
      return false;
    }
  }

  async clearAll(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.warn('LocalStorage clearAll failed:', error);
      return false;
    }
  }

  getStorageUsage(): { used: number; available: number } {
    if (!this.isSupported) return { used: 0, available: 0 };

    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
        }
      }
    }

    return {
      used: totalSize * 2, // UTF-16 uses 2 bytes per character
      available: MAX_STORAGE_SIZE - totalSize * 2,
    };
  }

  isAvailable(): boolean {
    return this.isSupported;
  }
}

export const localStorageAdapter = new LocalStorageAdapter();
