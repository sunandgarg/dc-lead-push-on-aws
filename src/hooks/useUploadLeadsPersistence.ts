import { useState, useEffect, useCallback, useRef } from 'react';

// Keys for localStorage
const UPLOAD_STATE_KEY = 'dekhocampus_upload_leads_state_v1';
const UPLOAD_SESSION_KEY = 'dekhocampus_upload_session_v1';

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

export interface UploadLeadsState {
  selectedUniversityId: string | null;
  leads: Lead[];
  fileName: string;
  csvData: string;
  processedCount: number;
  leadStatuses: Record<number, 'pending' | 'success' | 'failed' | 'duplicate'>;
  leadResponses: Record<number, string>;
  leadPayloads: Record<number, string>;
  validationErrors: Record<number, string[]>;
  dbDuplicates: number[];
  hasValidationErrors: boolean;
  duplicateAction: 'skip' | 'process';
  batchId: string | null;
  showSingleLeadForm: boolean;
  csvHeaders: string[];
  tempColumnMapping: Record<string, string>;
  pageSize: number;
  searchTerm: string;
  currentPage: number;
}

const defaultState: UploadLeadsState = {
  selectedUniversityId: null,
  leads: [],
  fileName: '',
  csvData: '',
  processedCount: 0,
  leadStatuses: {},
  leadResponses: {},
  leadPayloads: {},
  validationErrors: {},
  dbDuplicates: [],
  hasValidationErrors: false,
  duplicateAction: 'skip',
  batchId: null,
  showSingleLeadForm: false,
  csvHeaders: [],
  tempColumnMapping: {},
  pageSize: 10,
  searchTerm: '',
  currentPage: 0,
};

interface UseUploadLeadsPersistenceReturn {
  state: UploadLeadsState;
  setState: (updates: Partial<UploadLeadsState>) => void;
  setLeads: (leads: Lead[]) => void;
  updateLead: (index: number, lead: Lead) => void;
  setLeadStatus: (index: number, status: 'pending' | 'success' | 'failed') => void;
  setLeadResponse: (index: number, response: string) => void;
  setLeadPayload: (index: number, payload: string) => void;
  setValidationError: (index: number, errors: string[] | null) => void;
  setDbDuplicates: (indices: number[]) => void;
  resetAll: () => void;
  isRestored: boolean;
}

export function useUploadLeadsPersistence(): UseUploadLeadsPersistenceReturn {
  const [state, setStateInternal] = useState<UploadLeadsState>(defaultState);
  const [isRestored, setIsRestored] = useState(false);
  const isHydrating = useRef(true);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(UPLOAD_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate and merge with defaults
        const restoredState: UploadLeadsState = {
          ...defaultState,
          ...parsed,
          // Ensure arrays/objects are proper types
          leads: Array.isArray(parsed.leads) ? parsed.leads : [],
          leadStatuses: typeof parsed.leadStatuses === 'object' ? parsed.leadStatuses : {},
          leadResponses: typeof parsed.leadResponses === 'object' ? parsed.leadResponses : {},
          leadPayloads: typeof parsed.leadPayloads === 'object' ? parsed.leadPayloads : {},
          validationErrors: typeof parsed.validationErrors === 'object' ? parsed.validationErrors : {},
          dbDuplicates: Array.isArray(parsed.dbDuplicates) ? parsed.dbDuplicates : [],
          csvHeaders: Array.isArray(parsed.csvHeaders) ? parsed.csvHeaders : [],
          tempColumnMapping: typeof parsed.tempColumnMapping === 'object' ? parsed.tempColumnMapping : {},
        };
        setStateInternal(restoredState);
        // State restored successfully
      }
    } catch (error) {
      console.error('[UploadPersistence] Failed to restore state:', error);
    } finally {
      isHydrating.current = false;
      setIsRestored(true);
    }
  }, []);

  // Debounced save to localStorage
  const saveToStorage = useCallback((newState: UploadLeadsState) => {
    if (isHydrating.current) return;
    
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    saveTimeout.current = setTimeout(() => {
      try {
        // Don't save if processing is in progress (transient state)
        const stateToSave = { ...newState };
        localStorage.setItem(UPLOAD_STATE_KEY, JSON.stringify(stateToSave));
        // State saved successfully
      } catch (error) {
        console.error('[UploadPersistence] Failed to save state:', error);
      }
    }, 300); // 300ms debounce
  }, []);

  // Main setState function
  const setState = useCallback((updates: Partial<UploadLeadsState>) => {
    setStateInternal(prev => {
      const newState = { ...prev, ...updates };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  // Convenience methods
  const setLeads = useCallback((leads: Lead[]) => {
    setState({ leads });
  }, [setState]);

  const updateLead = useCallback((index: number, lead: Lead) => {
    setStateInternal(prev => {
      const newLeads = [...prev.leads];
      newLeads[index] = lead;
      const newState = { ...prev, leads: newLeads };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const setLeadStatus = useCallback((index: number, status: 'pending' | 'success' | 'failed') => {
    setStateInternal(prev => {
      const newStatuses = { ...prev.leadStatuses, [index]: status };
      const newState = { ...prev, leadStatuses: newStatuses };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const setLeadResponse = useCallback((index: number, response: string) => {
    setStateInternal(prev => {
      const newResponses = { ...prev.leadResponses, [index]: response };
      const newState = { ...prev, leadResponses: newResponses };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const setLeadPayload = useCallback((index: number, payload: string) => {
    setStateInternal(prev => {
      const newPayloads = { ...prev.leadPayloads, [index]: payload };
      const newState = { ...prev, leadPayloads: newPayloads };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const setValidationError = useCallback((index: number, errors: string[] | null) => {
    setStateInternal(prev => {
      const newErrors = { ...prev.validationErrors };
      if (errors === null) {
        delete newErrors[index];
      } else {
        newErrors[index] = errors;
      }
      const hasErrors = Object.keys(newErrors).length > 0;
      const newState = { ...prev, validationErrors: newErrors, hasValidationErrors: hasErrors };
      saveToStorage(newState);
      return newState;
    });
  }, [saveToStorage]);

  const setDbDuplicates = useCallback((indices: number[]) => {
    setState({ dbDuplicates: indices });
  }, [setState]);

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(UPLOAD_STATE_KEY);
      sessionStorage.removeItem(UPLOAD_SESSION_KEY);
    } catch (error) {
      console.error('[UploadPersistence] Failed to clear storage:', error);
    }
    setStateInternal(defaultState);
  }, []);

  return {
    state,
    setState,
    setLeads,
    updateLead,
    setLeadStatus,
    setLeadResponse,
    setLeadPayload,
    setValidationError,
    setDbDuplicates,
    resetAll,
    isRestored,
  };
}

// Helper to check if state has data worth preserving
export function hasUploadData(state: UploadLeadsState): boolean {
  return state.leads.length > 0 || state.fileName !== '' || state.csvData !== '';
}
