// Enhanced Persistent App Cache v3.0
// Uses both localStorage (permanent) and sessionStorage (session-only for routes)
// Survives browser restarts, handles tab switching gracefully
// CRITICAL: No data refetching on tab switch - only on explicit user action

export interface AppCacheState {
  activeTab: string;
  crmSubTab: string;
  marketingSubTab: string;
  scrollPositions: Record<string, number>;
  expandedPanels: string[];
  searchTerms: Record<string, string>;
  lastRoute: string;
  universities: any[] | null;
  logs: any[] | null;
  batches: any[] | null;
  lastFetch: number;
  userId: string | null;
  // New: Track sub-routes for deep linking
  universitySubRoute: string | null;
  uploadSelectedUniversity: string | null;
  // Track URL shortener state
  urlShortenerTab: string | null;
}

const CACHE_KEY = 'dekhocampus_app_cache_v4';
const SESSION_KEY = 'dekhocampus_session_state_v3';
const CACHE_VERSION = '4.0';

// Default state
const defaultState: AppCacheState = {
  activeTab: 'dashboard',
  crmSubTab: 'dashboard',
  marketingSubTab: 'dashboard',
  scrollPositions: {},
  expandedPanels: [],
  searchTerms: {},
  lastRoute: '/dashboard',
  universities: null,
  logs: null,
  batches: null,
  lastFetch: 0,
  userId: null,
  universitySubRoute: null,
  uploadSelectedUniversity: null,
  urlShortenerTab: null,
};

// Fast in-memory cache for session state
interface SessionState {
  scrollPositions: Record<string, number>;
  lastRoute: string;
  timestamp: number;
  formData: Record<string, any>; // Store form data per route
}

class AppCache {
  private state: AppCacheState;
  private sessionState: SessionState;
  private initialized: boolean = false;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private sessionSaveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isHydrating: boolean = false;

  constructor() {
    this.state = { ...defaultState };
    this.sessionState = { 
      scrollPositions: {}, 
      lastRoute: '/dashboard', 
      timestamp: Date.now(),
      formData: {},
    };
    this.load();
  }

  private load(): void {
    if (this.initialized) return;
    this.isHydrating = true;

    // Load persistent data from localStorage
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === CACHE_VERSION) {
          this.state = { ...defaultState, ...parsed.state };
        } else {
          // Version mismatch - migrate or reset
          // Cache version mismatch - reset
          localStorage.removeItem(CACHE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load app cache:', error);
    }

    // Load session data from sessionStorage (faster access)
    try {
      const session = sessionStorage.getItem(SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
        this.sessionState = { ...this.sessionState, ...parsed };
        // Sync scroll positions
        this.state.scrollPositions = { ...this.state.scrollPositions, ...this.sessionState.scrollPositions };
        this.state.lastRoute = this.sessionState.lastRoute;
      }
    } catch (error) {
      console.warn('Failed to load session state:', error);
    }

    this.initialized = true;
    this.isHydrating = false;
  }

  private save(): void {
    if (this.isHydrating) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);

    this.saveTimeout = setTimeout(() => {
      try {
        const data = {
          version: CACHE_VERSION,
          state: this.state,
          savedAt: Date.now(),
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save app cache:', error);
      }
    }, 100);
  }

  private saveSession(): void {
    if (this.isHydrating) return;
    if (this.sessionSaveTimeout) clearTimeout(this.sessionSaveTimeout);

    this.sessionSaveTimeout = setTimeout(() => {
      try {
        this.sessionState.timestamp = Date.now();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.sessionState));
      } catch (error) {
        console.warn('Failed to save session state:', error);
      }
    }, 30); // Very fast debounce for sessionStorage
  }

  // Getters
  get activeTab(): string {
    return this.state.activeTab;
  }

  get crmSubTab(): string {
    return this.state.crmSubTab;
  }

  get marketingSubTab(): string {
    return this.state.marketingSubTab;
  }

  get scrollPositions(): Record<string, number> {
    return this.state.scrollPositions;
  }

  get expandedPanels(): string[] {
    return this.state.expandedPanels;
  }

  get lastRoute(): string {
    return this.sessionState.lastRoute || this.state.lastRoute;
  }

  get universities(): any[] | null {
    return this.state.universities;
  }

  get logs(): any[] | null {
    return this.state.logs;
  }

  get batches(): any[] | null {
    return this.state.batches;
  }

  get lastFetch(): number {
    return this.state.lastFetch;
  }

  get userId(): string | null {
    return this.state.userId;
  }

  get universitySubRoute(): string | null {
    return this.state.universitySubRoute;
  }

  get uploadSelectedUniversity(): string | null {
    return this.state.uploadSelectedUniversity;
  }

  get urlShortenerTab(): string | null {
    return this.state.urlShortenerTab;
  }

  // Setters
  setActiveTab(tab: string): void {
    this.state.activeTab = tab;
    this.save();
  }

  setCrmSubTab(tab: string): void {
    this.state.crmSubTab = tab;
    this.save();
  }

  setMarketingSubTab(tab: string): void {
    this.state.marketingSubTab = tab;
    this.save();
  }

  setScrollPosition(path: string, position: number): void {
    this.state.scrollPositions[path] = position;
    this.sessionState.scrollPositions[path] = position;
    this.saveSession();
  }

  getScrollPosition(path: string): number {
    return this.sessionState.scrollPositions[path] || this.state.scrollPositions[path] || 0;
  }

  setExpandedPanels(panels: string[]): void {
    this.state.expandedPanels = panels;
    this.save();
  }

  togglePanel(panelId: string): void {
    const index = this.state.expandedPanels.indexOf(panelId);
    if (index >= 0) {
      this.state.expandedPanels.splice(index, 1);
    } else {
      this.state.expandedPanels.push(panelId);
    }
    this.save();
  }

  isPanelExpanded(panelId: string): boolean {
    return this.state.expandedPanels.includes(panelId);
  }

  setSearchTerm(key: string, term: string): void {
    this.state.searchTerms[key] = term;
    this.save();
  }

  getSearchTerm(key: string): string {
    return this.state.searchTerms[key] || '';
  }

  setLastRoute(route: string): void {
    this.state.lastRoute = route;
    this.sessionState.lastRoute = route;
    this.saveSession();
    this.save();
  }

  setUniversities(data: any[]): void {
    this.state.universities = data;
    this.state.lastFetch = Date.now();
    this.save();
  }

  setLogs(data: any[]): void {
    this.state.logs = data;
    this.save();
  }

  setBatches(data: any[]): void {
    this.state.batches = data;
    this.save();
  }

  setUserId(id: string | null): void {
    if (this.state.userId && this.state.userId !== id) {
      // User changed - clear data cache but keep UI state
      this.state.universities = null;
      this.state.logs = null;
      this.state.batches = null;
      this.state.lastFetch = 0;
    }
    this.state.userId = id;
    this.save();
  }

  setUniversitySubRoute(route: string | null): void {
    this.state.universitySubRoute = route;
    this.save();
  }

  setUploadSelectedUniversity(slug: string | null): void {
    this.state.uploadSelectedUniversity = slug;
    this.save();
  }

  setUrlShortenerTab(tab: string | null): void {
    this.state.urlShortenerTab = tab;
    this.save();
  }

  // Form data persistence (for upload forms, etc.)
  setFormData(key: string, data: any): void {
    this.sessionState.formData[key] = data;
    this.saveSession();
  }

  getFormData(key: string): any {
    return this.sessionState.formData[key] || null;
  }

  clearFormData(key: string): void {
    delete this.sessionState.formData[key];
    this.saveSession();
  }

  hasData(): boolean {
    return this.state.universities !== null && this.state.universities.length > 0;
  }

  isStale(maxAge: number = 10 * 60 * 1000): boolean {
    return Date.now() - this.state.lastFetch > maxAge;
  }

  // Clear all cached data (but keep UI state)
  clearDataCache(): void {
    this.state.universities = null;
    this.state.logs = null;
    this.state.batches = null;
    this.state.lastFetch = 0;
    this.save();
  }

  // Full reset
  reset(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    if (this.sessionSaveTimeout) {
      clearTimeout(this.sessionSaveTimeout);
      this.sessionSaveTimeout = null;
    }
    this.state = { ...defaultState };
    this.sessionState = { scrollPositions: {}, lastRoute: '/dashboard', timestamp: Date.now(), formData: {} };
    try {
      localStorage.removeItem(CACHE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.warn('Failed to clear app cache:', error);
    }
  }

  // Get full state (for debugging)
  getState(): AppCacheState {
    return { ...this.state };
  }
}

// Singleton instance
export const appCache = new AppCache();

// React hook for reactive updates
import { useState, useCallback } from 'react';

export function useAppCache() {
  const [, forceUpdate] = useState({});

  const refresh = useCallback(() => {
    forceUpdate({});
  }, []);

  return {
    cache: appCache,
    refresh,
  };
}
