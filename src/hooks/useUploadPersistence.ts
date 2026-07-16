/**
 * useUploadPersistence - Specialized persistence hook for Upload Leads page
 * 
 * This hook wraps usePersistentPageState with upload-specific logic:
 * - File metadata persistence
 * - Lead data preservation
 * - Processing state recovery
 * - Column mapping retention
 * 
 * WHY DATA PERSISTS:
 * - All state is synced to sessionStorage on every change
 * - File metadata is preserved (actual File object cached in memory)
 * - Sub-slug in URL ensures same state is loaded on return
 * - NO visibility change handlers cause reloads
 */

import { useCallback, useMemo } from 'react';
import { usePersistentPageState, type FileMeta } from './usePersistentPageState';

export interface Lead {
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
  [key: string]: string | undefined;
}

export interface UploadState {
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
  validationErrors: [number, string[]][];
  hasValidationErrors: boolean;
  dbDuplicates: number[];
  duplicateAction: 'skip' | 'process';
  
  // Processing state
  batchId: string | null;
  processedCount: number;
  currentLeadIndex: number;
  leadStatuses: [number, 'pending' | 'success' | 'failed'][];
  leadResponses: [number, string][];
  leadPayloads: [number, string][];
  
  // UI state
  showSingleLeadForm: boolean;
  pageSize: number;
  customPageSize: string;
}

const initialUploadState: UploadState = {
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
  customPageSize: '',
};

interface UseUploadPersistenceReturn {
  // State
  state: UploadState;
  
  // State updaters
  setSelectedUniversityId: (id: string | null) => void;
  setFileName: (name: string) => void;
  setCsvData: (data: string) => void;
  setCsvHeaders: (headers: string[]) => void;
  setLeads: (leads: Lead[]) => void;
  setTempColumnMapping: (mapping: Record<string, string>) => void;
  setShowColumnMapping: (show: boolean) => void;
  setValidationErrors: (errors: Map<number, string[]>) => void;
  setHasValidationErrors: (has: boolean) => void;
  setDbDuplicates: (duplicates: Set<number>) => void;
  setDuplicateAction: (action: 'skip' | 'process') => void;
  setBatchId: (id: string | null) => void;
  setProcessedCount: (count: number) => void;
  setCurrentLeadIndex: (index: number) => void;
  setLeadStatuses: (statuses: Map<number, 'pending' | 'success' | 'failed'>) => void;
  setLeadResponses: (responses: Map<number, string>) => void;
  setLeadPayloads: (payloads: Map<number, string>) => void;
  setShowSingleLeadForm: (show: boolean) => void;
  setPageSize: (size: number) => void;
  setCustomPageSize: (size: string) => void;
  updateState: (partial: Partial<UploadState>) => void;
  
  // File handling
  setFile: (file: File) => FileMeta;
  getFile: () => File | null;
  getFileMeta: () => FileMeta | null;
  clearFile: () => void;
  
  // Persistence
  subSlug: string;
  isHydrated: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: number | null;
  resetDraft: () => void;
  markAsSaved: () => void;
  clearAll: () => void;
}

export function useUploadPersistence(): UseUploadPersistenceReturn {
  const {
    state,
    setState,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
    markAsSaved,
    fileMetaStore,
  } = usePersistentPageState<UploadState>({
    basePath: '/upload',
    initialState: initialUploadState,
    updateUrl: true,
    storageType: 'session',
    saveDebounce: 200,
  });

  // Individual field setters
  const setSelectedUniversityId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedUniversityId: id }));
  }, [setState]);

  const setFileName = useCallback((name: string) => {
    setState(prev => ({ ...prev, fileName: name }));
  }, [setState]);

  const setCsvData = useCallback((data: string) => {
    setState(prev => ({ ...prev, csvData: data }));
  }, [setState]);

  const setCsvHeaders = useCallback((headers: string[]) => {
    setState(prev => ({ ...prev, csvHeaders: headers }));
  }, [setState]);

  const setLeads = useCallback((leads: Lead[]) => {
    setState(prev => ({ ...prev, leads }));
  }, [setState]);

  const setTempColumnMapping = useCallback((mapping: Record<string, string>) => {
    setState(prev => ({ ...prev, tempColumnMapping: mapping }));
  }, [setState]);

  const setShowColumnMapping = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showColumnMapping: show }));
  }, [setState]);

  const setValidationErrors = useCallback((errors: Map<number, string[]>) => {
    setState(prev => ({ ...prev, validationErrors: Array.from(errors.entries()) }));
  }, [setState]);

  const setHasValidationErrors = useCallback((has: boolean) => {
    setState(prev => ({ ...prev, hasValidationErrors: has }));
  }, [setState]);

  const setDbDuplicates = useCallback((duplicates: Set<number>) => {
    setState(prev => ({ ...prev, dbDuplicates: Array.from(duplicates) }));
  }, [setState]);

  const setDuplicateAction = useCallback((action: 'skip' | 'process') => {
    setState(prev => ({ ...prev, duplicateAction: action }));
  }, [setState]);

  const setBatchId = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, batchId: id }));
  }, [setState]);

  const setProcessedCount = useCallback((count: number) => {
    setState(prev => ({ ...prev, processedCount: count }));
  }, [setState]);

  const setCurrentLeadIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, currentLeadIndex: index }));
  }, [setState]);

  const setLeadStatuses = useCallback((statuses: Map<number, 'pending' | 'success' | 'failed'>) => {
    setState(prev => ({ ...prev, leadStatuses: Array.from(statuses.entries()) }));
  }, [setState]);

  const setLeadResponses = useCallback((responses: Map<number, string>) => {
    setState(prev => ({ ...prev, leadResponses: Array.from(responses.entries()) }));
  }, [setState]);

  const setLeadPayloads = useCallback((payloads: Map<number, string>) => {
    setState(prev => ({ ...prev, leadPayloads: Array.from(payloads.entries()) }));
  }, [setState]);

  const setShowSingleLeadForm = useCallback((show: boolean) => {
    setState(prev => ({ ...prev, showSingleLeadForm: show }));
  }, [setState]);

  const setPageSize = useCallback((size: number) => {
    setState(prev => ({ ...prev, pageSize: size }));
  }, [setState]);

  const setCustomPageSize = useCallback((size: string) => {
    setState(prev => ({ ...prev, customPageSize: size }));
  }, [setState]);

  const updateState = useCallback((partial: Partial<UploadState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, [setState]);

  // File handling
  const FILE_KEY = 'upload_csv_file';

  const setFile = useCallback((file: File): FileMeta => {
    return fileMetaStore.set(FILE_KEY, file);
  }, [fileMetaStore]);

  const getFile = useCallback((): File | null => {
    return fileMetaStore.getFile(FILE_KEY);
  }, [fileMetaStore]);

  const getFileMeta = useCallback((): FileMeta | null => {
    return fileMetaStore.get(FILE_KEY);
  }, [fileMetaStore]);

  const clearFile = useCallback(() => {
    fileMetaStore.clear(FILE_KEY);
  }, [fileMetaStore]);

  // Clear all and reset
  const clearAll = useCallback(() => {
    clearFile();
    resetDraft();
  }, [clearFile, resetDraft]);

  return {
    state,
    setSelectedUniversityId,
    setFileName,
    setCsvData,
    setCsvHeaders,
    setLeads,
    setTempColumnMapping,
    setShowColumnMapping,
    setValidationErrors,
    setHasValidationErrors,
    setDbDuplicates,
    setDuplicateAction,
    setBatchId,
    setProcessedCount,
    setCurrentLeadIndex,
    setLeadStatuses,
    setLeadResponses,
    setLeadPayloads,
    setShowSingleLeadForm,
    setPageSize,
    setCustomPageSize,
    updateState,
    setFile,
    getFile,
    getFileMeta,
    clearFile,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
    markAsSaved,
    clearAll,
  };
}

export default useUploadPersistence;
