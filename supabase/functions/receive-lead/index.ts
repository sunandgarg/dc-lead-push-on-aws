import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Reuse client across warm starts
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseReused = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadPayload {
  university_id: string;
  api_key: string;
  name: string;
  email: string;
  mobile: string;
  course?: string;
  specialization?: string;
  city?: string;
  state?: string;
  address?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  [key: string]: string | undefined;
}

// Check if a lead matches automation rule conditions
function matchesConditions(lead: Record<string, string>, conditions: any[]): boolean {
  if (!conditions || conditions.length === 0) return false;

  let result = true;
  for (let i = 0; i < conditions.length; i++) {
    const c = conditions[i];
    const fieldMap: Record<string, string> = {
      City: "city",
      State: "state",
      Course: "course",
      Specialization: "specialization",
      Source: "source",
      "Campaign Name": "campaign",
      Mobile: "mobile",
      Email: "email",
    };
    const fieldKey = fieldMap[c.field] || c.field.toLowerCase();
    const leadVal = (lead[fieldKey] || "").toLowerCase();
    const condVal = (c.value || "").toLowerCase();

    let matches = false;
    switch (c.operator) {
      case "is":
        matches = leadVal === condVal;
        break;
      case "is not":
        matches = leadVal !== condVal;
        break;
      case "contains":
        matches = leadVal.includes(condVal);
        break;
      case "does not contain":
        matches = !leadVal.includes(condVal);
        break;
      case "starts with":
        matches = leadVal.startsWith(condVal);
        break;
      case "is empty":
        matches = !leadVal.trim();
        break;
      case "is not empty":
        matches = !!leadVal.trim();
        break;
      default:
        matches = false;
    }

    if (i === 0) {
      result = matches;
    } else {
      if (c.logic === "OR") result = result || matches;
      else result = result && matches;
    }
  }
  return result;
}

async function handleLandingPagePush(
  supabase: any,
  apiKey: string,
  payload: Record<string, any>,
): Promise<{ status: number; body: any }> {
  // Required fields
  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim();
  const mobile = String(payload.mobile || payload.phone || "").trim();
  if (!name || !email || !mobile) {
    return { status: 400, body: { success: false, error: "Missing required fields: name, email, mobile" } };
  }

  // Lookup landing page by key
  const { data: lp, error: lpErr } = await supabase
    .from("landing_pages")
    .select("id, name, routing_mode, university_ids, preset_id, default_values, is_active")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (lpErr || !lp) return { status: 401, body: { success: false, error: "Invalid landing page api_key" } };
  if (!lp.is_active) return { status: 403, body: { success: false, error: "Landing page is inactive" } };

  // Resolve target university IDs
  let universityIds: string[] = Array.isArray(lp.university_ids) ? lp.university_ids : [];
  if (lp.routing_mode === "preset" && lp.preset_id) {
    const { data: preset } = await supabase
      .from("multi_push_presets")
      .select("university_ids")
      .eq("id", lp.preset_id)
      .maybeSingle();
    universityIds = Array.isArray(preset?.university_ids) ? preset.university_ids : [];
  }
  if (!universityIds.length) {
    return { status: 400, body: { success: false, error: "Landing page has no universities configured" } };
  }

  // Fetch all target universities
  const { data: unis } = await supabase
    .from("universities")
    .select("*")
    .in("id", universityIds);
  if (!unis || !unis.length) return { status: 404, body: { success: false, error: "No matching universities" } };

  const lpDefaults =
    lp.default_values && typeof lp.default_values === "object" ? (lp.default_values as Record<string, string>) : {};

  // Build merged lead data: payload (whatever the landing page sent) + landing-page defaults
  const baseLead: Record<string, string> = {};
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && typeof v !== "object") baseLead[k] = String(v);
  });
  Object.entries(lpDefaults).forEach(([k, v]) => {
    if (v && !baseLead[k]?.trim()) baseLead[k] = String(v);
  });
  baseLead.name = name;
  baseLead.email = email;
  baseLead.mobile = mobile;

  // Create one batch per university for reporting
  const batchByUni: Record<string, string> = {};
  await Promise.all(
    unis.map(async (uni: any) => {
      const { data: batch } = await supabase
        .from("upload_batches")
        .insert({
          university_id: uni.id,
          file_name: `LandingPage: ${lp.name}`,
          total_leads: 1,
          status: "processing",
        })
        .select("id")
        .single();
      if (batch) batchByUni[uni.id] = batch.id;
    }),
  );

  // Fan-out: invoke process-lead per university in parallel and wait for all
  const supabaseUrlEnv = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const results = await Promise.all(
    unis.map(async (uni: any) => {
      try {
        const universityDefaults =
          uni.default_values && typeof uni.default_values === "object" ? uni.default_values : {};

        const apiConfig = {
          apiUrl: uni.api_url,
          secretKey: uni.secret_key,
          collegeId: uni.college_id,
          source: uni.source,
          medium: uni.medium,
          campaign: uni.campaign,
          apiType: uni.api_type || "generic",
          columnMapping: uni.column_mapping || {},
          customColumnMapping: {},
          payloadWrapper: uni.payload_wrapper,
          authType: uni.auth_type,
          authHeaderKey: uni.auth_header_key,
          authHeaderValue: uni.auth_header_value,
          customHeaders: uni.custom_headers,
          universityDefaults,
        };

        const leadData = {
          ...baseLead,
          leadSource: baseLead.source || baseLead.leadSource || uni.source || "",
          leadMedium: baseLead.medium || baseLead.leadMedium || uni.medium || "",
          leadCampaign: baseLead.campaign || baseLead.leadCampaign || uni.campaign || "",
        };

        const res = await fetch(`${supabaseUrlEnv}/functions/v1/process-lead`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ batchId: batchByUni[uni.id], leadData, apiConfig }),
        });
        const json = await res.json().catch(() => ({}));
        return {
          university_id: uni.id,
          university_name: uni.name,
          status: String(json?.status || "Fail").toLowerCase(),
          response: json?.response || "",
        };
      } catch (err) {
        return { university_id: uni.id, university_name: uni.name, status: "fail", response: String(err) };
      }
    }),
  );

  // Mark batches complete
  await Promise.all(
    Object.values(batchByUni).map((bid) =>
      supabase
        .from("upload_batches")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", bid),
    ),
  );

  // Increment landing page counter
  await supabase.rpc("increment_landing_page_submission", { lp_id: lp.id }).catch(() => {});

  const successCount = results.filter((r) => r.status === "success").length;
  const duplicateCount = results.filter((r) => r.status === "duplicate").length;
  const failCount = results.length - successCount - duplicateCount;

  return {
    status: 200,
    body: {
      success: successCount > 0 || duplicateCount > 0,
      landing_page: lp.name,
      pushed_to: results.length,
      success_count: successCount,
      duplicate_count: duplicateCount,
      fail_count: failCount,
      results,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = supabaseReused;

    const payload = (await req.json()) as LeadPayload;
    console.log("Received lead payload:", JSON.stringify(payload));

    // ====== Landing-Page mode: fan out to N universities ======
    // Accepts key via Authorization: Bearer <key>, or payload.landing_page_key, or payload.api_key (when university_id is missing)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const bearerKey = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    const landingKey =
      (payload as any).landing_page_key ||
      bearerKey ||
      (!payload.university_id && payload.api_key ? payload.api_key : "");

    if (landingKey) {
      const lpResult = await handleLandingPagePush(supabase, landingKey, payload);
      return new Response(JSON.stringify(lpResult.body), {
        status: lpResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields (legacy per-university api_key mode)
    if (!payload.university_id || !payload.api_key) {
      return new Response(JSON.stringify({ success: false, error: "Missing university_id or api_key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payload.name || !payload.email || !payload.mobile) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields: name, email, mobile" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("university_api_keys")
      .select("id, university_id, request_count")
      .eq("api_key", payload.api_key)
      .eq("university_id", payload.university_id)
      .eq("is_active", true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(JSON.stringify({ success: false, error: "Invalid API key or university_id" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update API key usage
    await supabase
      .from("university_api_keys")
      .update({ last_used_at: new Date().toISOString(), request_count: (apiKeyData.request_count || 0) + 1 })
      .eq("id", apiKeyData.id);

    // Get university config
    const { data: university, error: uniError } = await supabase
      .from("universities")
      .select("*")
      .eq("id", payload.university_id)
      .single();

    if (uniError || !university) {
      return new Response(JSON.stringify({ success: false, error: "University not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check automation rules
    const { data: automationRules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("status", "Active")
      .order("priority", { ascending: true });

    const leadDataForMatching: Record<string, string> = {
      name: payload.name,
      email: payload.email,
      mobile: payload.mobile,
      course: payload.course || "",
      specialization: payload.specialization || "",
      city: payload.city || "",
      state: payload.state || "",
      source: payload.source || "",
      campaign: payload.campaign || "",
    };

    let matchedRuleId: string | null = null;
    let matchedRuleName: string | null = null;
    if (automationRules) {
      for (const rule of automationRules) {
        const conditions = rule.conditions as any[];
        if (matchesConditions(leadDataForMatching, conditions)) {
          matchedRuleId = rule.id;
          matchedRuleName = rule.name;
          const ruleActions = rule.actions as any[];
          for (const action of ruleActions) {
            if (action.type === "set_default" && action.field && action.value) {
              if (!leadDataForMatching[action.field]?.trim()) {
                leadDataForMatching[action.field] = action.value;
              }
            }
          }
          await supabase.rpc("increment_automation_triggered", { rule_uuid: rule.id });
          break;
        }
      }
    }

    // Apply university-level defaults
    const uniDefaults =
      typeof university.default_values === "object" ? (university.default_values as Record<string, string>) : {};
    Object.entries(uniDefaults).forEach(([key, val]) => {
      if (val && !leadDataForMatching[key]?.trim()) {
        leadDataForMatching[key] = val;
      }
    });

    // Create batch
    const { data: batch, error: batchError } = await supabase
      .from("upload_batches")
      .insert({
        university_id: payload.university_id,
        file_name: `API_${new Date().toISOString()}`,
        total_leads: 1,
        status: "processing",
      })
      .select()
      .single();

    if (batchError) {
      return new Response(JSON.stringify({ success: false, error: "Failed to create batch" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        university_id: payload.university_id,
        batch_id: batch.id,
        name: leadDataForMatching.name,
        email: leadDataForMatching.email,
        mobile: leadDataForMatching.mobile,
        course: leadDataForMatching.course,
        specialization: leadDataForMatching.specialization,
        city: leadDataForMatching.city,
        state: leadDataForMatching.state,
        address: payload.address || "",
        lead_source: leadDataForMatching.source || university.source,
        lead_medium: payload.medium || university.medium,
        lead_campaign: leadDataForMatching.campaign || university.campaign,
        status: "pending",
      })
      .select()
      .single();

    if (leadError) {
      return new Response(JSON.stringify({ success: false, error: "Failed to insert lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build API payload
    const columnMapping = typeof university.column_mapping === "object" ? university.column_mapping : {};
    const staticFields: Record<string, string> = {};
    const fixedDefaults: Record<string, string> = {};

    Object.entries(columnMapping).forEach(([key, value]) => {
      if (key.startsWith("__static_") && typeof value === "string") {
        staticFields[key.replace("__static_", "")] = value;
      } else if (key.startsWith("__fixed_") && typeof value === "string") {
        fixedDefaults[key.replace("__fixed_", "")] = value;
      }
    });

    Object.entries(fixedDefaults).forEach(([key, val]) => {
      if (!leadDataForMatching[key]?.trim()) leadDataForMatching[key] = val;
    });

    let apiPayload: unknown;
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (university.auth_type === "bearer" && university.auth_header_value) {
      headers["Authorization"] = `Bearer ${university.auth_header_value}`;
    } else if (university.auth_type === "custom_header" && university.auth_header_key && university.auth_header_value) {
      headers[university.auth_header_key] = university.auth_header_value;
    }
    if (university.custom_headers && typeof university.custom_headers === "object") {
      Object.entries(university.custom_headers as Record<string, string>).forEach(([k, v]) => {
        if (k && v) headers[k] = v;
      });
    }

    if (university.api_type === "leadsquared") {
      const lsPayload: Record<string, string> = {};
      Object.entries(leadDataForMatching)
        .filter(([_, v]) => v)
        .forEach(([key, value]) => {
          lsPayload[(columnMapping[key] as string) || key] = value;
        });

      const sourceValue = lsPayload.leadSource || lsPayload.source || "";
      const mediumValue = lsPayload.leadMedium || lsPayload.medium || "";
      const campaignValue = lsPayload.leadCampaign || lsPayload.campaign || "";

      delete lsPayload.source;
      delete lsPayload.medium;
      delete lsPayload.campaign;

      if (sourceValue) lsPayload.leadSource = sourceValue;
      if (mediumValue) lsPayload.leadMedium = mediumValue;
      if (campaignValue) lsPayload.leadCampaign = campaignValue;

      const lsEntries = Object.entries(lsPayload).map(([key, value]) => ({ Attribute: key, Value: value }));
      Object.entries(staticFields).forEach(([key, value]) => {
        if (value) lsEntries.push({ Attribute: key, Value: value });
      });
      apiPayload = lsEntries;
    } else {
      const formData: Record<string, string> = {};
      Object.entries(leadDataForMatching).forEach(([key, value]) => {
        if (value) {
          const mappedKey = typeof columnMapping[key] === "string" ? columnMapping[key] : key;
          formData[mappedKey] = value;
        }
      });
      formData[(columnMapping["medium"] as string) || "medium"] = payload.medium || university.medium;
      formData[(columnMapping["campaign"] as string) || "campaign"] =
        leadDataForMatching.campaign || university.campaign;
      if (university.college_id) formData.college_id = university.college_id;
      formData[(columnMapping["source"] as string) || "source"] = leadDataForMatching.source || university.source;
      if (university.secret_key) formData.secret_key = university.secret_key;
      Object.entries(staticFields).forEach(([key, value]) => {
        formData[key] = value;
      });
      apiPayload = university.payload_wrapper === "array" ? [formData] : formData;
    }

    let status: "Success" | "Fail" = "Fail";
    let responseBody = "";

    try {
      const apiResponse = await fetch(university.api_url, {
        method: "POST",
        headers,
        body: JSON.stringify(apiPayload),
      });
      responseBody = await apiResponse.text();

      if (apiResponse.ok) {
        try {
          const jr = JSON.parse(responseBody);
          const rs = responseBody.toLowerCase();
          const s = String(jr.status || "").toLowerCase();
          const r = String(jr.result || jr.Result || "").toLowerCase();

          const isDup =
            rs.includes("duplicate") ||
            rs.includes("already exist") ||
            rs.includes("already registered") ||
            rs.includes("already present") ||
            jr.errorCode === "DUPLICATE" ||
            jr.error_code === "duplicate" ||
            s === "duplicate";

          if (isDup) {
            status = "Duplicate" as any;
          } else if (
            s === "success" ||
            jr.success === true ||
            jr.IsCreated === true ||
            r === "success" ||
            jr.message === "1"
          ) {
            status = "Success";
          } else {
            const errMsg = String(jr.error || jr.message || jr.Message || "").toLowerCase();
            if (errMsg.includes("duplicate") || errMsg.includes("already exist")) {
              status = "Duplicate" as any;
            }
          }
        } catch {
          /* not JSON */
        }
      } else {
        const rs = responseBody.toLowerCase();
        if (apiResponse.status === 409 || rs.includes("duplicate") || rs.includes("already exist")) {
          status = "Duplicate" as any;
        }
      }
    } catch (fetchError) {
      console.error("API call failed:", fetchError);
      responseBody = JSON.stringify({ error: String(fetchError) });
    }

    // Update lead + batch - NO API LOG INSERTION
    // Duplicates count as "success" for batch tracking
    await Promise.allSettled([
      supabase
        .from("leads")
        .update({ status, api_response: responseBody, processed_at: new Date().toISOString() })
        .eq("id", lead.id),
      status === "Success" || status === "Duplicate"
        ? supabase.rpc("increment_batch_success", { batch_uuid: batch.id })
        : supabase.rpc("increment_batch_fail", { batch_uuid: batch.id }),
      supabase
        .from("upload_batches")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", batch.id),
    ]);

    // Log automation result if matched
    if (matchedRuleId) {
      if (status === "Success") await supabase.rpc("increment_automation_success", { rule_uuid: matchedRuleId });
      else await supabase.rpc("increment_automation_fail", { rule_uuid: matchedRuleId });

      await supabase.from("automation_logs").insert({
        rule_id: matchedRuleId,
        lead_name: payload.name,
        rule_name: matchedRuleName,
        university_name: university.name,
        result: status,
        fail_reason: status === "Fail" ? responseBody.slice(0, 200) : "",
        lead_data: leadDataForMatching,
      });
    }

    return new Response(
      JSON.stringify({
        success: status === "Success",
        status,
        lead_id: lead.id,
        message: status === "Success" ? "Lead processed successfully" : "Lead processing failed",
        response: responseBody,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
