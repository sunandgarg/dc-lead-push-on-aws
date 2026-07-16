import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, LogIn, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const checkExistingSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session check error:', error);
      }
      if (session?.user) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setCheckingSession(false);
    }
  }, [navigate, from]);

  useEffect(() => {
    let mounted = true;

    // Check URL hash for recovery token
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecovery(true);
      setCheckingSession(false);
      return () => { mounted = false; };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (session?.user) {
          navigate(from, { replace: true });
        }
        setCheckingSession(false);
      }
    );

    checkExistingSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, from, checkExistingSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email?.trim()) { setError('Please enter your email address'); return; }
    if (!password) { setError('Please enter your password'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({ 
          email: email.trim().toLowerCase(), 
          password,
          options: { emailRedirectTo: `${window.location.origin}/` }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('This email is already registered. Try signing in instead.');
          } else if (signUpError.message.includes('rate limit')) {
            setError('Too many attempts. Please try again later.');
          } else {
            setError(signUpError.message);
          }
        } else {
          toast({ title: 'Account Created!', description: 'Your account is pending admin approval.' });
          setIsSignUp(false);
          setEmail('');
          setPassword('');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ 
          email: email.trim().toLowerCase(), 
          password 
        });
        
        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please try again.');
          } else if (signInError.message.includes('rate limit')) {
            setError('Too many login attempts. Please try again later.');
          } else if (signInError.message.includes('Email not confirmed')) {
            setError('Please check your email and confirm your account.');
          } else {
            setError(signInError.message);
          }
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setError(updateErr.message);
      } else {
        toast({ title: 'Password Updated', description: 'You can now sign in with your new password.' });
        setIsRecovery(false);
        setNewPassword('');
        await supabase.auth.signOut();
      }
    } catch {
      setError('Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setCheckingSession(true);
    checkExistingSession();
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-elevated p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center">
              <img src={logo} alt="Logo" className="h-16 w-auto" />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <button type="button" onClick={() => setError(null)} className="text-destructive hover:text-destructive/80">×</button>
            </div>
          )}

          {isRecovery ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-5">
              <p className="text-sm text-muted-foreground text-center mb-4">Enter your new password below.</p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                    placeholder="Enter new password (min 6 chars)"
                    className="input-field pl-11"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update Password'}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => { setIsRecovery(false); setError(null); }} className="text-sm text-primary hover:underline">
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="Enter your email"
                      className="input-field pl-11"
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder={isSignUp ? "Create a password (min 6 chars)" : "Enter your password"}
                      className="input-field pl-11"
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      disabled={loading}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      {isSignUp ? 'Create Account' : 'Sign In'}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-2">
                {!isSignUp && (
                  <p className="text-sm text-muted-foreground text-center">
                    Forgot password? Please contact admin.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
                  disabled={loading}
                  className="text-sm text-primary hover:underline disabled:opacity-50"
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </div>
            </>
          )}

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh connection
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Contact admin if you need access
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
