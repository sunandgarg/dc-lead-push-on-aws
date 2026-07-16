import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, supabaseProjectUrl } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

const KNOWN_ROUTES = new Set([
  'auth', 'dashboard', 'lead-push', 'crm', 'settings',
  'url-shortener', 'telecaller', 'universities', 'upload',
  'history', 'logs', 'marketing',
]);

/**
 * URL Redirect Fallback Handler
 * 
 * This component is a FALLBACK for the inline script in index.html.
 * The inline script handles 99% of redirects instantly (before React loads).
 * This component handles edge cases: expired/inactive URLs, error states, 404s.
 */
export default function UrlRedirect() {
  const params = useParams<{ code?: string; header?: string; codeOrHeader?: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    (async () => {
      let header: string | null = null;
      let code: string | null = null;

      if (params.header && params.code) {
        header = params.header;
        code = params.code;
      } else if (params.code) {
        code = params.code;
      } else if (params.codeOrHeader) {
        const value = params.codeOrHeader;
        if (KNOWN_ROUTES.has(value.toLowerCase())) {
          navigate('/not-found', { replace: true });
          return;
        }
        code = value;
      }

      if (!code) { setError('Invalid URL'); return; }

      try {
        let query = supabase
          .from('url_mappings')
          .select('id, original_url, is_active, expires_at, user_tracking')
          .eq('short_code', code);

        if (header) {
          query = query.eq('header', header.toUpperCase());
        } else {
          query = query.is('header', null);
        }

        let { data: mapping } = await query.maybeSingle();

        // Broader fallback
        if (!mapping && !header) {
          const { data } = await supabase
            .from('url_mappings')
            .select('id, original_url, is_active, expires_at, user_tracking')
            .eq('short_code', code)
            .maybeSingle();
          mapping = data;
        }

        if (!mapping) {
          // Check if it could be a header
          if (params.codeOrHeader && !header) {
            const { data: headerMatches } = await supabase
              .from('url_mappings')
              .select('id')
              .eq('header', params.codeOrHeader.toUpperCase())
              .limit(1);
            if (!headerMatches?.length) {
              navigate('/*', { replace: true });
              return;
            }
          }
          setError('URL not found');
          return;
        }

        if (!mapping.is_active) { setError('This link has been deactivated'); return; }
        if (mapping.expires_at && new Date(mapping.expires_at) < new Date()) {
          setError('This link has expired');
          return;
        }

        // Track + redirect (the inline script likely already handled this,
        // but if we're here as fallback, do it again)
        if (mapping.user_tracking !== false) {
          trackClick(mapping.id);
        }
        window.location.replace(mapping.original_url);
      } catch (e) {
        console.error('[UrlRedirect] Error:', e);
        setError('Something went wrong');
      }
    })();
  }, [params.code, params.header, params.codeOrHeader, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Oops!</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Minimal - should rarely be seen since inline script handles redirect
  return null;
}

function trackClick(urlId: string) {
  const ua = navigator.userAgent;
  const referrer = document.referrer || null;
  const { browser, os, deviceType } = parseUA(ua);

  const headers: Record<string, string> = {
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
  const base = supabaseProjectUrl;

  try {
    fetch(`${base}/rest/v1/url_clicks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url_id: urlId, user_agent: ua, referrer, browser, os, device_type: deviceType }),
      keepalive: true,
    });
    fetch(`${base}/rest/v1/rpc/increment_url_clicks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_url_id: urlId }),
      keepalive: true,
    });
  } catch { /* non-critical */ }
}

function parseUA(ua: string) {
  let browser: string | null = null, os: string | null = null, deviceType = 'desktop';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) deviceType = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'tablet';
  return { browser, os, deviceType };
}
