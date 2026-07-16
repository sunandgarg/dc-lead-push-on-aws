// DataStore - Centralized data management with three-tier persistence
// IndexedDB (primary) + localStorage (backup) + Memory (working)

import { indexedDBAdapter } from './indexeddb-adapter';
import { localStorageAdapter } from './localstorage-adapter';
import { memoryAdapter } from './memory-adapter';
import { backgroundProcessor } from './background-processor';
import { generateUniqueSlug, generateUploadSlug } from './slug-utils';
import { supabase } from '@/integrations/supabase/client';
import type {
  UniversityEntity,
  UploadEntity,
  UploadLeadEntity,
  DataStoreEvent,
  DataStoreEventHandler,
  SyncStatus,
} from './types';

class DataStore {
  private initialized: boolean = false;
  private syncStatus: SyncStatus = {
    lastSyncAt: '',
    pendingChanges: 0,
    isSyncing: false,
  };
  private eventHandlers: Set<DataStoreEventHandler> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  // ==================== Initialization ====================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize IndexedDB
    const idbReady = await indexedDBAdapter.initialize();
    if (!idbReady) {
      console.warn('IndexedDB not available, falling back to localStorage');
    }

    // Load data from persistence layers into memory
    await this.loadFromPersistence();

    // Start background sync
    this.startBackgroundSync();

    this.initialized = true;
  }

  private async loadFromPersistence(): Promise<void> {
    // Try IndexedDB first, fallback to localStorage
    try {
      const universities = await indexedDBAdapter.getAll<UniversityEntity>('universities');
      if (universities.length > 0) {
        await memoryAdapter.putMany('universities', universities, 'slug');
      } else {
        // Try localStorage backup
        const lsUniversities = await localStorageAdapter.getCollection<UniversityEntity>('universities');
        if (lsUniversities.length > 0) {
          await memoryAdapter.putMany('universities', lsUniversities, 'slug');
        }
      }

      const uploads = await indexedDBAdapter.getAll<UploadEntity>('uploads');
      if (uploads.length > 0) {
        await memoryAdapter.putMany('uploads', uploads, 'slug');
      }
    } catch (error) {
      console.error('Error loading from persistence:', error);
    }
  }

  private startBackgroundSync(): void {
    // Sync every 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncWithServer();
    }, 5 * 60 * 1000);

    // Also sync when page becomes visible
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.syncWithServer();
        }
      });
    }
  }

  // ==================== Event System ====================

  subscribe(handler: DataStoreEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  private emit(event: DataStoreEvent): void {
    this.eventHandlers.forEach(handler => handler(event));
  }

  // ==================== Universities ====================

  async getUniversities(): Promise<UniversityEntity[]> {
    return memoryAdapter.getAll<UniversityEntity>('universities');
  }

  async getUniversityBySlug(slug: string): Promise<UniversityEntity | undefined> {
    return memoryAdapter.get<UniversityEntity>('universities', slug);
  }

  async getUniversityById(id: string): Promise<UniversityEntity | undefined> {
    const universities = await this.getUniversities();
    return universities.find(u => u.id === id);
  }

  async saveUniversity(university: Partial<UniversityEntity> & { name: string }): Promise<UniversityEntity> {
    const existingSlugs = new Set(
      (await this.getUniversities()).map(u => u.slug)
    );

    const entity: UniversityEntity = {
      id: university.id || crypto.randomUUID(),
      slug: university.slug || generateUniqueSlug(university.name, existingSlugs),
      name: university.name,
      apiUrl: university.apiUrl || '',
      collegeId: university.collegeId || '',
      secretKey: university.secretKey || '',
      source: university.source || 'dekhocampus',
      medium: university.medium || 'dekhocampus',
      campaign: university.campaign || 'API',
      leadsPerMinute: university.leadsPerMinute || 90,
      apiType: university.apiType || 'nopaperforms',
      columnMapping: university.columnMapping || {},
      programs: university.programs || [],
      stateCities: university.stateCities || [],
      courseSpecializations: university.courseSpecializations || [],
      customColumns: university.customColumns || [],
      createdAt: university.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to all layers
    await memoryAdapter.put('universities', entity.slug, entity);
    await indexedDBAdapter.put('universities', entity);
    await localStorageAdapter.putCollection(
      'universities',
      await this.getUniversities()
    );

    this.emit({ type: 'university:created', data: entity });
    return entity;
  }

  async updateUniversity(slug: string, updates: Partial<UniversityEntity>): Promise<UniversityEntity | null> {
    const existing = await this.getUniversityBySlug(slug);
    if (!existing) return null;

    const updated: UniversityEntity = {
      ...existing,
      ...updates,
      slug: existing.slug, // Slug should not change
      id: existing.id, // ID should not change
      updatedAt: new Date().toISOString(),
    };

    await memoryAdapter.put('universities', updated.slug, updated);
    await indexedDBAdapter.put('universities', updated);
    await localStorageAdapter.putCollection(
      'universities',
      await this.getUniversities()
    );

    this.emit({ type: 'university:updated', data: updated });
    return updated;
  }

  async deleteUniversity(slug: string): Promise<boolean> {
    await memoryAdapter.delete('universities', slug);
    await indexedDBAdapter.delete('universities', slug);
    await localStorageAdapter.putCollection(
      'universities',
      await this.getUniversities()
    );

    this.emit({ type: 'university:deleted', slug });
    return true;
  }

  // ==================== Uploads ====================

  async getUploads(universitySlug?: string): Promise<UploadEntity[]> {
    const uploads = await memoryAdapter.getAll<UploadEntity>('uploads');
    if (universitySlug) {
      return uploads.filter(u => u.universitySlug === universitySlug);
    }
    return uploads;
  }

  async getUploadBySlug(slug: string): Promise<UploadEntity | undefined> {
    return memoryAdapter.get<UploadEntity>('uploads', slug);
  }

  async createUpload(
    universitySlug: string,
    universityId: string,
    fileName: string,
    leads: Omit<UploadLeadEntity, 'id' | 'uploadSlug'>[]
  ): Promise<UploadEntity> {
    const uploadSlug = generateUploadSlug(universitySlug, fileName);
    const now = new Date().toISOString();

    const uploadLeads: UploadLeadEntity[] = leads.map((lead, index) => ({
      ...lead,
      id: crypto.randomUUID(),
      uploadSlug,
      index,
      status: 'pending' as const,
      retryCount: 0,
    }));

    const upload: UploadEntity = {
      id: crypto.randomUUID(),
      slug: uploadSlug,
      universitySlug,
      universityId,
      fileName,
      totalLeads: leads.length,
      successCount: 0,
      failCount: 0,
      processedCount: 0,
      status: 'pending',
      isPaused: false,
      isCancelled: false,
      currentLeadIndex: 0,
      leads: uploadLeads,
      createdAt: now,
      updatedAt: now,
    };

    await memoryAdapter.put('uploads', upload.slug, upload);
    await indexedDBAdapter.put('uploads', upload);
    await indexedDBAdapter.putMany('uploadLeads', uploadLeads);

    this.emit({ type: 'upload:created', data: upload });
    return upload;
  }

  async startUpload(uploadSlug: string): Promise<void> {
    const upload = await this.getUploadBySlug(uploadSlug);
    if (!upload) throw new Error('Upload not found');

    await this.updateUpload(uploadSlug, { status: 'processing' });
    
    // Start background processing
    backgroundProcessor.startUpload(upload, upload.leads);
  }

  async pauseUpload(uploadSlug: string): Promise<void> {
    await this.updateUpload(uploadSlug, { status: 'paused', isPaused: true });
    backgroundProcessor.pauseUpload(uploadSlug);
    this.emit({ type: 'upload:updated', data: (await this.getUploadBySlug(uploadSlug))! });
  }

  async resumeUpload(uploadSlug: string): Promise<void> {
    const upload = await this.getUploadBySlug(uploadSlug);
    if (!upload) throw new Error('Upload not found');

    await this.updateUpload(uploadSlug, { status: 'processing', isPaused: false });
    backgroundProcessor.resumeUpload(upload, upload.leads);
    this.emit({ type: 'upload:updated', data: (await this.getUploadBySlug(uploadSlug))! });
  }

  async cancelUpload(uploadSlug: string): Promise<void> {
    await this.updateUpload(uploadSlug, { status: 'cancelled', isCancelled: true });
    backgroundProcessor.cancelUpload(uploadSlug);
    this.emit({ type: 'upload:updated', data: (await this.getUploadBySlug(uploadSlug))! });
  }

  async updateUpload(slug: string, updates: Partial<UploadEntity>): Promise<UploadEntity | null> {
    const existing = await this.getUploadBySlug(slug);
    if (!existing) return null;

    const updated: UploadEntity = {
      ...existing,
      ...updates,
      slug: existing.slug,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };

    await memoryAdapter.put('uploads', updated.slug, updated);
    await indexedDBAdapter.put('uploads', updated);

    return updated;
  }

  // ==================== Sync with Server ====================

  async syncWithServer(): Promise<void> {
    if (this.syncStatus.isSyncing) return;

    this.syncStatus.isSyncing = true;
    this.emit({ type: 'sync:started' });

    try {
      // Fetch universities from server
      const { data: serverUniversities, error } = await supabase
        .from('universities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to entities with slugs
      const universities: UniversityEntity[] = (serverUniversities || []).map(u => ({
        id: u.id,
        slug: generateUniqueSlug(u.name),
        name: u.name,
        apiUrl: u.api_url,
        collegeId: u.college_id,
        secretKey: u.secret_key,
        source: u.source || 'dekhocampus',
        medium: u.medium || 'dekhocampus',
        campaign: u.campaign || 'API',
        leadsPerMinute: u.leads_per_minute || 90,
        apiType: u.api_type || 'nopaperforms',
        columnMapping: (u.column_mapping as Record<string, string>) || {},
        programs: [],
        stateCities: [],
        courseSpecializations: [],
        customColumns: [],
        createdAt: u.created_at,
        updatedAt: u.updated_at,
      }));

      // Update all layers
      await memoryAdapter.clearAll();
      for (const uni of universities) {
        await memoryAdapter.put('universities', uni.slug, uni);
      }
      await indexedDBAdapter.putMany('universities', universities);
      await localStorageAdapter.putCollection('universities', universities);

      this.syncStatus.lastSyncAt = new Date().toISOString();
      this.syncStatus.pendingChanges = 0;
      this.emit({ type: 'sync:completed' });

    } catch (error) {
      console.error('Sync failed:', error);
      this.syncStatus.lastError = String(error);
      this.emit({ type: 'sync:failed', error: String(error) });
    } finally {
      this.syncStatus.isSyncing = false;
    }
  }

  // ==================== Utility Methods ====================

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async clearAllData(): Promise<void> {
    await memoryAdapter.clearAll();
    await indexedDBAdapter.clear('universities');
    await indexedDBAdapter.clear('uploads');
    await indexedDBAdapter.clear('uploadLeads');
    await indexedDBAdapter.clear('logs');
    await localStorageAdapter.clearAll();
  }

  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    backgroundProcessor.cleanup();
    this.eventHandlers.clear();
  }
}

// Singleton instance
export const dataStore = new DataStore();

// React hook for using DataStore
import { useState, useEffect, useCallback } from 'react';

export function useDataStore() {
  const [isReady, setIsReady] = useState(false);
  const [universities, setUniversities] = useState<UniversityEntity[]>([]);
  const [uploads, setUploads] = useState<UploadEntity[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(dataStore.getSyncStatus());

  useEffect(() => {
    const init = async () => {
      await dataStore.initialize();
      setUniversities(await dataStore.getUniversities());
      setUploads(await dataStore.getUploads());
      setIsReady(true);
    };

    init();

    // Subscribe to events
    const unsubscribe = dataStore.subscribe(async (event) => {
      if (event.type.startsWith('university:')) {
        setUniversities(await dataStore.getUniversities());
      }
      if (event.type.startsWith('upload:')) {
        setUploads(await dataStore.getUploads());
      }
      if (event.type.startsWith('sync:')) {
        setSyncStatus(dataStore.getSyncStatus());
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    setUniversities(await dataStore.getUniversities());
    setUploads(await dataStore.getUploads());
  }, []);

  return {
    isReady,
    universities,
    uploads,
    syncStatus,
    refresh,
    dataStore,
  };
}
