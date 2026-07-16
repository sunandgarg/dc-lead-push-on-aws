import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // Track user ID to prevent unnecessary re-renders on token refresh
  const userIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        const newUserId = session?.user?.id ?? null;
        const userChanged = userIdRef.current !== newUserId;

        // On TOKEN_REFRESHED, only update session ref but DON'T re-render
        // unless the user actually changed (login/logout)
        if (event === 'TOKEN_REFRESHED' && !userChanged && isInitializedRef.current) {
          // Silently update session without causing re-render
          // Components that need fresh tokens should use supabase.auth.getSession()
          return;
        }

        userIdRef.current = newUserId;
        isInitializedRef.current = true;

        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setState(prev => ({
            ...prev,
            loading: false,
            error: error.message,
          }));
          return;
        }

        userIdRef.current = session?.user?.id ?? null;
        isInitializedRef.current = true;

        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: String(err),
          }));
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      userIdRef.current = null;
      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Sign out error:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: String(err),
      }));
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;

      // Only update if user actually changed
      const newUserId = session?.user?.id ?? null;
      if (newUserId !== userIdRef.current) {
        userIdRef.current = newUserId;
        setState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          error: null,
        }));
      }
    } catch (err) {
      console.error('Session refresh error:', err);
    }
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    signOut,
    refreshSession,
  };
}
