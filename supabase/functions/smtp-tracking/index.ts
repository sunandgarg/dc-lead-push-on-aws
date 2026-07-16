import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Reuse client across warm starts
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Pre-compute the 1x1 transparent GIF
const TRANSPARENT_GIF = Uint8Array.from(
  atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  c => c.charCodeAt(0)
);

const GIF_HEADERS = {
  'Content-Type': 'image/gif',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  ...corsHeaders,
};

function parseClientInfo(req: Request) {
  const userAgent = req.headers.get('user-agent') || '';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
             req.headers.get('x-real-ip') || 'unknown';
  const deviceType = /mobile|android|iphone/i.test(userAgent) ? 'mobile' :
                     /tablet|ipad/i.test(userAgent) ? 'tablet' : 'desktop';
  let emailClient = 'Unknown';
  if (/gmail/i.test(userAgent)) emailClient = 'Gmail';
  else if (/outlook|microsoft/i.test(userAgent)) emailClient = 'Outlook';
  else if (/apple|webkit.*mail/i.test(userAgent)) emailClient = 'Apple Mail';
  else if (/yahoo/i.test(userAgent)) emailClient = 'Yahoo Mail';
  else if (/thunderbird/i.test(userAgent)) emailClient = 'Thunderbird';
  return { userAgent, ip, deviceType, emailClient };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[1];
    const trackingId = pathParts[2];

    if (!action || !trackingId) {
      return new Response('Invalid tracking URL', { status: 400 });
    }

    const { userAgent, ip, deviceType, emailClient } = parseClientInfo(req);

    if (action === 'open') {
      // Uses idx_smtp_email_logs_tracking_pixel index
      const { data: emailLog } = await supabase
        .from('smtp_email_logs')
        .select('id, total_opens, first_opened_at')
        .eq('tracking_pixel_id', trackingId)
        .single();

      if (!emailLog) {
        return new Response(TRANSPARENT_GIF, { headers: GIF_HEADERS });
      }

      const now = new Date().toISOString();

      // Fire-and-forget parallel DB updates
      Promise.allSettled([
        supabase.from('smtp_email_logs').update({
          status: 'opened',
          first_opened_at: emailLog.first_opened_at || now,
          last_opened_at: now,
          total_opens: (emailLog.total_opens || 0) + 1,
        }).eq('id', emailLog.id),
        supabase.from('smtp_tracking_events').insert({
          email_log_id: emailLog.id, event_type: 'opened',
          ip_address: ip, user_agent: userAgent,
          device_type: deviceType, email_client: emailClient,
        }),
      ]);

      return new Response(TRANSPARENT_GIF, { headers: GIF_HEADERS });

    } else if (action === 'click') {
      // Uses idx_smtp_links_tracking_code index
      const { data: link } = await supabase
        .from('smtp_links')
        .select('id, original_url, campaign_id, click_count')
        .eq('tracking_code', trackingId)
        .single();

      if (!link) {
        return new Response('Link not found', { status: 404 });
      }

      const emailLogId = url.searchParams.get('e');

      // All DB writes fire-and-forget - don't block the redirect
      const dbOps: Promise<unknown>[] = [
        supabase.from('smtp_links').update({ click_count: (link.click_count || 0) + 1 }).eq('id', link.id),
        supabase.from('smtp_link_clicks').insert({
          link_id: link.id, email_log_id: emailLogId || undefined,
          ip_address: ip, user_agent: userAgent, device_type: deviceType,
        }),
      ];

      if (emailLogId) {
        dbOps.push(
          supabase.from('smtp_email_logs')
            .select('id, total_clicks, first_clicked_at')
            .eq('id', emailLogId)
            .single()
            .then(({ data: emailLog }) => {
              if (!emailLog) return;
              return Promise.allSettled([
                supabase.from('smtp_email_logs').update({
                  status: 'clicked',
                  first_clicked_at: emailLog.first_clicked_at || new Date().toISOString(),
                  total_clicks: (emailLog.total_clicks || 0) + 1,
                }).eq('id', emailLog.id),
                supabase.from('smtp_tracking_events').insert({
                  email_log_id: emailLog.id, event_type: 'clicked',
                  ip_address: ip, user_agent: userAgent,
                  device_type: deviceType, email_client: emailClient,
                  link_url: link.original_url, link_id: link.id,
                }),
              ]);
            })
        );
      }

      // Don't await - redirect immediately
      Promise.allSettled(dbOps);

      return new Response(null, {
        status: 302,
        headers: { 'Location': link.original_url, ...corsHeaders },
      });
    }

    return new Response('Invalid action', { status: 400 });
  } catch (error) {
    if (req.url.includes('/open/')) {
      return new Response(TRANSPARENT_GIF, { headers: GIF_HEADERS });
    }
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
