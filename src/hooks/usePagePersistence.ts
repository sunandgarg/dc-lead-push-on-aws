/**
 * Page Persistence Utilities - Dynamic sub-slug persistence for all pages
 * 
 * Provides easy-to-use hooks for any page that needs state persistence.
 * Each page type has its own storage key and state schema.
 */

import { usePersistentPageState, generateSubSlug, isValidSubSlug } from './usePersistentPageState';
import { useCallback, useMemo } from 'react';

// ============= CRM Persistence =============

export interface CRMPageState {
  activeModule: string;
  activeSubTab: string;
  selectedContactId: string | null;
  filters: Record<string, string>;
  searchQuery: string;
  expandedPanels: string[];
  selectedTags: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pageNumber: number;
  pageSize: number;
}

const defaultCRMState: CRMPageState = {
  activeModule: 'dashboard',
  activeSubTab: '',
  selectedContactId: null,
  filters: {},
  searchQuery: '',
  expandedPanels: [],
  selectedTags: [],
  sortBy: 'created_at',
  sortOrder: 'desc',
  pageNumber: 1,
  pageSize: 20,
};

export function useCRMPersistence() {
  const {
    state,
    setState,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  } = usePersistentPageState<CRMPageState>({
    basePath: '/crm',
    initialState: defaultCRMState,
    updateUrl: false, // CRM already has module-based routing
    storageType: 'session',
  });

  const updateState = useCallback((partial: Partial<CRMPageState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, [setState]);

  const setActiveModule = useCallback((module: string) => {
    setState(prev => ({ ...prev, activeModule: module }));
  }, [setState]);

  const setActiveSubTab = useCallback((subTab: string) => {
    setState(prev => ({ ...prev, activeSubTab: subTab }));
  }, [setState]);

  const setSelectedContact = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedContactId: id }));
  }, [setState]);

  const setFilters = useCallback((filters: Record<string, string>) => {
    setState(prev => ({ ...prev, filters }));
  }, [setState]);

  const setSearchQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, [setState]);

  const togglePanel = useCallback((panelId: string) => {
    setState(prev => {
      const panels = prev.expandedPanels.includes(panelId)
        ? prev.expandedPanels.filter(p => p !== panelId)
        : [...prev.expandedPanels, panelId];
      return { ...prev, expandedPanels: panels };
    });
  }, [setState]);

  return {
    state,
    updateState,
    setActiveModule,
    setActiveSubTab,
    setSelectedContact,
    setFilters,
    setSearchQuery,
    togglePanel,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  };
}

// ============= Marketing Persistence =============

export interface MarketingPageState {
  activeSubTab: string;
  selectedCampaignId: string | null;
  selectedTemplateId: string | null;
  campaignFilters: Record<string, string>;
  templateFilters: Record<string, string>;
  draftCampaign: Record<string, unknown> | null;
  draftTemplate: Record<string, unknown> | null;
  recipientSelection: string[];
  previewMode: boolean;
}

const defaultMarketingState: MarketingPageState = {
  activeSubTab: 'dashboard',
  selectedCampaignId: null,
  selectedTemplateId: null,
  campaignFilters: {},
  templateFilters: {},
  draftCampaign: null,
  draftTemplate: null,
  recipientSelection: [],
  previewMode: false,
};

export function useMarketingPersistence() {
  const {
    state,
    setState,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  } = usePersistentPageState<MarketingPageState>({
    basePath: '/crm/marketing-automation',
    initialState: defaultMarketingState,
    updateUrl: false,
    storageType: 'session',
  });

  const updateState = useCallback((partial: Partial<MarketingPageState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, [setState]);

  const setActiveSubTab = useCallback((subTab: string) => {
    setState(prev => ({ ...prev, activeSubTab: subTab }));
  }, [setState]);

  const setDraftCampaign = useCallback((draft: Record<string, unknown> | null) => {
    setState(prev => ({ ...prev, draftCampaign: draft }));
  }, [setState]);

  const setDraftTemplate = useCallback((draft: Record<string, unknown> | null) => {
    setState(prev => ({ ...prev, draftTemplate: draft }));
  }, [setState]);

  return {
    state,
    updateState,
    setActiveSubTab,
    setDraftCampaign,
    setDraftTemplate,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  };
}

// ============= History Page Persistence =============

export interface HistoryPageState {
  selectedBatchId: string | null;
  filters: {
    status: string;
    universityId: string;
    dateRange: { from: string | null; to: string | null };
  };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pageNumber: number;
  expandedBatches: string[];
}

const defaultHistoryState: HistoryPageState = {
  selectedBatchId: null,
  filters: {
    status: 'all',
    universityId: '',
    dateRange: { from: null, to: null },
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
  pageNumber: 1,
  expandedBatches: [],
};

export function useHistoryPersistence() {
  const {
    state,
    setState,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  } = usePersistentPageState<HistoryPageState>({
    basePath: '/history',
    initialState: defaultHistoryState,
    updateUrl: false,
    storageType: 'session',
  });

  const updateState = useCallback((partial: Partial<HistoryPageState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, [setState]);

  const setSelectedBatch = useCallback((batchId: string | null) => {
    setState(prev => ({ ...prev, selectedBatchId: batchId }));
  }, [setState]);

  const toggleBatchExpanded = useCallback((batchId: string) => {
    setState(prev => {
      const expanded = prev.expandedBatches.includes(batchId)
        ? prev.expandedBatches.filter(b => b !== batchId)
        : [...prev.expandedBatches, batchId];
      return { ...prev, expandedBatches: expanded };
    });
  }, [setState]);

  return {
    state,
    updateState,
    setSelectedBatch,
    toggleBatchExpanded,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
  };
}

// ============= Form Draft Persistence =============

/**
 * Generic hook for form draft persistence
 * Useful for any form that needs to save draft state
 */
export function useFormDraft<T extends object>(
  formId: string,
  initialValues: T
) {
  const {
    state,
    setState,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
    markAsSaved,
  } = usePersistentPageState<{ values: T; step: number; isDirty: boolean }>({
    basePath: `/form/${formId}`,
    initialState: { values: initialValues, step: 0, isDirty: false },
    updateUrl: false,
    storageType: 'session',
    saveDebounce: 500,
  });

  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [field]: value },
      isDirty: true,
    }));
  }, [setState]);

  const setValues = useCallback((values: Partial<T>) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, ...values },
      isDirty: true,
    }));
  }, [setState]);

  const setStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, step }));
  }, [setState]);

  const reset = useCallback(() => {
    setState({ values: initialValues, step: 0, isDirty: false });
    resetDraft();
  }, [setState, initialValues, resetDraft]);

  return {
    values: state.values,
    step: state.step,
    isDirty: state.isDirty,
    setFieldValue,
    setValues,
    setStep,
    reset,
    markAsSaved,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
  };
}

// ============= Utility: Session sub-slug for URL generation =============

/**
 * Get or create a stable sub-slug for a given base path
 */
export function getSessionSubSlug(basePath: string): string {
  const key = `app:sub_slugs`;
  try {
    const stored = sessionStorage.getItem(key);
    const registry = stored ? JSON.parse(stored) : {};
    
    if (registry[basePath] && isValidSubSlug(registry[basePath])) {
      return registry[basePath];
    }
    
    const newSlug = generateSubSlug();
    registry[basePath] = newSlug;
    sessionStorage.setItem(key, JSON.stringify(registry));
    return newSlug;
  } catch {
    return generateSubSlug();
  }
}

export { generateSubSlug, isValidSubSlug };
