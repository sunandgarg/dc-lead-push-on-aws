import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables that get purged when cache cleanup runs.
const TABLES = ["api_logs", "leads", "upload_batches"];

// EXPLICITLY PROTECTED - never touched by purge so cumulative analytics survive.
const PROTECTED_STATS_TABLES = [
  "lead_push_daily_stats",
  "lead_push_cumulative_stats",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { university_id, days } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = days > 0 ? new Date(Date.now() - days * 86400000).toISOString() : null;
    const results: Record<string, number | string> = {};

    for (const t of TABLES) {
      // Defensive guard - never purge stats even if config drifts.
      if (PROTECTED_STATS_TABLES.includes(t)) {
        results[t] = "skipped (protected stats table)";
        continue;
      }
      let q = supabase.from(t).delete({ count: "exact" });
      if (cutoff) q = q.lt("created_at", cutoff);
      else q = q.gte("created_at", "1970-01-01T00:00:00Z");
      if (university_id && university_id !== "__all__") q = q.eq("university_id", university_id);
      const { count, error } = await q;
      results[t] = error ? `error: ${error.message}` : count || 0;
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        preserved: PROTECTED_STATS_TABLES,
        note: "Lead push stats (daily + cumulative) are preserved and never purged.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
