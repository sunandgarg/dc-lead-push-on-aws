/**
 * UploadPersistenceProvider - Wraps UploadLeadsTab with state persistence
 * 
 * This component:
 * 1. Generates and maintains a sub-slug in the URL
 * 2. Persists all form state to sessionStorage
 * 3. Restores state on tab switch or page refresh
 * 4. Shows draft indicators and reset functionality
 * 
 * WHY DATA WILL NOT RESET:
 * - State is saved to sessionStorage after every change
 * - Sub-slug in URL maps to the stored state
 * - No visibility change handlers trigger navigation
 * - React state hydrates from storage before render
 */

import { memo, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DraftIndicator, FileRestorePrompt } from '@/components/ui/DraftIndicator';
import { usePersistentPageState, generateSubSlug, isValidSubSlug } from '@/hooks/usePersistentPageState';
import type { Lead } from '@/utils/leadValidation';

// ============= Types =============

export interface UploadPersistedState {
  // University selection
  selectedUniversityId: string | null;
  
  // File data
  fileName: string;
  csvData: string;
  csvHeaders: string[];
  
  // Parsed leads
  leads: Lead[];
  
  // Column mapping
  tempColumnMapping: Record<string, string>;
  showColumnMapping: boolean;
  
  // Validation state
  validationErrors: Array<[number, string[]]>;
  hasValidationErrors: boolean;
  dbDuplicates: number[];
  duplicateAction: 'skip' | 'process';
  
  // Processing state (not persisted, but tracked)
  batchId: string | null;
  processedCount: number;
  currentLeadIndex: number;
  
  // Statuses as arrays for JSON serialization
  leadStatuses: Array<[number, 'pending' | 'success' | 'failed' | 'duplicate']>;
  leadResponses: Array<[number, string]>;
  leadPayloads: Array<[number, string]>;
  
  // UI state
  showSingleLeadForm: boolean;
  pageSize: number;
}

const defaultUploadState: UploadPersistedState = {
  selectedUniversityId: null,
  fileName: '',
  csvData: '',
  csvHeaders: [],
  leads: [],
  tempColumnMapping: {},
  showColumnMapping: false,
  validationErrors: [],
  hasValidationErrors: false,
  dbDuplicates: [],
  duplicateAction: 'skip',
  batchId: null,
  processedCount: 0,
  currentLeadIndex: 0,
  leadStatuses: [],
  leadResponses: [],
  leadPayloads: [],
  showSingleLeadForm: false,
  pageSize: 10,
};

// ============= Context for child components =============

import { createContext, useContext } from 'react';

interface UploadPersistenceContextValue {
  // State
  state: UploadPersistedState;
  
  // Computed Maps (for easy use in components)
  validationErrorsMap: Map<number, string[]>;
  dbDuplicatesSet: Set<number>;
  leadStatusesMap: Map<number, 'pending' | 'success' | 'failed' | 'duplicate'>;
  leadResponsesMap: Map<number, string>;
  leadPayloadsMap: Map<number, string>;
  
  // Update functions
  updateState: (partial: Partial<UploadPersistedState>) => void;
  setField: <K extends keyof UploadPersistedState>(key: K, value: UploadPersistedState[K]) => void;
  
  // Map updaters (convert to/from array format)
  setValidationErrors: (errors: Map<number, string[]>) => void;
  setDbDuplicates: (duplicates: Set<number>) => void;
  setLeadStatuses: (statuses: Map<number, 'pending' | 'success' | 'failed' | 'duplicate'>) => void;
  setLeadResponses: (responses: Map<number, string>) => void;
  setLeadPayloads: (payloads: Map<number, string>) => void;
  
  // File handling
  fileNeedsReselection: boolean;
  onFileReselect: () => void;
  
  // Persistence metadata
  subSlug: string;
  isHydrated: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: number | null;
  resetDraft: () => void;
}

const UploadPersistenceContext = createContext<UploadPersistenceContextValue | null>(null);

export function useUploadPersistence() {
  const context = useContext(UploadPersistenceContext);
  if (!context) {
    throw new Error('useUploadPersistence must be used within UploadPersistenceProvider');
  }
  return context;
}

// ============= Provider Component =============

interface UploadPersistenceProviderProps {
  children: React.ReactNode;
}

export const UploadPersistenceProvider = memo(function UploadPersistenceProvider({
  children,
}: UploadPersistenceProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Extract or generate sub-slug from URL
  const urlSubSlug = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    // /upload/sess-xxx or /upload/uni-slug/sess-xxx
    for (const part of parts) {
      if (isValidSubSlug(part)) {
        return part;
      }
    }
    return null;
  }, [location.pathname]);

  // Use persistent state hook
  const {
    state,
    setState,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
    fileMetaStore,
  } = usePersistentPageState<UploadPersistedState>({
    basePath: '/upload',
    initialState: defaultUploadState,
    updateUrl: true,
    storageType: 'session',
    saveDebounce: 300,
  });

  // Check if file needs re-selection (meta exists but File object lost)
  const fileMeta = fileMetaStore.get('upload_file');
  const cachedFile = fileMetaStore.getFile('upload_file');
  const fileNeedsReselection = !!(fileMeta && !cachedFile && state.fileName);

  // Convert arrays to Maps for easy component use
  const validationErrorsMap = useMemo(() => 
    new Map(state.validationErrors), [state.validationErrors]);
  
  const dbDuplicatesSet = useMemo(() => 
    new Set(state.dbDuplicates), [state.dbDuplicates]);
  
  const leadStatusesMap = useMemo(() => 
    new Map(state.leadStatuses), [state.leadStatuses]);
  
  const leadResponsesMap = useMemo(() => 
    new Map(state.leadResponses), [state.leadResponses]);
  
  const leadPayloadsMap = useMemo(() => 
    new Map(state.leadPayloads), [state.leadPayloads]);

  // Update functions
  const updateState = useCallback((partial: Partial<UploadPersistedState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, [setState]);

  const setField = useCallback(<K extends keyof UploadPersistedState>(
    key: K, 
    value: UploadPersistedState[K]
  ) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, [setState]);

  // Map to array converters
  const setValidationErrors = useCallback((errors: Map<number, string[]>) => {
    setState(prev => ({ ...prev, validationErrors: Array.from(errors.entries()) }));
  }, [setState]);

  const setDbDuplicates = useCallback((duplicates: Set<number>) => {
    setState(prev => ({ ...prev, dbDuplicates: Array.from(duplicates) }));
  }, [setState]);

  const setLeadStatuses = useCallback((statuses: Map<number, 'pending' | 'success' | 'failed' | 'duplicate'>) => {
    setState(prev => ({ ...prev, leadStatuses: Array.from(statuses.entries()) }));
  }, [setState]);

  const setLeadResponses = useCallback((responses: Map<number, string>) => {
    setState(prev => ({ ...prev, leadResponses: Array.from(responses.entries()) }));
  }, [setState]);

  const setLeadPayloads = useCallback((payloads: Map<number, string>) => {
    setState(prev => ({ ...prev, leadPayloads: Array.from(payloads.entries()) }));
  }, [setState]);

  // File re-selection handler
  const onFileReselect = useCallback(() => {
    // Trigger file input click - component using this should have the ref
    const event = new CustomEvent('upload-reselect-file');
    window.dispatchEvent(event);
  }, []);

  const contextValue = useMemo<UploadPersistenceContextValue>(() => ({
    state,
    validationErrorsMap,
    dbDuplicatesSet,
    leadStatusesMap,
    leadResponsesMap,
    leadPayloadsMap,
    updateState,
    setField,
    setValidationErrors,
    setDbDuplicates,
    setLeadStatuses,
    setLeadResponses,
    setLeadPayloads,
    fileNeedsReselection,
    onFileReselect,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  }), [
    state,
    validationErrorsMap,
    dbDuplicatesSet,
    leadStatusesMap,
    leadResponsesMap,
    leadPayloadsMap,
    updateState,
    setField,
    setValidationErrors,
    setDbDuplicates,
    setLeadStatuses,
    setLeadResponses,
    setLeadPayloads,
    fileNeedsReselection,
    onFileReselect,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  ]);

  // Show loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <UploadPersistenceContext.Provider value={contextValue}>
      <div className="relative">
        {/* Draft indicator */}
        <div className="absolute top-0 right-0 z-10">
          <DraftIndicator
            hasUnsavedChanges={hasUnsavedChanges}
            lastSaved={lastSaved}
            onReset={resetDraft}
          />
        </div>
        
        {/* File re-selection prompt */}
        {fileNeedsReselection && fileMeta && (
          <div className="mb-4">
            <FileRestorePrompt
              fileName={fileMeta.name}
              fileSize={fileMeta.size}
              onReselect={onFileReselect}
            />
          </div>
        )}
        
        {children}
      </div>
    </UploadPersistenceContext.Provider>
  );
});

export default UploadPersistenceProvider;
