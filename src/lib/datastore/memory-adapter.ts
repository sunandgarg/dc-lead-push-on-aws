// Memory Adapter - Working/runtime persistence layer

class MemoryAdapter {
  private stores: Map<string, Map<string, any>> = new Map();
  private collections: Map<string, any[]> = new Map();

  async put<T>(storeName: string, key: string, data: T): Promise<void> {
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map());
    }
    this.stores.get(storeName)!.set(key, data);
  }

  async putMany<T extends { [key: string]: any }>(
    storeName: string, 
    items: T[], 
    keyField: string
  ): Promise<void> {
    if (!this.stores.has(storeName)) {
      this.stores.set(storeName, new Map());
    }
    const store = this.stores.get(storeName)!;
    for (const item of items) {
      store.set(item[keyField], item);
    }
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    return this.stores.get(storeName)?.get(key);
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = this.stores.get(storeName);
    if (!store) return [];
    return Array.from(store.values());
  }

  async getByField<T extends Record<string, any>>(
    storeName: string, 
    fieldName: string, 
    value: any
  ): Promise<T[]> {
    const store = this.stores.get(storeName);
    if (!store) return [];
    
    return Array.from(store.values()).filter(
      item => item[fieldName] === value
    ) as T[];
  }

  async delete(storeName: string, key: string): Promise<void> {
    this.stores.get(storeName)?.delete(key);
  }

  async clear(storeName: string): Promise<void> {
    this.stores.delete(storeName);
    this.collections.delete(storeName);
  }

  async clearAll(): Promise<void> {
    this.stores.clear();
    this.collections.clear();
  }

  // Collection-based operations (for ordered lists)
  async setCollection<T>(storeName: string, items: T[]): Promise<void> {
    this.collections.set(storeName, items);
  }

  async getCollection<T>(storeName: string): Promise<T[]> {
    return (this.collections.get(storeName) || []) as T[];
  }

  async addToCollection<T>(storeName: string, item: T): Promise<void> {
    const collection = this.collections.get(storeName) || [];
    collection.push(item);
    this.collections.set(storeName, collection);
  }

  async updateInCollection<T extends { [key: string]: any }>(
    storeName: string,
    keyField: string,
    keyValue: any,
    updates: Partial<T>
  ): Promise<void> {
    const collection = this.collections.get(storeName) || [];
    const index = collection.findIndex(item => item[keyField] === keyValue);
    if (index >= 0) {
      collection[index] = { ...collection[index], ...updates };
      this.collections.set(storeName, collection);
    }
  }

  async removeFromCollection<T extends { [key: string]: any }>(
    storeName: string,
    keyField: string,
    keyValue: any
  ): Promise<void> {
    const collection = this.collections.get(storeName) || [];
    const filtered = collection.filter(item => item[keyField] !== keyValue);
    this.collections.set(storeName, filtered);
  }

  // Utility methods
  has(storeName: string, key: string): boolean {
    return this.stores.get(storeName)?.has(key) ?? false;
  }

  count(storeName: string): number {
    return this.stores.get(storeName)?.size ?? 0;
  }

  getStoreNames(): string[] {
    return Array.from(this.stores.keys());
  }

  isAvailable(): boolean {
    return true; // Memory is always available
  }
}

export const memoryAdapter = new MemoryAdapter();
