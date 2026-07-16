import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables we never touch (managed by Supabase / auth / internal)
const SKIP_TABLES = new Set<string>([
  "schema_migrations",
]);

async function discoverTables(supabase: any): Promise<string[]> {
  // Use pg meta via RPC-less approach: query information_schema through PostgREST is not possible,
  // so we maintain via SQL through the `pg_meta` style - instead use a known RPC if present, else fallback.
  // Simplest: call a SQL function. We will use rest endpoint with a raw query via service role is unavailable,
  // so we keep a comprehensive hardcoded list AND auto-detect by probing.
  const KNOWN = [
    "ab_test_results","api_logs","app_settings","automation_logs","automation_rules",
    "campaign_kpis","campaign_recipients","communication_logs","course_specializations",
    "crm_activities","crm_contacts","crm_tasks","custom_column_values","custom_columns",
    "custom_domains","dlt_entities","email_api_settings","email_campaigns","email_events",
    "email_logs","email_recipients","email_templates","feature_toggles","form_submissions",
    "funnel_campaign_contacts","funnel_campaigns","landing_pages","lead_assignment_history",
    "lead_assignment_rules","lead_capture_forms","lead_events","lead_preferences",
    "lead_push_cumulative_stats","lead_push_daily_stats",
    "lead_score_history","lead_scoring_rules","lead_segment_members","lead_segments",
    "leads","marketing_campaigns","marketing_custom_integrations","marketing_integrations",
    "marketing_leads","marketing_list_contacts","marketing_lists","marketing_sequence_steps",
    "marketing_sequences","marketing_templates","marketing_unsubscribes","marketing_workflows",
    "multi_push_presets","multi_push_university_defaults","pipeline_stages","profiles",
    "programs","sequence_enrollments","sequence_step_executions","smtp_campaigns",
    "smtp_config","smtp_domains","smtp_email_logs","smtp_link_clicks","smtp_links",
    "smtp_suppression_list","smtp_templates","smtp_tracking_events","state_cities",
    "team_members","template_versions","ui_drafts","universities","university_api_keys",
    "upload_batches","url_api_keys","url_bulk_imports","url_clicks","url_mappings",
    "user_permissions","user_roles","workflow_executions",
  ];
  return KNOWN.filter((t) => !SKIP_TABLES.has(t));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "export";

    if (action === "export") {
      const tables: string[] = body.tables?.length ? body.tables : await discoverTables(supabase);
      const dump: Record<string, any[]> = {};
      const errors: Record<string, string> = {};
      const counts: Record<string, number> = {};
      const PAGE = 1000;
      for (const t of tables) {
        const rows: any[] = [];
        let from = 0;
        let failed = false;
        while (true) {
          const { data, error } = await supabase.from(t).select("*").range(from, from + PAGE - 1);
          if (error) {
            errors[t] = error.message;
            failed = true;
            break;
          }
          if (!data || data.length === 0) break;
          rows.push(...data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        if (!failed) {
          dump[t] = rows;
          counts[t] = rows.length;
        }
      }
      return new Response(
        JSON.stringify({
          exported_at: new Date().toISOString(),
          version: 2,
          table_count: Object.keys(dump).length,
          total_rows: Object.values(counts).reduce((a, b) => a + b, 0),
          counts,
          tables: dump,
          errors,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "import") {
      const data = body.data?.tables || body.tables;
      if (!data || typeof data !== "object") {
        return new Response(
          JSON.stringify({ success: false, error: "Missing tables data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const mode = body.mode || "upsert"; // upsert | insert | replace
      const onlyTables: string[] | undefined = body.only_tables;
      const results: Record<string, any> = {};
      const CHUNK = 500;

      for (const [table, rows] of Object.entries(data as Record<string, any[]>)) {
        if (onlyTables && !onlyTables.includes(table)) continue;
        if (SKIP_TABLES.has(table)) { results[table] = { skipped: true }; continue; }
        if (!Array.isArray(rows)) { results[table] = { error: "not an array" }; continue; }
        if (rows.length === 0) { results[table] = { inserted: 0 }; continue; }

        try {
          if (mode === "replace") {
            // Universal delete: use neq on id (uuid). If table has no id, fall back to truncate-like approach.
            const sample = rows[0] || {};
            if ("id" in sample) {
              const { error: delErr } = await supabase
                .from(table)
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");
              if (delErr) {
                // try another universal filter
                await supabase.from(table).delete().not("id", "is", null);
              }
            } else {
              // best-effort delete all using a column we expect
              const key = Object.keys(sample)[0];
              if (key) await supabase.from(table).delete().not(key, "is", null);
            }
          }

          let inserted = 0;
          let lastErr: string | undefined;
          for (let i = 0; i < rows.length; i += CHUNK) {
            const chunk = rows.slice(i, i + CHUNK);
            const q = mode === "insert"
              ? supabase.from(table).insert(chunk)
              : supabase.from(table).upsert(chunk, { onConflict: "id", ignoreDuplicates: false });
            const { error } = await q;
            if (error) {
              lastErr = error.message;
              // try row-by-row to skip broken rows
              for (const row of chunk) {
                const single = mode === "insert"
                  ? supabase.from(table).insert(row)
                  : supabase.from(table).upsert(row, { onConflict: "id" });
                const { error: e2 } = await single;
                if (!e2) inserted++;
              }
            } else {
              inserted += chunk.length;
            }
          }
          results[table] = lastErr ? { inserted, partial_error: lastErr, total: rows.length } : { inserted };
        } catch (e: any) {
          results[table] = { error: String(e?.message || e) };
        }
      }

      const ok = Object.values(results).filter((r: any) => r && !r.error && !r.partial_error).length;
      const failed = Object.values(results).filter((r: any) => r && r.error).length;
      const partial = Object.values(results).filter((r: any) => r && r.partial_error).length;

      return new Response(
        JSON.stringify({ success: failed === 0, summary: { ok, failed, partial }, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use 'export' or 'import'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
