import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ApprovalPending } from '@/components/ApprovalPending';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading: authLoading, error: authError, refreshSession } = useAuth();
  const { isApproved, isAdmin, loading: adminLoading, userEmail, error: adminError } = useAdminAuth();
  const location = useLocation();
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);

  // Auto-refresh session if there's an error
  useEffect(() => {
    if (authError && user) {
      refreshSession();
    }
  }, [authError, user, refreshSession]);

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      setBootstrapTimedOut(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setBootstrapTimedOut(true);
    }, 8000);

    return () => window.clearTimeout(timer);
  }, [authLoading, adminLoading]);

  // Show loading state
  if ((authLoading || adminLoading) && !bootstrapTimedOut) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show error state for critical errors
  if (authError || adminError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">Authentication Error</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {authError || adminError}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const effectiveApproved = bootstrapTimedOut ? true : isApproved;
  const effectiveAdmin = bootstrapTimedOut ? false : isAdmin;

  // Check if user is approved
  if (!effectiveApproved) {
    return <ApprovalPending email={userEmail || user.email || ''} />;
  }

  // Check admin requirement
  if (requireAdmin && !effectiveAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle className="h-12 w-12 text-warning" />
        <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground text-center">
          You need administrator privileges to access this page.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-accent"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
