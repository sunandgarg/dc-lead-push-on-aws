import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const universityId = url.searchParams.get('university_id');
    const body = await req.json();
    console.log('Received Google Ads webhook:', JSON.stringify(body));

    const leads: Record<string, any>[] = [];

    // Native Google Ads Lead Form Extension format
    if (body.leadFormSubmission) {
      const submission = body.leadFormSubmission;
      const lead: Record<string, any> = {
        lead_source: 'Google Lead Ads',
        lead_medium: 'paid',
        lead_campaign: submission.campaignName || body.campaignName || 'Google Campaign',
      };

      const userColumns = submission.userData?.userColumnData || [];
      for (const column of userColumns) {
        const name = column.columnName?.toLowerCase();
        const value = column.stringValue;
        if (name?.includes('email')) lead.email = value;
        else if (name?.includes('phone')) lead.mobile = value;
        else if (name?.includes('name')) lead.name = value;
        else if (name?.includes('city')) lead.city = value;
        else if (name?.includes('state')) lead.state = value;
        else if (name?.includes('course') || name?.includes('program')) lead.course = value;
        else lead[name] = value;
      }
      leads.push(lead);
    } else if (body.entries || body.leads) {
      // Zapier/webhook aggregator format
      const entries = body.entries || body.leads || [body];
      for (const entry of entries) {
        leads.push({
          name: entry.name || entry.full_name || entry.first_name || 'Google Lead',
          email: entry.email || entry.email_address,
          mobile: entry.phone || entry.mobile || entry.phone_number,
          lead_source: 'Google Lead Ads',
          lead_medium: 'paid',
          lead_campaign: entry.campaign_name || entry.campaign || 'Google Campaign',
          city: entry.city,
          state: entry.state,
          course: entry.course || entry.program || entry.interest,
        });
      }
    } else {
      // Flat JSON format
      leads.push({
        name: body.name || body.full_name || body.first_name || 'Google Lead',
        email: body.email || body.email_address,
        mobile: body.phone || body.mobile || body.phone_number,
        lead_source: body.source || 'Google Lead Ads',
        lead_medium: body.medium || 'paid',
        lead_campaign: body.campaign_name || body.campaign || 'Google Campaign',
        city: body.city,
        state: body.state,
        course: body.course || body.program,
      });
    }

    // Save to leads table if university_id provided
    if (universityId && leads.length > 0) {
      const { data: batch } = await supabase
        .from('upload_batches')
        .insert({
          university_id: universityId,
          file_name: `Google_Ads_${new Date().toISOString()}`,
          total_leads: leads.length,
          status: 'processing',
        })
        .select()
        .single();

      if (batch) {
        const { data: uni } = await supabase
          .from('universities')
          .select('default_values, source, medium, campaign')
          .eq('id', universityId)
          .single();

        const defaults = (uni?.default_values as Record<string, string>) || {};

        for (const lead of leads) {
          await supabase.from('leads').insert({
            university_id: universityId,
            batch_id: batch.id,
            name: lead.name || defaults.name || 'Google Lead',
            email: lead.email || defaults.email || '',
            mobile: lead.mobile || defaults.mobile || '',
            city: lead.city || defaults.city || '',
            state: lead.state || defaults.state || '',
            course: lead.course || defaults.course || '',
            lead_source: lead.lead_source || uni?.source || 'Google Lead Ads',
            lead_medium: lead.lead_medium || uni?.medium || 'paid',
            lead_campaign: lead.lead_campaign || uni?.campaign || 'Google Campaign',
            status: 'pending',
          });
        }

        // Trigger processing
        await supabase.functions.invoke('process-queue', {
          body: { batchId: batch.id, universityId },
        });
      }
    }

    // Log
    await supabase.from('api_logs').insert({
      status: 'Success',
      source: 'Google Lead Ads',
      trigger_point: 'Google Webhook',
      response: `Received ${leads.length} leads`,
      lead_data: body,
      university_id: universityId || '00000000-0000-0000-0000-000000000000',
    });

    return new Response(
      JSON.stringify({ success: true, leads_received: leads.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Google webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
