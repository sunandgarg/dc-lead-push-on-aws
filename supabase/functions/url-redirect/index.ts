import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache for hot URLs (TTL 60s)
const cache = new Map<string, { url: string; id: string; tracking: boolean; ts: number }>();
const CACHE_TTL = 60_000;

function getCacheKey(code: string, header: string | null) {
  return header ? `${header.toUpperCase()}:${code}` : code;
}

function parseUserAgent(ua: string | null) {
  if (!ua) return { browser: null, os: null, device_type: 'unknown' };
  let browser = null, os = null, device_type = 'desktop';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';
  if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) device_type = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) device_type = 'tablet';
  return { browser, os, device_type };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    let header: string | null = null;
    let shortCode: string | null = null;

    if (url.searchParams.has('code')) {
      shortCode = url.searchParams.get('code');
      header = url.searchParams.get('header') || null;
    } else if (pathParts.length >= 1) {
      const relevantParts = pathParts[0] === 'url-redirect' ? pathParts.slice(1) : pathParts;
      if (relevantParts.length === 1) shortCode = relevantParts[0];
      else if (relevantParts.length >= 2) { header = relevantParts[0]; shortCode = relevantParts[1]; }
    }

    if (!shortCode) {
      return new Response('{"error":"Invalid URL"}', { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cacheKey = getCacheKey(shortCode, header);
    const now = Date.now();
    const cached = cache.get(cacheKey);

    // Serve from cache if fresh
    if (cached && (now - cached.ts) < CACHE_TTL) {
      // Fire-and-forget tracking
      if (cached.tracking) {
        const userAgent = req.headers.get('user-agent');
        const referrer = req.headers.get('referer');
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
        const { browser, os, device_type } = parseUserAgent(userAgent);
        Promise.allSettled([
          supabase.from('url_clicks').insert({ url_id: cached.id, user_agent: userAgent, referrer, ip_address: ip, browser, os, device_type }),
          supabase.rpc('increment_url_clicks', { p_url_id: cached.id }),
        ]);
      }
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': cached.url, 'Cache-Control': 'private, no-cache, no-store, must-revalidate', 'X-Robots-Tag': 'noindex' },
      });
    }

    // DB lookup
    let query = supabase
      .from('url_mappings')
      .select('id, original_url, is_active, expires_at, user_tracking')
      .eq('short_code', shortCode);

    if (header) {
      query = query.eq('header', header.toUpperCase());
    } else {
      query = query.is('header', null);
    }

    const { data: mapping, error } = await query.maybeSingle();

    let finalMapping = mapping;
    if (!mapping && !header && !error) {
      const { data: anyMapping } = await supabase
        .from('url_mappings')
        .select('id, original_url, is_active, expires_at, user_tracking')
        .eq('short_code', shortCode)
        .limit(1)
        .maybeSingle();
      finalMapping = anyMapping;
    }

    if (error) {
      return new Response('{"error":"Database error"}', { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!finalMapping) {
      return new Response('{"error":"Not found"}', { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!finalMapping.is_active) {
      return new Response('{"error":"Inactive"}', { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (finalMapping.expires_at && new Date(finalMapping.expires_at) < new Date()) {
      return new Response('{"error":"Expired"}', { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Cache the result
    cache.set(cacheKey, { url: finalMapping.original_url, id: finalMapping.id, tracking: finalMapping.user_tracking !== false, ts: now });
    // Evict old entries periodically
    if (cache.size > 500) {
      for (const [k, v] of cache) {
        if (now - v.ts > CACHE_TTL) cache.delete(k);
      }
    }

    // Fire-and-forget tracking
    if (finalMapping.user_tracking !== false) {
      const userAgent = req.headers.get('user-agent');
      const referrer = req.headers.get('referer');
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
      const { browser, os, device_type } = parseUserAgent(userAgent);
      Promise.allSettled([
        supabase.from('url_clicks').insert({ url_id: finalMapping.id, user_agent: userAgent, referrer, ip_address: ip, browser, os, device_type }),
        supabase.rpc('increment_url_clicks', { p_url_id: finalMapping.id }),
      ]);
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': finalMapping.original_url, 'Cache-Control': 'private, no-cache, no-store, must-revalidate', 'X-Robots-Tag': 'noindex' },
    });
  } catch (_error) {
    return new Response('{"error":"Internal error"}', { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
