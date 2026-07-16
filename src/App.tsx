import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { useEffect, useRef, memo, Suspense, lazy, forwardRef } from "react";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { appCache } from "@/hooks/useAppCache";
import { hasSupabaseConfig, supabaseConfigError } from "@/integrations/supabase/client";

// Lazy load pages for faster initial load
// Retry a transient dynamic-import failure in place. Never hard-reload here:
// Cloudflare can briefly return a stale chunk during a deployment, and calling
// window.location.reload() turns that short cache mismatch into a reload loop.
function lazyWithRetry<T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("error loading dynamically imported module")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return await factory();
      }
      throw err;
    }
  });
}

const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const TelecallerApp = lazyWithRetry(() => import("./pages/TelecallerApp"));
const UrlRedirect = lazyWithRetry(() => import("./pages/UrlRedirect"));
// Optimized QueryClient with aggressive caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data refreshes after this
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

// Minimal loading state - forwardRef to suppress Suspense ref warning
const LoadingFallback = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
));
LoadingFallback.displayName = "LoadingFallback";

// Memoized Index to prevent re-renders
const MemoizedIndex = memo(Index);

// Protected layout wrapper
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <MemoizedIndex />
    </ProtectedRoute>
  );
}

const StableProtectedLayout = memo(ProtectedLayout);

// Route state saver - handles persistence WITHOUT triggering refetches
function RouteStateSaver() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathRef = useRef(location.pathname);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    // Save route to cache immediately
    appCache.setLastRoute(location.pathname);

    // Only handle scroll on actual navigation, not on tab switches or visibility changes
    if (prevPathRef.current !== location.pathname && !isRestoringRef.current) {
      // Save scroll for previous path (only on PUSH navigation)
      if (navigationType === "PUSH") {
        appCache.setScrollPosition(prevPathRef.current, window.scrollY);
      }

      prevPathRef.current = location.pathname;

      // Restore scroll for new path with a slight delay for render
      const savedScroll = appCache.getScrollPosition(location.pathname);
      if (savedScroll > 0) {
        isRestoringRef.current = true;
        requestAnimationFrame(() => {
          window.scrollTo(0, savedScroll);
          // Reset flag after scroll restoration
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 100);
        });
      }
    }
  }, [location.pathname, navigationType]);

  // Handle visibility change - ONLY save scroll, NEVER refetch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        // Save current scroll position when tab is hidden
        appCache.setScrollPosition(location.pathname, window.scrollY);
      }
      // CRITICAL: Do NOT do anything when tab becomes visible
      // This prevents the constant refresh issue
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [location.pathname]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <RouteStateSaver />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Auth route */}
          <Route path="/auth" element={<Auth />} />

          {/* Telecaller Mobile App */}
          <Route
            path="/telecaller"
            element={
              <ProtectedRoute>
                <TelecallerApp />
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route path="/" element={<Navigate to="/all-leads" replace />} />
          <Route path="/universities" element={<Navigate to="/lead-push/universities" replace />} />
          <Route path="/upload" element={<Navigate to="/lead-push/upload" replace />} />
          <Route path="/history" element={<Navigate to="/lead-push/history" replace />} />
          <Route path="/logs" element={<Navigate to="/lead-push/logs" replace />} />
          <Route path="/marketing" element={<Navigate to="/crm/marketing-automation" replace />} />
          <Route path="/marketing/*" element={<Navigate to="/crm/marketing-automation" replace />} />

          {/*
            FIX: "Page refreshes on every click"
            Previously each path had its OWN <Route element={<StableProtectedLayout />} />.
            React Router v6 treats those as distinct route nodes, so navigating between
            them unmounts and remounts the entire Index tree - re-running every effect,
            re-fetching universities/logs, and flashing the loading state.
            We now mount Index ONCE per top-level section via wildcard (`/*`) routes.
            Index reads `useLocation()` internally to render the right view, so the
            same instance is preserved across all sub-navigations.
          */}
          <Route path="/all-leads" element={<StableProtectedLayout />} />
          <Route path="/dashboard" element={<StableProtectedLayout />} />
          <Route path="/lead-push/*" element={<StableProtectedLayout />} />
          <Route path="/crm/*" element={<StableProtectedLayout />} />
          <Route path="/connections/*" element={<StableProtectedLayout />} />
          <Route path="/automation/*" element={<StableProtectedLayout />} />
          <Route path="/settings/*" element={<StableProtectedLayout />} />
          <Route path="/telecaller-mgmt" element={<StableProtectedLayout />} />
          <Route path="/url-shortener/*" element={<StableProtectedLayout />} />
          <Route path="/uni-tracker" element={<StableProtectedLayout />} />

          {/* URL Redirect - public route for short URLs */}
          {/* Supports: /{code}, /{HEADER}/{code} */}
          {/* Legacy /r/ prefix still supported for backward compatibility */}
          <Route path="/r/:code" element={<UrlRedirect />} />
          <Route path="/r/:header/:code" element={<UrlRedirect />} />

          {/* Direct short URL format (no /r/ prefix) */}
          <Route path="/s/:code" element={<UrlRedirect />} />
          <Route path="/s/:header/:code" element={<UrlRedirect />} />

          {/* Catch-all: checks if it matches a short URL, else shows 404 */}
          <Route path="/:codeOrHeader" element={<UrlRedirect />} />
          <Route path="/:header/:code" element={<UrlRedirect />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {hasSupabaseConfig ? (
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      ) : (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-2xl border border-destructive/30 bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-foreground">Supabase configuration missing</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This deployment is missing the environment variables required to start the app.
            </p>
            <div className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {supabaseConfigError}
            </div>
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <p>Add these variables in Cloudflare Pages and redeploy:</p>
              <p>`VITE_SUPABASE_URL`</p>
              <p>`VITE_SUPABASE_PUBLISHABLE_KEY`</p>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
