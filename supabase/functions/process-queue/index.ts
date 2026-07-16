import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simplified process-queue: only checks batch status and marks complete
// All lead processing is now handled by the frontend calling process-lead directly
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody: Record<string, unknown> = {};
    if (req.method !== "GET") {
      try {
        requestBody = await req.json();
      } catch {
        requestBody = {};
      }
    }

    const requestedBatchId = typeof requestBody.batchId === "string" ? requestBody.batchId : null;

    // Find active batches and check if they should be marked complete
    let query = supabase
      .from("upload_batches")
      .select("id, total_leads, success_count, fail_count, duplicate_count, status, is_paused, is_cancelled")
      .eq("status", "processing")
      .limit(50);

    if (requestedBatchId) query = query.eq("id", requestedBatchId);

    const { data: batches, error } = await query;

    if (error || !batches?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No active batches", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let updated = 0;

    for (const batch of batches) {
      const processed = (batch.success_count || 0) + (batch.fail_count || 0) + (batch.duplicate_count || 0);
      const total = batch.total_leads || 0;

      // Update processed_count
      await supabase
        .from("upload_batches")
        .update({ processed_count: processed, current_lead_index: processed })
        .eq("id", batch.id);

      // Mark complete if all leads are processed
      if (processed >= total && total > 0 && !batch.is_paused && !batch.is_cancelled) {
        await supabase
          .from("upload_batches")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", batch.id);
        updated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated, checked: batches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Queue processor error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
