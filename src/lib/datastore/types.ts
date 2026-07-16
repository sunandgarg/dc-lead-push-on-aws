// DataStore Types - Centralized type definitions for the data layer

export interface DataStoreConfig {
  dbName: string;
  dbVersion: number;
  stores: StoreSchema[];
}

export interface StoreSchema {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: IndexSchema[];
}

export interface IndexSchema {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
}

// Entity Types with Slugs
export interface SluggedEntity {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface UniversityEntity extends SluggedEntity {
  name: string;
  apiUrl: string;
  collegeId: string;
  secretKey: string;
  source: string;
  medium: string;
  campaign: string;
  leadsPerMinute: number;
  apiType: string;
  columnMapping: Record<string, string>;
  programs: ProgramEntity[];
  stateCities: { state: string; city: string }[];
  courseSpecializations: { course: string; specialization: string }[];
  customColumns: CustomColumnEntity[];
}

export interface ProgramEntity extends SluggedEntity {
  name: string;
  universitySlug: string; // Sub-slug linked to university
  universityId: string;
}

export interface CustomColumnEntity {
  id: string;
  columnKey: string;
  columnName: string;
  isRequired: boolean;
  sortOrder: number;
  values: { value: string; parentValue?: string }[];
}

export interface UploadEntity extends SluggedEntity {
  universitySlug: string; // Linked to university
  universityId: string;
  fileName: string;
  totalLeads: number;
  successCount: number;
  failCount: number;
  processedCount: number;
  status: UploadStatus;
  isPaused: boolean;
  isCancelled: boolean;
  csvData?: string;
  currentLeadIndex: number;
  errorMessage?: string;
  completedAt?: string;
  leads: UploadLeadEntity[];
  leadsPerMinute?: number; // Rate limiting
}

export type UploadStatus = 'pending' | 'processing' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface UploadLeadEntity {
  id: string;
  uploadSlug: string;
  index: number;
  name: string;
  email: string;
  mobile: string;
  address?: string;
  state?: string;
  city?: string;
  course?: string;
  specialization?: string;
  leadSource?: string;
  leadMedium?: string;
  leadCampaign?: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'retrying';
  retryCount: number;
  response?: string;
  processedAt?: string;
  errorMessage?: string;
}

export interface LogEntity {
  id: string;
  universitySlug: string;
  uploadSlug?: string;
  leadId?: string;
  status: string;
  response?: string;
  email?: string;
  mobile?: string;
  leadData?: Record<string, any>;
  createdAt: string;
}

// Persistence Layer Types
export type PersistenceLayer = 'indexeddb' | 'localstorage' | 'memory';

export interface SyncStatus {
  lastSyncAt: string;
  pendingChanges: number;
  isSyncing: boolean;
  lastError?: string;
}

// Background Processing Types
export interface BackgroundTask {
  id: string;
  type: 'upload' | 'sync' | 'retry';
  entitySlug: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

// Data Store Events
export type DataStoreEvent = 
  | { type: 'university:created'; data: UniversityEntity }
  | { type: 'university:updated'; data: UniversityEntity }
  | { type: 'university:deleted'; slug: string }
  | { type: 'upload:created'; data: UploadEntity }
  | { type: 'upload:updated'; data: UploadEntity }
  | { type: 'upload:progress'; slug: string; progress: number }
  | { type: 'upload:completed'; slug: string }
  | { type: 'upload:failed'; slug: string; error: string }
  | { type: 'sync:started' }
  | { type: 'sync:completed' }
  | { type: 'sync:failed'; error: string };

export type DataStoreEventHandler = (event: DataStoreEvent) => void;
