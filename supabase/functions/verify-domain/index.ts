import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { domainId, domain, token } = await req.json();

    if (!domainId || !domain || !token) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', verified: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the domain belongs to the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', verified: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', verified: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check domain belongs to user
    const { data: domainRecord, error: domainError } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', domainId)
      .eq('user_id', user.id)
      .single();

    if (domainError || !domainRecord) {
      return new Response(
        JSON.stringify({ error: 'Domain not found', verified: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform DNS TXT record verification
    let txtVerified = false;
    let cnameVerified = false;
    const verifyHost = `_verify.${domain}`;

    try {
      // Check TXT record using DNS over HTTPS (Google Public DNS)
      const txtResponse = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(verifyHost)}&type=TXT`
      );
      const txtData = await txtResponse.json();
      
      console.log(`[verify-domain] TXT lookup for ${verifyHost}:`, JSON.stringify(txtData));

      if (txtData.Answer) {
        for (const answer of txtData.Answer) {
          // TXT records come with quotes
          const value = (answer.data || '').replace(/"/g, '').trim();
          if (value === token) {
            txtVerified = true;
            break;
          }
        }
      }
    } catch (dnsError) {
      console.error('[verify-domain] TXT DNS lookup error:', dnsError);
    }

    try {
      // Check CNAME record
      const cnameResponse = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=CNAME`
      );
      const cnameData = await cnameResponse.json();
      
      console.log(`[verify-domain] CNAME lookup for ${domain}:`, JSON.stringify(cnameData));

      if (cnameData.Answer) {
        cnameVerified = true; // CNAME exists, good enough
      }

      // Also check A record as alternative
      if (!cnameVerified) {
        const aResponse = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`
        );
        const aData = await aResponse.json();
        if (aData.Answer) {
          cnameVerified = true; // A record exists pointing somewhere
        }
      }
    } catch (dnsError) {
      console.error('[verify-domain] CNAME/A DNS lookup error:', dnsError);
    }

    const verified = txtVerified;

    if (verified) {
      // Update domain status
      await supabase
        .from('custom_domains')
        .update({
          status: 'verified',
          verified_at: new Date().toISOString(),
          ssl_status: cnameVerified ? 'active' : 'pending',
          dns_config: {
            ...((domainRecord as any).dns_config || {}),
            txt_verified: true,
            cname_verified: cnameVerified,
            verified_at: new Date().toISOString(),
          },
        })
        .eq('id', domainId);

      return new Response(
        JSON.stringify({ 
          verified: true, 
          cname_configured: cnameVerified,
          message: 'Domain verified successfully!' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const issues: string[] = [];
      if (!txtVerified) issues.push(`TXT record not found at ${verifyHost} with value "${token}"`);
      if (!cnameVerified) issues.push(`No CNAME or A record found for ${domain}`);

      return new Response(
        JSON.stringify({ 
          verified: false,
          txt_found: txtVerified,
          cname_found: cnameVerified,
          message: `Verification failed: ${issues.join('. ')}. DNS can take up to 48 hours to propagate.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('[verify-domain] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', verified: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
