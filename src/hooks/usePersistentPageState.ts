/**
 * usePersistentPageState - Robust state persistence with mini sub-slugs
 * 
 * This hook provides:
 * 1. Automatic sub-slug generation per page session
 * 2. State persistence across tab switches and refreshes
 * 3. File upload metadata preservation
 * 4. Hydration before render
 * 
 * WHY DATA WILL NOT RESET ON TAB SWITCH OR REFRESH:
 * - State is saved to sessionStorage on every change (debounced)
 * - Sub-slug is stable within the session (generated once, reused)
 * - On mount, state is hydrated from storage BEFORE first render
 * - No visibility change or focus handlers trigger navigation/reload
 * - React state is restored from storage, not re-initialized
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ============= Sub-Slug Generation =============

/**
 * Generate a unique sub-slug for session identification
 * Format: sess-[timestamp base36]-[random 4 chars]
 */
export function generateSubSlug(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `sess-${timestamp}-${random}`;
}

/**
 * Check if a string is a valid sub-slug
 */
export function isValidSubSlug(slug: string): boolean {
  return /^sess-[a-z0-9]+-[a-z0-9]{4}$/.test(slug);
}

// ============= Storage Utilities =============

const STORAGE_PREFIX = 'app:page:';
const DRAFT_INDICATOR_KEY = 'app:draft_indicator';
const SUB_SLUG_KEY = 'app:sub_slugs';

interface StoredPageState<T> {
  data: T;
  subSlug: string;
  savedAt: number;
  version: string;
}

export interface FileMeta {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface DraftIndicator {
  path: string;
  subSlug: string;
  hasUnsavedChanges: boolean;
  lastSaved: number;
}

/**
 * Get storage key for a page + sub-slug combination
 */
function getStorageKey(basePath: string, subSlug: string): string {
  return `${STORAGE_PREFIX}${basePath}:${subSlug}`;
}

/**
 * Save page state to sessionStorage
 */
function savePageState<T>(basePath: string, subSlug: string, data: T): void {
  try {
    const key = getStorageKey(basePath, subSlug);
    const stored: StoredPageState<T> = {
      data,
      subSlug,
      savedAt: Date.now(),
      version: '1.0',
    };
    sessionStorage.setItem(key, JSON.stringify(stored));
  } catch (error) {
    console.warn('Failed to save page state:', error);
  }
}

/**
 * Load page state from sessionStorage
 */
function loadPageState<T>(basePath: string, subSlug: string): T | null {
  try {
    const key = getStorageKey(basePath, subSlug);
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const parsed: StoredPageState<T> = JSON.parse(stored);
      if (parsed.subSlug === subSlug) {
        return parsed.data;
      }
    }
  } catch (error) {
    console.warn('Failed to load page state:', error);
  }
  return null;
}

/**
 * Clear page state from sessionStorage
 */
function clearPageState(basePath: string, subSlug: string): void {
  try {
    const key = getStorageKey(basePath, subSlug);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear page state:', error);
  }
}

/**
 * Manage sub-slug registry (which sub-slugs belong to which paths)
 */
function getSubSlugRegistry(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem(SUB_SLUG_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setSubSlugForPath(basePath: string, subSlug: string): void {
  try {
    const registry = getSubSlugRegistry();
    registry[basePath] = subSlug;
    sessionStorage.setItem(SUB_SLUG_KEY, JSON.stringify(registry));
  } catch (error) {
    console.warn('Failed to save sub-slug registry:', error);
  }
}

function getSubSlugForPath(basePath: string): string | null {
  const registry = getSubSlugRegistry();
  return registry[basePath] || null;
}

/**
 * Update draft indicator for UI feedback
 */
function updateDraftIndicator(indicator: DraftIndicator): void {
  try {
    const indicators = getDraftIndicators();
    indicators[indicator.path] = indicator;
    sessionStorage.setItem(DRAFT_INDICATOR_KEY, JSON.stringify(indicators));
  } catch (error) {
    console.warn('Failed to update draft indicator:', error);
  }
}

function getDraftIndicators(): Record<string, DraftIndicator> {
  try {
    const stored = sessionStorage.getItem(DRAFT_INDICATOR_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getDraftIndicator(path: string): DraftIndicator | null {
  const indicators = getDraftIndicators();
  return indicators[path] || null;
}

function clearDraftIndicator(path: string): void {
  try {
    const indicators = getDraftIndicators();
    delete indicators[path];
    sessionStorage.setItem(DRAFT_INDICATOR_KEY, JSON.stringify(indicators));
  } catch (error) {
    console.warn('Failed to clear draft indicator:', error);
  }
}

// ============= File Persistence Utilities =============

// In-memory file cache (survives component re-renders, not page refreshes)
const fileCache = new Map<string, File>();

/**
 * Store file metadata and cache the File object
 */
export function storeFileMeta(key: string, file: File): FileMeta {
  const meta: FileMeta = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
  
  // Cache the actual file object in memory
  fileCache.set(key, file);
  
  return meta;
}

/**
 * Get cached File object if available
 */
export function getCachedFile(key: string): File | null {
  return fileCache.get(key) || null;
}

/**
 * Clear cached file
 */
export function clearCachedFile(key: string): void {
  fileCache.delete(key);
}

// ============= Main Hook =============

interface UsePersistentPageStateOptions<T> {
  /** Base path without sub-slug (e.g., '/upload') */
  basePath: string;
  /** Initial state when no saved state exists */
  initialState: T;
  /** Whether to update URL with sub-slug */
  updateUrl?: boolean;
  /** Storage type: 'session' for temporary, 'local' for long-lived drafts */
  storageType?: 'session' | 'local';
  /** Debounce delay for saving (ms) */
  saveDebounce?: number;
}

interface UsePersistentPageStateReturn<T> {
  /** Current state */
  state: T;
  /** Update state (will auto-save) */
  setState: (updater: T | ((prev: T) => T)) => void;
  /** Current sub-slug */
  subSlug: string;
  /** Whether state has been hydrated from storage */
  isHydrated: boolean;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Last saved timestamp */
  lastSaved: number | null;
  /** Reset to initial state and clear storage */
  resetDraft: () => void;
  /** Mark current state as saved (clears unsaved indicator) */
  markAsSaved: () => void;
  /** Get or set file metadata */
  fileMetaStore: {
    get: (fileKey: string) => FileMeta | null;
    set: (fileKey: string, file: File) => FileMeta;
    getFile: (fileKey: string) => File | null;
    clear: (fileKey: string) => void;
  };
}

export function usePersistentPageState<T extends object>(
  options: UsePersistentPageStateOptions<T>
): UsePersistentPageStateReturn<T> {
  const {
    basePath,
    initialState,
    updateUrl = true,
    storageType = 'session',
    saveDebounce = 300,
  } = options;

  const navigate = useNavigate();
  const location = useLocation();
  
  // Track if this is the first mount
  const isFirstMountRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChangesRef = useRef(false);
  
  // Determine sub-slug: from URL, from registry, or generate new
  const subSlug = useMemo(() => {
    // Check URL first
    const pathParts = location.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    if (lastPart && isValidSubSlug(lastPart)) {
      return lastPart;
    }
    
    // Check registry for existing sub-slug for this path
    const existingSlug = getSubSlugForPath(basePath);
    if (existingSlug && isValidSubSlug(existingSlug)) {
      return existingSlug;
    }
    
    // Generate new sub-slug
    const newSlug = generateSubSlug();
    setSubSlugForPath(basePath, newSlug);
    return newSlug;
  }, [basePath, location.pathname]);

  // IMPORTANT: Load persisted snapshot ONCE and use it to initialize both pieces of state.
  // Never call setState during render (it can cause React to remount/reset in strict mode).
  const initialSnapshot = useMemo(() => {
    return loadPageState<{ state: T; fileMetas: Record<string, FileMeta> }>(basePath, subSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, subSlug]);

  // File metadata storage (persisted with state)
  const [fileMetas, setFileMetas] = useState<Record<string, FileMeta>>(
    () => initialSnapshot?.fileMetas || {}
  );

  // Hydrate state from storage on mount
  const [state, setStateInternal] = useState<T>(() => initialSnapshot?.state || initialState);

  const [isHydrated, setIsHydrated] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update URL with sub-slug on mount if needed
  useEffect(() => {
    if (!updateUrl || !isFirstMountRef.current) return;
    
    const pathParts = location.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    
    // Only update URL if sub-slug is not already in URL
    if (!isValidSubSlug(lastPart)) {
      const newPath = `${location.pathname.replace(/\/$/, '')}/${subSlug}`;
      navigate(newPath, { replace: true });
    }
    
    isFirstMountRef.current = false;
    setIsHydrated(true);
  }, [updateUrl, subSlug, location.pathname, navigate]);

  // Mark as hydrated even if URL doesn't update
  useEffect(() => {
    if (!isHydrated) {
      setIsHydrated(true);
    }
  }, [isHydrated]);

  // Save state to storage (debounced)
  const saveToStorage = useCallback((newState: T, newFileMetas: Record<string, FileMeta>) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      savePageState(basePath, subSlug, { state: newState, fileMetas: newFileMetas });
      setLastSaved(Date.now());
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      
      updateDraftIndicator({
        path: basePath,
        subSlug,
        hasUnsavedChanges: false,
        lastSaved: Date.now(),
      });
    }, saveDebounce);
    
    // Immediately mark as having unsaved changes
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  }, [basePath, subSlug, saveDebounce]);

  // Public setState that auto-saves
  const setState = useCallback((updater: T | ((prev: T) => T)) => {
    setStateInternal(prev => {
      const newState = typeof updater === 'function' ? (updater as (prev: T) => T)(prev) : updater;
      saveToStorage(newState, fileMetas);
      return newState;
    });
  }, [saveToStorage, fileMetas]);

  // Reset draft and clear storage
  const resetDraft = useCallback(() => {
    setStateInternal(initialState);
    setFileMetas({});
    clearPageState(basePath, subSlug);
    clearDraftIndicator(basePath);
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    setLastSaved(null);
    
    // Clear file cache
    fileCache.clear();
    
    // Generate new sub-slug for fresh start
    const newSlug = generateSubSlug();
    setSubSlugForPath(basePath, newSlug);
    
    if (updateUrl) {
      const baseWithoutSlug = location.pathname.replace(/\/sess-[a-z0-9]+-[a-z0-9]{4}$/, '');
      navigate(`${baseWithoutSlug}/${newSlug}`, { replace: true });
    }
  }, [initialState, basePath, subSlug, updateUrl, location.pathname, navigate]);

  // Mark as saved
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
    hasUnsavedChangesRef.current = false;
    setLastSaved(Date.now());
    
    updateDraftIndicator({
      path: basePath,
      subSlug,
      hasUnsavedChanges: false,
      lastSaved: Date.now(),
    });
  }, [basePath, subSlug]);

  // File metadata store
  const fileMetaStore = useMemo(() => ({
    get: (fileKey: string): FileMeta | null => {
      return fileMetas[fileKey] || null;
    },
    set: (fileKey: string, file: File): FileMeta => {
      const meta = storeFileMeta(fileKey, file);
      setFileMetas(prev => {
        const updated = { ...prev, [fileKey]: meta };
        saveToStorage(state, updated);
        return updated;
      });
      return meta;
    },
    getFile: (fileKey: string): File | null => {
      return getCachedFile(fileKey);
    },
    clear: (fileKey: string): void => {
      clearCachedFile(fileKey);
      setFileMetas(prev => {
        const updated = { ...prev };
        delete updated[fileKey];
        saveToStorage(state, updated);
        return updated;
      });
    },
  }), [fileMetas, state, saveToStorage]);

  // Warn before unload if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // IMPORTANT: NO visibility change handlers that cause reloads!
  // State is persisted to storage, and React state is preserved in memory

  return {
    state,
    setState,
    subSlug,
    isHydrated,
    hasUnsavedChanges,
    lastSaved,
    resetDraft,
    markAsSaved,
    fileMetaStore,
  };
}

// ============= Utility Hooks =============

/**
 * Hook to check if a draft exists for a path
 */
export function useDraftIndicator(path: string) {
  const [indicator, setIndicator] = useState<DraftIndicator | null>(null);
  
  useEffect(() => {
    setIndicator(getDraftIndicator(path));
    
    // Check periodically for updates
    const interval = setInterval(() => {
      setIndicator(getDraftIndicator(path));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [path]);
  
  return indicator;
}

/**
 * Hook to get the current sub-slug for a path without creating a new one
 */
export function useExistingSubSlug(basePath: string): string | null {
  return getSubSlugForPath(basePath);
}

export default usePersistentPageState;
