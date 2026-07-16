// DataStore - Main export file

export { dataStore, useDataStore } from './DataStore';
export { backgroundProcessor } from './background-processor';
export { indexedDBAdapter } from './indexeddb-adapter';
export { localStorageAdapter } from './localstorage-adapter';
export { memoryAdapter } from './memory-adapter';

export {
  generateSlug,
  generateUniqueSlug,
  generateSubSlug,
  parseSubSlug,
  generateUploadSlug,
  generateBatchId,
  isValidSlug,
  extractUniversitySlug,
  createSlugMap,
} from './slug-utils';

export type {
  DataStoreConfig,
  StoreSchema,
  IndexSchema,
  SluggedEntity,
  UniversityEntity,
  ProgramEntity,
  CustomColumnEntity,
  UploadEntity,
  UploadStatus,
  UploadLeadEntity,
  LogEntity,
  PersistenceLayer,
  SyncStatus,
  BackgroundTask,
  DataStoreEvent,
  DataStoreEventHandler,
} from './types';
