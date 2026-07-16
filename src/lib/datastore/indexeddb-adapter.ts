// IndexedDB Adapter - Primary persistence layer

import type { DataStoreConfig, StoreSchema } from './types';

const DB_NAME = 'dekhocampus_datastore';
const DB_VERSION = 1;

// Store schemas
const STORES: StoreSchema[] = [
  {
    name: 'universities',
    keyPath: 'slug',
    indexes: [
      { name: 'id', keyPath: 'id', unique: true },
      { name: 'name', keyPath: 'name', unique: false },
      { name: 'updatedAt', keyPath: 'updatedAt', unique: false },
    ],
  },
  {
    name: 'programs',
    keyPath: 'slug',
    indexes: [
      { name: 'id', keyPath: 'id', unique: true },
      { name: 'universitySlug', keyPath: 'universitySlug', unique: false },
      { name: 'name', keyPath: 'name', unique: false },
    ],
  },
  {
    name: 'uploads',
    keyPath: 'slug',
    indexes: [
      { name: 'id', keyPath: 'id', unique: true },
      { name: 'universitySlug', keyPath: 'universitySlug', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
    ],
  },
  {
    name: 'uploadLeads',
    keyPath: 'id',
    indexes: [
      { name: 'uploadSlug', keyPath: 'uploadSlug', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
    ],
  },
  {
    name: 'logs',
    keyPath: 'id',
    indexes: [
      { name: 'universitySlug', keyPath: 'universitySlug', unique: false },
      { name: 'uploadSlug', keyPath: 'uploadSlug', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
    ],
  },
  {
    name: 'syncQueue',
    keyPath: 'id',
    indexes: [
      { name: 'entityType', keyPath: 'entityType', unique: false },
      { name: 'createdAt', keyPath: 'createdAt', unique: false },
    ],
  },
  {
    name: 'metadata',
    keyPath: 'key',
  },
];

class IndexedDBAdapter {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof indexedDB !== 'undefined';
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('IndexedDB not supported');
      return false;
    }

    try {
      this.db = await this.openDatabase();
      return true;
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      return false;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement,
            });

            if (store.indexes) {
              for (const index of store.indexes) {
                objectStore.createIndex(index.name, index.keyPath, {
                  unique: index.unique ?? false,
                });
              }
            }
          }
        }
      };
    });

    return this.dbPromise;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return this.openDatabase();
  }

  // Generic CRUD operations
  async put<T>(storeName: string, data: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async putMany<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      transaction.onerror = () => reject(transaction.error);
      transaction.oncomplete = () => resolve();

      for (const item of items) {
        store.put(item);
      }
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async count(storeName: string): Promise<number> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
    }
  }

  isAvailable(): boolean {
    return this.isSupported;
  }
}

export const indexedDBAdapter = new IndexedDBAdapter();
