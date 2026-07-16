// Persistent route state management with micro-slugs
// Handles nested routes like /universities/add, /upload/krmu, /crm/pipeline

import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROUTE_STATE_KEY = 'dc_route_state';

interface RouteState {
  activeTab: string;
  subRoute: string | null;
  params: Record<string, string>;
  scrollY: number;
  timestamp: number;
}

interface FullRouteState {
  routes: Record<string, RouteState>;
  lastRoute: string;
  version: string;
}

const VERSION = '2.0';

class RouteStateManager {
  private state: FullRouteState;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.state = this.load();
  }

  private load(): FullRouteState {
    try {
      const stored = sessionStorage.getItem(ROUTE_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === VERSION) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load route state:', e);
    }
    return { routes: {}, lastRoute: '/dashboard', version: VERSION };
  }

  private save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        sessionStorage.setItem(ROUTE_STATE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.warn('Failed to save route state:', e);
      }
    }, 50);
  }

  setRoute(path: string, routeState: Partial<RouteState>): void {
    const existing = this.state.routes[path] || { activeTab: '', subRoute: null, params: {}, scrollY: 0, timestamp: 0 };
    this.state.routes[path] = { ...existing, ...routeState, timestamp: Date.now() };
    this.state.lastRoute = path;
    this.save();
  }

  getRoute(path: string): RouteState | null {
    return this.state.routes[path] || null;
  }

  get lastRoute(): string {
    return this.state.lastRoute;
  }

  setScrollPosition(path: string, scrollY: number): void {
    if (this.state.routes[path]) {
      this.state.routes[path].scrollY = scrollY;
      this.save();
    }
  }

  getScrollPosition(path: string): number {
    return this.state.routes[path]?.scrollY || 0;
  }

  clear(): void {
    this.state = { routes: {}, lastRoute: '/dashboard', version: VERSION };
    sessionStorage.removeItem(ROUTE_STATE_KEY);
  }
}

export const routeState = new RouteStateManager();

// Parse route into tab, subRoute, and params
export function parseRoute(pathname: string): { tab: string; subRoute: string | null; param: string | null } {
  const parts = pathname.split('/').filter(Boolean);
  
  if (parts.length === 0) {
    return { tab: 'dashboard', subRoute: null, param: null };
  }

  const tab = parts[0];
  const subRoute = parts.length > 1 ? parts[1] : null;
  const param = parts.length > 2 ? parts[2] : null;

  return { tab, subRoute, param };
}

// Build route from parts
export function buildRoute(tab: string, subRoute?: string | null, param?: string | null): string {
  let path = `/${tab}`;
  if (subRoute) path += `/${subRoute}`;
  if (param) path += `/${param}`;
  return path;
}

// Hook for route state management
export function useRouteState() {
  const navigate = useNavigate();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const isRestoringRef = useRef(false);

  const { tab, subRoute, param } = parseRoute(location.pathname);

  // Save scroll position when leaving a route
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoringRef.current) {
        routeState.setScrollPosition(location.pathname, window.scrollY);
      }
    };

    // Debounced scroll handler
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const debouncedScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    return () => {
      clearTimeout(scrollTimeout);
      window.removeEventListener('scroll', debouncedScroll);
    };
  }, [location.pathname]);

  // Track route changes
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      // Save previous scroll position
      routeState.setScrollPosition(prevPathRef.current, window.scrollY);
      
      // Update state for new route
      routeState.setRoute(location.pathname, {
        activeTab: tab,
        subRoute,
        params: param ? { id: param } : {},
      });

      // Restore scroll position for new route
      const savedScroll = routeState.getScrollPosition(location.pathname);
      if (savedScroll > 0) {
        isRestoringRef.current = true;
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScroll);
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 100);
        });
      }

      prevPathRef.current = location.pathname;
    }
  }, [location.pathname, tab, subRoute, param]);

  // Handle visibility change (tab switching) - Only save state, NO navigation
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // User left tab - save current scroll position only
        routeState.setScrollPosition(location.pathname, window.scrollY);
      }
      // Do NOT navigate when returning - this causes unwanted refreshes
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [location.pathname]);

  const navigateTo = useCallback((newTab: string, newSubRoute?: string | null, newParam?: string | null) => {
    const path = buildRoute(newTab, newSubRoute, newParam);
    if (path !== location.pathname) {
      routeState.setRoute(path, {
        activeTab: newTab,
        subRoute: newSubRoute || null,
        params: newParam ? { id: newParam } : {},
      });
      navigate(path);
    }
  }, [location.pathname, navigate]);

  const setSubRoute = useCallback((newSubRoute: string | null) => {
    navigateTo(tab, newSubRoute);
  }, [tab, navigateTo]);

  const setParam = useCallback((newParam: string | null) => {
    navigateTo(tab, subRoute, newParam);
  }, [tab, subRoute, navigateTo]);

  return {
    tab,
    subRoute,
    param,
    navigateTo,
    setSubRoute,
    setParam,
    pathname: location.pathname,
  };
}
