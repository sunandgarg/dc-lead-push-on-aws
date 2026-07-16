/**
 * useUploadStatePersistence - Unified state persistence for lead upload
 *
 * This replaces the dual localStorage/sessionStorage systems with a single,
 * lightweight implementation that:
 * 1. Uses localStorage only for non-sensitive upload metadata
 * 2. Saves immediately on visibility change (tab switch)
 * 3. Saves on beforeunload (browser close)
 * 4. Hydrates state synchronously on mount
 * 5. Tracks processing state in URL slug
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Lead } from "@/utils/leadValidation";

// ============= Storage Keys =============
const STORAGE_KEY = "dekhocampus_upload_v3";
const PROCESSING_STATE_KEY = "dekhocampus_upload_processing_v1";

// ============= Types =============
export interface ProcessingState {
  isProcessing: boolean;
  isPaused: boolean;
  currentIndex: number;
  batchId: string | null;
  startTime: number | null;
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

  // Validation state
  validationErrors: Record<number, string[]>;
  hasValidationErrors: boolean;
  dbDuplicates: number[];
  duplicateAction: "skip" | "process";

  // Processing state
  processedCount: number;
  leadStatuses: Record<number, "pending" | "success" | "failed" | "duplicate">;
  leadResponses: Record<number, string>;
  leadPayloads: Record<number, string>;
  leadDbIds: Record<number, string>;
  batchId: string | null;

  // UI state
  showSingleLeadForm: boolean;
  pageSize: number;
  searchTerm: string;
  currentPage: number;
}

const DEFAULT_STATE: UploadState = {
  selectedUniversityId: null,
  fileName: "",
  csvData: "",
  csvHeaders: [],
  leads: [],
  tempColumnMapping: {},
  validationErrors: {},
  hasValidationErrors: false,
  dbDuplicates: [],
  duplicateAction: "skip",
  processedCount: 0,
  leadStatuses: {},
  leadResponses: {},
  leadPayloads: {},
  leadDbIds: {},
  batchId: null,
  showSingleLeadForm: false,
  pageSize: 10,
  searchTerm: "",
  currentPage: 0,
};

const DEFAULT_PROCESSING_STATE: ProcessingState = {
  isProcessing: false,
  isPaused: false,
  currentIndex: 0,
  batchId: null,
  startTime: null,
};

// ============= Storage Helpers =============
function coerceLeadValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";

  if (Array.isArray(value)) {
    return value.map(coerceLeadValue).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 1) {
      return coerceLeadValue(entries[0][1]);
    }

    const preferredKey = ["name", "contact_name", "value", "label"].find(
      (key) => key in (value as Record<string, unknown>),
    );
    if (preferredKey) {
      return coerceLeadValue((value as Record<string, unknown>)[preferredKey]);
    }

    return entries
      .map(([, nestedValue]) => coerceLeadValue(nestedValue))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function normalizeLead(lead: Lead): Lead {
  return Object.fromEntries(Object.entries(lead).map(([key, value]) => [key, coerceLeadValue(value)])) as Lead;
}

function normalizeLeads(leads: Lead[]): Lead[] {
  return leads.map(normalizeLead);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(coerceLeadValue).map((entry) => entry.trim()).filter(Boolean);
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => Boolean(String(key).trim()))
      .map(([key, entryValue]) => [String(key), coerceLeadValue(entryValue)]),
  );
}

function normalizeValidationErrors(
  value: unknown,
): Record<number, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => {
        const numericKey = Number.parseInt(String(key), 10);
        if (!Number.isFinite(numericKey)) return null;
        return [numericKey, normalizeStringArray(entryValue)] as const;
      })
      .filter((entry): entry is readonly [number, string[]] => Boolean(entry)),
  );
}

function normalizeLeadStatuses(
  value: unknown,
): Record<number, "pending" | "success" | "failed" | "duplicate"> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const allowed = new Set(["pending", "success", "failed", "duplicate"]);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => {
        const numericKey = Number.parseInt(String(key), 10);
        const status = coerceLeadValue(entryValue) as "pending" | "success" | "failed" | "duplicate";
        if (!Number.isFinite(numericKey) || !allowed.has(status)) return null;
        return [numericKey, status] as const;
      })
      .filter((entry): entry is readonly [number, "pending" | "success" | "failed" | "duplicate"] => Boolean(entry)),
  );
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => Number.parseInt(coerceLeadValue(entry), 10))
    .filter((entry) => Number.isFinite(entry));
}

function normalizeUploadState(state: UploadState): UploadState {
  return {
    ...DEFAULT_STATE,
    ...state,
    selectedUniversityId: state.selectedUniversityId ? coerceLeadValue(state.selectedUniversityId) : null,
    fileName: coerceLeadValue(state.fileName),
    csvData: coerceLeadValue(state.csvData),
    csvHeaders: normalizeStringArray(state.csvHeaders),
    leads: normalizeLeads(Array.isArray(state.leads) ? state.leads : []),
    tempColumnMapping: normalizeStringRecord(state.tempColumnMapping),
    validationErrors: normalizeValidationErrors(state.validationErrors),
    hasValidationErrors: Object.keys(normalizeValidationErrors(state.validationErrors)).length > 0,
    dbDuplicates: normalizeNumberArray(state.dbDuplicates),
    duplicateAction: state.duplicateAction === "process" ? "process" : "skip",
    processedCount: Number.isFinite(state.processedCount) ? state.processedCount : 0,
    leadStatuses: normalizeLeadStatuses(state.leadStatuses),
    leadResponses: normalizeStringRecord(state.leadResponses),
    leadPayloads: normalizeStringRecord(state.leadPayloads),
    leadDbIds: normalizeStringRecord(state.leadDbIds),
    batchId: state.batchId ? coerceLeadValue(state.batchId) : null,
    showSingleLeadForm: Boolean(state.showSingleLeadForm),
    pageSize: Number.isFinite(state.pageSize) && state.pageSize > 0 ? state.pageSize : DEFAULT_STATE.pageSize,
    searchTerm: coerceLeadValue(state.searchTerm),
    currentPage: Number.isFinite(state.currentPage) && state.currentPage >= 0 ? state.currentPage : 0,
  };
}

function loadFromStorage(): { state: UploadState; processing: ProcessingState } {
  try {
    const stateStr = localStorage.getItem(STORAGE_KEY);
    const processingStr = localStorage.getItem(PROCESSING_STATE_KEY);

    const state = stateStr ? JSON.parse(stateStr) : DEFAULT_STATE;
    const processing = processingStr ? JSON.parse(processingStr) : DEFAULT_PROCESSING_STATE;

    // Validate and merge with defaults to handle missing fields. Lead rows,
    // CSV contents, partner responses and request payloads are intentionally
    // not restored from storage.
    return {
      state: sanitizeUploadStateForStorage(normalizeUploadState({ ...DEFAULT_STATE, ...state })),
      processing: { ...DEFAULT_PROCESSING_STATE, ...processing },
    };
  } catch (error) {
    console.error("[UploadStatePersistence] Failed to load from storage:", error);
    return { state: DEFAULT_STATE, processing: DEFAULT_PROCESSING_STATE };
  }
}

function sanitizeUploadStateForStorage(state: UploadState): UploadState {
  return {
    ...state,
    csvData: "",
    csvHeaders: [],
    leads: [],
    leadResponses: {},
    leadPayloads: {},
    leadDbIds: {},
  };
}

function saveToStorage(state: UploadState, processing: ProcessingState): void {
  try {
    const stateToPersist = sanitizeUploadStateForStorage(state);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
    localStorage.setItem(PROCESSING_STATE_KEY, JSON.stringify(processing));
  } catch (error) {
    console.error("[UploadStatePersistence] Failed to save:", error);
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROCESSING_STATE_KEY);
    // Storage cleared
  } catch (error) {
    console.error("[UploadStatePersistence] Failed to clear:", error);
  }
}

// ============= URL Slug Helpers =============
type ProcessingSlug = "processing" | "paused" | "complete" | "idle";

function getProcessingSlug(processing: ProcessingState, state: UploadState): ProcessingSlug {
  if (processing.isProcessing && processing.isPaused) return "paused";
  if (processing.isProcessing) return "processing";

  const totalProcessed = Object.values(state.leadStatuses).filter((status) => status !== "pending").length;
  if (totalProcessed > 0 && totalProcessed === state.leads.length) return "complete";

  return "idle";
}

// ============= Main Hook =============
interface UseUploadStatePersistenceOptions {
  onNavigateWithState?: (path: string) => void;
}

function normalizeUploadStateUpdates(updates: Partial<UploadState>): Partial<UploadState> {
  const normalized: Partial<UploadState> = { ...updates };

  if ("selectedUniversityId" in updates) {
    normalized.selectedUniversityId = updates.selectedUniversityId ? coerceLeadValue(updates.selectedUniversityId) : null;
  }
  if ("fileName" in updates) {
    normalized.fileName = coerceLeadValue(updates.fileName);
  }
  if ("csvData" in updates) {
    normalized.csvData = coerceLeadValue(updates.csvData);
  }
  if ("csvHeaders" in updates) {
    normalized.csvHeaders = normalizeStringArray(updates.csvHeaders);
  }
  if ("leads" in updates) {
    normalized.leads = normalizeLeads(Array.isArray(updates.leads) ? updates.leads : []);
  }
  if ("tempColumnMapping" in updates) {
    normalized.tempColumnMapping = normalizeStringRecord(updates.tempColumnMapping);
  }
  if ("validationErrors" in updates) {
    normalized.validationErrors = normalizeValidationErrors(updates.validationErrors);
  }
  if ("hasValidationErrors" in updates || "validationErrors" in updates) {
    const validationErrors = normalized.validationErrors ?? updates.validationErrors;
    normalized.hasValidationErrors = Object.keys(normalizeValidationErrors(validationErrors)).length > 0;
  }
  if ("dbDuplicates" in updates) {
    normalized.dbDuplicates = normalizeNumberArray(updates.dbDuplicates);
  }
  if ("duplicateAction" in updates) {
    normalized.duplicateAction = updates.duplicateAction === "process" ? "process" : "skip";
  }
  if ("processedCount" in updates) {
    normalized.processedCount = Number.isFinite(updates.processedCount) ? updates.processedCount : 0;
  }
  if ("leadStatuses" in updates) {
    normalized.leadStatuses = normalizeLeadStatuses(updates.leadStatuses);
  }
  if ("leadResponses" in updates) {
    normalized.leadResponses = normalizeStringRecord(updates.leadResponses);
  }
  if ("leadPayloads" in updates) {
    normalized.leadPayloads = normalizeStringRecord(updates.leadPayloads);
  }
  if ("leadDbIds" in updates) {
    normalized.leadDbIds = normalizeStringRecord(updates.leadDbIds);
  }
  if ("batchId" in updates) {
    normalized.batchId = updates.batchId ? coerceLeadValue(updates.batchId) : null;
  }
  if ("showSingleLeadForm" in updates) {
    normalized.showSingleLeadForm = Boolean(updates.showSingleLeadForm);
  }
  if ("pageSize" in updates) {
    normalized.pageSize =
      Number.isFinite(updates.pageSize) && (updates.pageSize ?? 0) > 0 ? updates.pageSize : DEFAULT_STATE.pageSize;
  }
  if ("searchTerm" in updates) {
    normalized.searchTerm = coerceLeadValue(updates.searchTerm);
  }
  if ("currentPage" in updates) {
    normalized.currentPage =
      Number.isFinite(updates.currentPage) && (updates.currentPage ?? -1) >= 0 ? updates.currentPage : 0;
  }

  return normalized;
}

interface UseUploadStatePersistenceReturn {
  // State
  state: UploadState;
  processing: ProcessingState;

  // State updates
  setState: (updates: Partial<UploadState>) => void;
  setProcessing: (updates: Partial<ProcessingState>) => void;

  // Convenience setters
  setLeads: (leads: Lead[]) => void;
  setLeadStatus: (index: number, status: "pending" | "success" | "failed") => void;
  setLeadResponse: (index: number, response: string) => void;
  setLeadPayload: (index: number, payload: string) => void;
  setValidationError: (index: number, errors: string[] | null) => void;
  incrementProcessedCount: () => void;

  // Actions
  resetAll: () => void;
  forceSave: () => void;

  // Computed values
  processingSlug: ProcessingSlug;
  isHydrated: boolean;

  // Map/Set conversions for components
  validationErrorsMap: Map<number, string[]>;
  dbDuplicatesSet: Set<number>;
  leadStatusesMap: Map<number, "pending" | "success" | "failed" | "duplicate">;
  leadResponsesMap: Map<number, string>;
  leadPayloadsMap: Map<number, string>;
  leadDbIdsMap: Map<number, string>;
}

export function useUploadStatePersistence(
  _options: UseUploadStatePersistenceOptions = {},
): UseUploadStatePersistenceReturn {
  // Synchronous hydration from localStorage
  const initialData = useMemo(() => loadFromStorage(), []);

  const [state, setStateInternal] = useState<UploadState>(initialData.state);
  const [processing, setProcessingInternal] = useState<ProcessingState>(initialData.processing);
  const [isHydrated, setIsHydrated] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const processingRef = useRef(processing);

  // Keep refs in sync
  useEffect(() => {
    stateRef.current = state;
    processingRef.current = processing;
  }, [state, processing]);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Debounced save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const delay = processingRef.current.isProcessing ? 2000 : 300;
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(stateRef.current, processingRef.current);
    }, delay);
  }, []);

  // Immediate save (for visibility change / unload)
  const forceSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    saveToStorage(stateRef.current, processingRef.current);
  }, []);

  // State update with auto-save
  const setState = useCallback(
    (updates: Partial<UploadState>) => {
      setStateInternal((prev) => {
        const next = { ...prev, ...normalizeUploadStateUpdates(updates) };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  // Processing state update with auto-save
  const setProcessing = useCallback(
    (updates: Partial<ProcessingState>) => {
      setProcessingInternal((prev) => {
        const next = { ...prev, ...updates };
        processingRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  // Convenience setters
  const setLeads = useCallback(
    (leads: Lead[]) => {
      setState({ leads: normalizeLeads(leads) });
    },
    [setState],
  );

  const setLeadStatus = useCallback(
    (index: number, status: "pending" | "success" | "failed") => {
      setStateInternal((prev) => {
        const next = {
          ...prev,
          leadStatuses: { ...prev.leadStatuses, [index]: status },
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const setLeadResponse = useCallback(
    (index: number, response: string) => {
      setStateInternal((prev) => {
        const next = {
          ...prev,
          // Partner responses are external JSON. Coerce here as well as at
          // initial hydration so a live response can never introduce an
          // object-valued React child into the upload UI.
          leadResponses: { ...prev.leadResponses, [index]: coerceLeadValue(response) },
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const setLeadPayload = useCallback(
    (index: number, payload: string) => {
      setStateInternal((prev) => {
        const next = {
          ...prev,
          leadPayloads: { ...prev.leadPayloads, [index]: coerceLeadValue(payload) },
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const setValidationError = useCallback(
    (index: number, errors: string[] | null) => {
      setStateInternal((prev) => {
        const newErrors = { ...prev.validationErrors };
        if (errors === null) {
          delete newErrors[index];
        } else {
          newErrors[index] = errors;
        }
        const next = {
          ...prev,
          validationErrors: newErrors,
          hasValidationErrors: Object.keys(newErrors).length > 0,
        };
        stateRef.current = next;
        scheduleSave();
        return next;
      });
    },
    [scheduleSave],
  );

  const incrementProcessedCount = useCallback(() => {
    setStateInternal((prev) => {
      const next = { ...prev, processedCount: prev.processedCount + 1 };
      stateRef.current = next;
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  // Reset all state
  const resetAll = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    setStateInternal(DEFAULT_STATE);
    setProcessingInternal(DEFAULT_PROCESSING_STATE);
    stateRef.current = DEFAULT_STATE;
    processingRef.current = DEFAULT_PROCESSING_STATE;
    clearStorage();
  }, []);

  // Computed processing slug
  const processingSlug = useMemo(() => getProcessingSlug(processing, state), [processing, state]);

  // Map/Set conversions
  const validationErrorsMap = useMemo(
    () => new Map(Object.entries(state.validationErrors).map(([k, v]) => [parseInt(k), v])),
    [state.validationErrors],
  );

  const dbDuplicatesSet = useMemo(() => new Set(state.dbDuplicates), [state.dbDuplicates]);

  const leadStatusesMap = useMemo(
    () => new Map(Object.entries(state.leadStatuses).map(([k, v]) => [parseInt(k), v])),
    [state.leadStatuses],
  );

  const leadResponsesMap = useMemo(
    () => new Map(Object.entries(state.leadResponses).map(([k, v]) => [parseInt(k), v])),
    [state.leadResponses],
  );

  const leadPayloadsMap = useMemo(
    () => new Map(Object.entries(state.leadPayloads).map(([k, v]) => [parseInt(k), v])),
    [state.leadPayloads],
  );

  const leadDbIdsMap = useMemo(
    () => new Map(Object.entries(state.leadDbIds).map(([k, v]) => [parseInt(k), v])),
    [state.leadDbIds],
  );

  // Save immediately on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        forceSave();
      }
    };

    const handleBeforeUnload = () => {
      forceSave();
    };

    // Also handle page hide for mobile browsers
    const handlePageHide = () => {
      forceSave();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [forceSave]);

  // Persist via state setters (debounced); this avoids duplicate scheduling on every render

  return {
    state,
    processing,
    setState,
    setProcessing,
    setLeads,
    setLeadStatus,
    setLeadResponse,
    setLeadPayload,
    setValidationError,
    incrementProcessedCount,
    resetAll,
    forceSave,
    processingSlug,
    isHydrated,
    validationErrorsMap,
    dbDuplicatesSet,
    leadStatusesMap,
    leadResponsesMap,
    leadPayloadsMap,
    leadDbIdsMap,
  };
}

// ============= Helper to check if there's saved data =============
export function hasSavedUploadData(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const data = normalizeUploadState(JSON.parse(stored) as UploadState);
    return data.leads.length > 0 || data.fileName !== "";
  } catch {
    return false;
  }
}
