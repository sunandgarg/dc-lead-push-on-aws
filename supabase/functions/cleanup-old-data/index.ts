import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const RETENTION_HOURS = 72;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();
    const results: Record<string, number> = {};

    // 1. Delete old api_logs (most space-consuming)
    const { count: logsDeleted } = await supabase
      .from('api_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff);
    results.api_logs_deleted = logsDeleted || 0;

    // 2. Delete old leads (keeps batch metadata)
    const { count: leadsDeleted } = await supabase
      .from('leads')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff);
    results.leads_deleted = leadsDeleted || 0;

    // 3. Null out csv_data from old batches (keep the batch record for history)
    const { count: batchesCleaned } = await supabase
      .from('upload_batches')
      .update({ csv_data: null })
      .lt('created_at', cutoff)
      .not('csv_data', 'is', null);
    results.batches_csv_cleaned = batchesCleaned || 0;

    // 4. Delete old CRM activity logs
    const { count: crmLogsDeleted } = await supabase
      .from('crm_activities')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff);
    results.crm_logs_deleted = crmLogsDeleted || 0;

    console.log(`[Cleanup] Purged data older than ${RETENTION_HOURS}h:`, results);

    return new Response(
      JSON.stringify({ success: true, cutoff, retention_hours: RETENTION_HOURS, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
