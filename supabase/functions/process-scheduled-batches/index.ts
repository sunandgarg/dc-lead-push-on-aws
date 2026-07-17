import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseJsonLike<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return (value as T) ?? fallback;
}

function normalizeStringRecord(value: unknown): Record<string, string> {
  const parsed = parseJsonLike<Record<string, unknown>>(value, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed)
      .filter(([key]) => Boolean(key))
      .map(([key, entryValue]) => [key, typeof entryValue === "string" ? entryValue : JSON.stringify(entryValue ?? "")]),
  );
}

function resolvePartnerTimeoutMs(apiConfig: Record<string, any>): number {
  const configuredSeconds = Number(apiConfig.apiTimeoutSeconds);
  if (Number.isFinite(configuredSeconds) && configuredSeconds >= 5 && configuredSeconds <= 300) {
    return Math.round(configuredSeconds * 1000);
  }

  if (String(apiConfig.apiUrl || "").toLowerCase().includes("ctpl")) {
    return 90000;
  }

  return 30000;
}

function isLeadSquaredCustomUiPublisher(apiUrl?: string): boolean {
  return String(apiUrl || "").toLowerCase().includes("customui.leadsquared.com");
}

function addFirstAvailableAlias(payload: Record<string, string>, aliases: string[]) {
  const existingValue = aliases
    .map((key) => payload[key])
    .find((value) => value !== undefined && value !== null && String(value).trim() !== "");

  if (!existingValue) return;

  aliases.forEach((key) => {
    if (!payload[key] || !String(payload[key]).trim()) {
      payload[key] = String(existingValue);
    }
  });
}

const FIELD_ALIASES: Record<string, string[]> = {
  campus: ["campus", "Campus"],
  course: ["course", "Course"],
  program: ["program", "Program", "field_program", "programName", "program_name"],
  specialization: ["specialization", "Specialization", "Specialisation", "specialisation", "specializationName", "specialization_name"],
};

function addAcademicFieldAliases(payload: Record<string, string>) {
  addFirstAvailableAlias(payload, FIELD_ALIASES.campus);
  addFirstAvailableAlias(payload, FIELD_ALIASES.course);
  addFirstAvailableAlias(payload, FIELD_ALIASES.specialization);
}

function canonicalizeField(payload: Record<string, string>, canonicalKey: string, aliases: string[]) {
  const existingValue = [canonicalKey, ...aliases]
    .map((key) => payload[key])
    .find((value) => value !== undefined && value !== null && String(value).trim() !== "");

  if (existingValue !== undefined && existingValue !== null) {
    payload[canonicalKey] = String(existingValue);
  }

  aliases.forEach((key) => {
    if (key !== canonicalKey) delete payload[key];
  });
}

function normalizeMerittoNoPaperFormsPayload(payload: Record<string, string>, apiConfig: Record<string, any>) {
  if (apiConfig.collegeId && !payload.college_id) payload.college_id = apiConfig.collegeId;
  addFirstAvailableAlias(payload, FIELD_ALIASES.campus);
  canonicalizeField(payload, "course", ["Course"]);
  canonicalizeField(payload, "specialization", [
    "Specialization",
    "Specialisation",
    "specialisation",
    "specializationName",
    "specialization_name",
  ]);
}

function normalizeCustomUiPublisherPayload(payload: unknown, apiUrl?: string): unknown {
  if (!isLeadSquaredCustomUiPublisher(apiUrl) || Array.isArray(payload) || !payload || typeof payload !== "object") {
    return payload;
  }

  const normalized = { ...(payload as Record<string, string>) };
  addAcademicFieldAliases(normalized);
  return normalized;
}

function normalizeLeadSquaredTrackingFields(payload: Record<string, string>) {
  const sourceValue = payload.leadSource || payload.source || "";
  const mediumValue = payload.leadMedium || payload.medium || "";
  const campaignValue = payload.leadCampaign || payload.campaign || "";

  delete payload.source;
  delete payload.medium;
  delete payload.campaign;

  if (sourceValue) payload.leadSource = sourceValue;
  if (mediumValue) payload.leadMedium = mediumValue;
  if (campaignValue) payload.leadCampaign = campaignValue;
}

// Categorize API response into Success/Duplicate/Fail
function categorizeResponse(httpStatus: number, responseBody: string, isHttpOk: boolean): string {
  const rs = responseBody.toLowerCase();

  const isDuplicate =
    rs.includes("duplicate") || rs.includes("already exist") || rs.includes("already registered") ||
    rs.includes("already present") || rs.includes("record exists") || rs.includes("lead already") ||
    rs.includes("entry already") || rs.includes("email already") || rs.includes("mobile already") ||
    rs.includes("phone already") || rs.includes("contact already");

  if (httpStatus === 409 || isDuplicate) return "Duplicate";

  if (isHttpOk) {
    try {
      const jr = JSON.parse(responseBody);
      const errCode = String(jr.errorCode || jr.error_code || "").toLowerCase();
      const jrStatus = String(jr.status || jr.Status || "").toLowerCase();
      if (errCode === "duplicate" || jrStatus === "duplicate") return "Duplicate";

      const errMsg = String(jr.error || jr.message || jr.Message || "").toLowerCase();
      if (errMsg.includes("duplicate") || errMsg.includes("already exist") || errMsg.includes("already registered") ||
          errMsg.includes("email already") || errMsg.includes("mobile already")) return "Duplicate";

      if (jr.firstByUser === false || jr.isLeadExists === true || jr.leadAlreadyExists === true) return "Duplicate";

      if (jrStatus === "success" || jr.success === true || jr.IsCreated === true ||
          jr.leadIdentifier || jr.lead_identifier || jr.leadId ||
          String(jr.result || jr.Result || "").toLowerCase() === "success" || jr.message === "1") return "Success";

      if (jrStatus === "fail" || jrStatus === "failed" || jr.success === false || jr.error) return "Fail";
      return "Fail";
    } catch {
      return "Fail";
    }
  }
  return "Fail";
}

async function processOneLead(
  lead: Record<string, any>,
  apiConfig: Record<string, any>,
  batchId: string
): Promise<boolean> {
  let responseBody = "";
  let status = "Fail";
  const partnerTimeoutMs = resolvePartnerTimeoutMs(apiConfig);

  try {
    const { data: batchCheck } = await supabase
      .from("upload_batches")
      .select("is_paused, is_cancelled, status")
      .eq("id", batchId)
      .maybeSingle();

    if (
      !batchCheck ||
      batchCheck?.is_paused ||
      batchCheck?.is_cancelled ||
      ["paused", "cancelled"].includes(String(batchCheck?.status || ""))
    ) {
      return false;
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const customHeaders = normalizeStringRecord(apiConfig.customHeaders);
    const columnMapping = normalizeStringRecord(apiConfig.columnMapping);
    const customColumnMapping = normalizeStringRecord(apiConfig.customColumnMapping);

    if (apiConfig.authType === "bearer" && apiConfig.authHeaderValue) {
      headers["Authorization"] = `Bearer ${apiConfig.authHeaderValue}`;
    } else if (apiConfig.authType === "custom_header" && apiConfig.authHeaderKey && apiConfig.authHeaderValue) {
      headers[apiConfig.authHeaderKey] = apiConfig.authHeaderValue;
    }
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([key, value]) => {
        if (key && value) headers[key] = String(value);
      });
    }

    const fieldMappings: Record<string, string> = {};
    const staticFields: Record<string, string> = {};
    const fixedDefaults: Record<string, string> = {};

    Object.entries(columnMapping).forEach(([key, value]) => {
      if (key.startsWith("__static_")) {
        staticFields[key.replace("__static_", "")] = String(value);
      } else if (key.startsWith("__fixed_")) {
        fixedDefaults[key.replace("__fixed_", "")] = String(value);
      } else if (!key.startsWith("__field_")) {
        fieldMappings[key] = String(value);
      }
    });

    Object.entries(customColumnMapping).forEach(([key, value]) => {
      if (value) fieldMappings[key] = String(value);
    });

    // Build lead data from the leads table row
    const leadData: Record<string, string> = {};
    const fieldMap: Record<string, string> = {
      name: "name", email: "email", mobile: "mobile",
      address: "address", state: "state", city: "city",
      course: "course", specialization: "specialization",
      lead_source: "leadSource", lead_medium: "leadMedium", lead_campaign: "leadCampaign",
    };

    Object.entries(fieldMap).forEach(([dbCol, leadKey]) => {
      if (lead[dbCol]) leadData[leadKey] = lead[dbCol];
    });

    // Add extra_data fields
    if (lead.extra_data && typeof lead.extra_data === "object") {
      Object.entries(lead.extra_data).forEach(([key, value]) => {
        if (value) leadData[key] = String(value);
      });
    }

    // Apply fixed defaults
    Object.entries(fixedDefaults).forEach(([key, defaultValue]) => {
      if (!leadData[key] || !leadData[key].trim()) leadData[key] = defaultValue;
    });

    // Apply university defaults
    if (!leadData.leadSource?.trim()) leadData.leadSource = apiConfig.source || "";
    if (!leadData.leadMedium?.trim()) leadData.leadMedium = apiConfig.medium || "";
    if (!leadData.leadCampaign?.trim()) leadData.leadCampaign = apiConfig.campaign || "";

    // Build payload based on API type
    let payload: unknown;

    if (apiConfig.apiType === "leadsquared") {
      const lsPayload: Record<string, string> = {};
      Object.entries(leadData).filter(([_, v]) => v).forEach(([key, value]) => {
        lsPayload[fieldMappings[key] || key] = value;
      });
      Object.entries(staticFields).forEach(([key, value]) => { if (value) lsPayload[key] = value; });
      normalizeLeadSquaredTrackingFields(lsPayload);
      payload = Object.entries(lsPayload)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([key, value]) => ({ Attribute: key, Value: String(value) }));
    } else if (apiConfig.apiType === "upgrad") {
      const src = leadData.leadSource || apiConfig.source || "";
      const med = leadData.leadMedium || apiConfig.medium || "";
      const camp = leadData.leadCampaign || apiConfig.campaign || "";
      if (src) headers["utm_source"] = src;
      if (med) headers["utm_medium"] = med;
      if (camp) headers["utm_campaign"] = camp;

      const sk = String(apiConfig.secretKey || "").trim();
      if (sk) {
        if (sk.toLowerCase().startsWith("basic ")) headers["Authorization"] = sk;
        else if (sk.includes(":")) headers["Authorization"] = `Basic ${btoa(sk)}`;
        else headers["Authorization"] = `Basic ${sk}`;
      }

      const upgradSrcMap: Record<string, string> = {};
      const upgradMeta: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([k, v]) => {
        if (k.startsWith("__upgrad_src_") && v) upgradSrcMap[k.replace("__upgrad_src_", "")] = String(v);
        else if (k.startsWith("__upgrad_meta_") && v) upgradMeta[k.replace("__upgrad_meta_", "")] = String(v);
      });

      const readField = (upgradField: string, fallbackCsv: string): string => {
        const aliasMap: Record<string, string[]> = {
          mobile: ["phone.number", "mobile"],
          course: ["course", "programOfInterest"],
          firstname: ["firstname", "name"],
          lastname: ["lastname"],
        };
        const csvKey = upgradSrcMap[upgradField] || fallbackCsv;
        const candidates = [csvKey, upgradField, ...(aliasMap[upgradField] || []), fallbackCsv];
        for (const candidate of candidates) {
          const value = leadData[candidate];
          if (value) return value;
        }
        return "";
      };
      const fullName = (leadData.name || "").trim();
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstname = (readField("firstname", "firstname") || nameParts.shift() || "Lead").trim();
      const lastname = (readField("lastname", "lastname") || nameParts.join(" ") || firstname).trim();
      const rawMobileInput = (readField("mobile", "phone.number") || "").trim();
      let countryCode = String(leadData["phone.code"] || leadData["phone.countryCode"] || "+91").trim() || "+91";
      let number = rawMobileInput.replace(/\D/g, "");
      const plusMatch = rawMobileInput.match(/^\+(\d{1,3})/);
      if (plusMatch) {
        countryCode = `+${plusMatch[1]}`;
        number = number.slice(plusMatch[1].length);
      } else if (number.length === 12 && number.startsWith("91")) number = number.slice(2);
      else if (number.length === 11 && number.startsWith("0")) number = number.slice(1);
      const upPayload: Record<string, unknown> = {
        firstname,
        lastname,
        email: readField("email", "email"),
        phone: { number, code: countryCode },
        course: readField("course", "course"),
        sendWelcomeMail: false,
        city: readField("city", "city"),
        state: readField("state", "state"),
        country: leadData.country || upgradMeta.country || "India",
        isDetectLocation: false,
        affiliateSource: leadData.affiliateSource || upgradMeta.affiliateSource || "aff_id=1&sub_aff_id=12",
        leadSource: {
          platform: leadData["leadSource.platform"] || "",
          platformSection: leadData["leadSource.platformSection"] || "",
        },
        extraFields: {
          chatLink: leadData["extraFields.chatLink"] || upgradMeta.chatLink || "haptik.com/1234567",
        },
        emailTemplateSuffix: leadData.emailTemplateSuffix || upgradMeta.emailTemplateSuffix || "in",
      };

      Object.entries(staticFields).forEach(([k, v]) => {
        if (!v) return;
        if (k === "extraFields.LSQID") return;
        if (k.includes(".")) {
          const segments = k.split(".");
          let cursor = upPayload as Record<string, unknown>;
          for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            if (typeof cursor[seg] !== "object" || cursor[seg] === null) cursor[seg] = {};
            cursor = cursor[seg] as Record<string, unknown>;
          }
          cursor[segments[segments.length - 1]] = v;
        } else {
          upPayload[k] = v;
        }
      });
      payload = upPayload;
    } else if (apiConfig.apiType === "meritto" || apiConfig.apiType === "nopaperforms") {
      const formData: Record<string, string> = {};
      Object.entries(leadData).forEach(([key, value]) => {
        if (value) formData[fieldMappings[key] || key] = value;
      });
      formData[fieldMappings["medium"] || "medium"] = leadData.leadMedium || apiConfig.medium;
      formData[fieldMappings["campaign"] || "campaign"] = leadData.leadCampaign || apiConfig.campaign;
      formData.college_id = apiConfig.collegeId;
      formData[fieldMappings["source"] || "source"] = leadData.leadSource || apiConfig.source;
      formData.secret_key = apiConfig.secretKey;
      Object.entries(staticFields).forEach(([key, value]) => { formData[key] = value; });
      normalizeMerittoNoPaperFormsPayload(formData, apiConfig);
      payload = formData;
    } else {
      const genericPayload: Record<string, string> = {};
      Object.entries(leadData).forEach(([key, value]) => {
        if (value && !["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
          genericPayload[fieldMappings[key] || key] = value;
        }
      });
      const hasSourceMapping = Object.keys(columnMapping).some((k) => k === "leadSource" || k === "source");
      const hasMediumMapping = Object.keys(columnMapping).some((k) => k === "leadMedium" || k === "medium");
      const hasCampaignMapping = Object.keys(columnMapping).some((k) => k === "leadCampaign" || k === "campaign");
      if (hasSourceMapping) {
        const v = leadData.leadSource || apiConfig.source || "";
        if (v) genericPayload[fieldMappings["leadSource"] || fieldMappings["source"] || "source"] = v;
      }
      if (hasMediumMapping) {
        const v = leadData.leadMedium || apiConfig.medium || "";
        if (v) genericPayload[fieldMappings["leadMedium"] || fieldMappings["medium"] || "medium"] = v;
      }
      if (hasCampaignMapping) {
        const v = leadData.leadCampaign || apiConfig.campaign || "";
        if (v) genericPayload[fieldMappings["leadCampaign"] || fieldMappings["campaign"] || "campaign"] = v;
      }
      if (apiConfig.collegeId) genericPayload.college_id = apiConfig.collegeId;
      if (apiConfig.secretKey) genericPayload.secret_key = apiConfig.secretKey;
      Object.entries(staticFields).forEach(([key, value]) => { if (value) genericPayload[key] = value; });
      payload = genericPayload;
    }

    payload = normalizeCustomUiPublisherPayload(payload, apiConfig.apiUrl);
    const finalPayload = apiConfig.payloadWrapper === "array" && !Array.isArray(payload) ? [payload] : payload;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), partnerTimeoutMs);

    const apiResponse = await fetch(apiConfig.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(finalPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const httpStatus = apiResponse.status;
    responseBody = await apiResponse.text();
    status = categorizeResponse(httpStatus, responseBody, apiResponse.ok);
  } catch (fetchError) {
    const isTimeout = fetchError instanceof DOMException && fetchError.name === "AbortError";
    responseBody = JSON.stringify({
      error: isTimeout ? `Partner API timed out after ${Math.round(partnerTimeoutMs / 1000)} seconds` : String(fetchError),
      type: isTimeout ? "timeout" : "network_error",
    });
    status = "Fail";
  }

  // Update lead status
  await supabase
    .from("leads")
    .update({
      status: status.toLowerCase(),
      api_response: responseBody,
      processed_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  // Increment batch counter
  const rpcName = status === "Success"
    ? "increment_batch_success"
    : status === "Duplicate"
      ? "increment_batch_duplicate"
      : "increment_batch_fail";

  try { await supabase.rpc(rpcName, { batch_uuid: batchId }); } catch (_) { /* ignore */ }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date().toISOString();

    // Find scheduled batches that are due
    const { data: batches, error: batchError } = await supabase
      .from("upload_batches")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .eq("is_cancelled", false)
      .limit(5);

    if (batchError || !batches?.length) {
      return new Response(
        JSON.stringify({ success: true, message: "No scheduled batches due", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let totalProcessed = 0;

    for (const batch of batches) {
      // Mark batch as processing
      await supabase
        .from("upload_batches")
        .update({ status: "processing" })
        .eq("id", batch.id);

      const apiConfig = batch.api_config;
      if (!apiConfig) {
        await supabase
          .from("upload_batches")
          .update({ status: "failed", error_message: "No API config found" })
          .eq("id", batch.id);
        continue;
      }

      // Get pending leads for this batch
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("batch_id", batch.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(500); // Process up to 500 per invocation

      if (leadsError || !leads?.length) {
        // Check if all leads are done
        const { count } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("batch_id", batch.id)
          .eq("status", "pending");

        if (!count || count === 0) {
          await supabase
            .from("upload_batches")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", batch.id);
        }
        continue;
      }

      // Process scheduled leads through the same high-speed batch endpoint used
      // by immediate uploads. Bounded waves keep each request within the Edge
      // Function runtime while allowing partner calls to run concurrently.
      const maxProcessingTime = 50000; // 50 seconds
      const startTime = Date.now();
      // Use the same bounded wave policy as immediate and multi-push uploads.
      // Strict sequential mode: finish one partner request before the next.
      const chunkSize = 1;
      const concurrency = 1;
      let batchProcessed = 0;

      for (let chunkStart = 0; chunkStart < leads.length; chunkStart += chunkSize) {
        // Check pause/cancel once per wave instead of once per lead.
        const { data: batchCheck } = await supabase
          .from("upload_batches")
          .select("is_paused, is_cancelled")
          .eq("id", batch.id)
          .maybeSingle();

        if (batchCheck?.is_cancelled) {
          await supabase
            .from("upload_batches")
            .update({ status: "cancelled", completed_at: new Date().toISOString() })
            .eq("id", batch.id);
          break;
        }

        if (batchCheck?.is_paused) {
          await supabase
            .from("upload_batches")
            .update({ status: "paused" })
            .eq("id", batch.id);
          break;
        }

        // Check time limit
        if (Date.now() - startTime > maxProcessingTime) {
          // Will continue in next cron invocation
          break;
        }

        const chunk = leads.slice(chunkStart, chunkStart + chunkSize);
        const tasks = chunk.map((lead) => ({
          universityId: batch.university_id,
          batchId: batch.id,
          sourceLabel: batch.source_label || null,
          leadData: {
            ...(lead.extra_data || {}),
            name: lead.name || "",
            email: lead.email || "",
            mobile: lead.mobile || "",
            address: lead.address || "",
            state: lead.state || "",
            city: lead.city || "",
            course: lead.course || "",
            specialization: lead.specialization || "",
            leadSource: lead.lead_source || apiConfig.source || "",
            leadMedium: lead.lead_medium || apiConfig.medium || "",
            leadCampaign: lead.lead_campaign || apiConfig.campaign || "",
          },
          apiConfig,
        }));

        let handledByBatchEndpoint = false;
        try {
          const response = await fetch(`${supabaseUrl}/functions/v1/process-lead`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey,
            },
            body: JSON.stringify({ tasks, concurrency }),
          });
          const body = await response.json();
          if (response.ok && Array.isArray(body?.results) && body.results.length === chunk.length) {
            handledByBatchEndpoint = true;
            let handledLeadCount = 0;
            await Promise.all(
              chunk.map((lead, index) => {
                const result = body.results[index];
                if (["Cancelled", "Paused", "Stopped"].includes(String(result?.status || ""))) {
                  return Promise.resolve();
                }
                handledLeadCount++;
                const leadStatus = result?.status === "Success"
                  ? "success"
                  : result?.status === "Duplicate"
                    ? "duplicate"
                    : "failed";
                return supabase
                  .from("leads")
                  .update({
                    status: leadStatus,
                    api_response: result?.response || "No response",
                    processed_at: new Date().toISOString(),
                  })
                  .eq("id", lead.id);
              }),
            );
            batchProcessed += handledLeadCount;
            totalProcessed += handledLeadCount;
          }
        } catch (error) {
          console.error("Scheduled batch endpoint failed; using parallel fallback", error);
        }

        if (!handledByBatchEndpoint) {
          const fallbackResults = await Promise.all(chunk.map((lead) => processOneLead(lead, apiConfig, batch.id)));
          const handledLeadCount = fallbackResults.filter(Boolean).length;
          batchProcessed += handledLeadCount;
          totalProcessed += handledLeadCount;
        }

        // One progress write per wave instead of one write per lead.
        await supabase
          .from("upload_batches")
          .update({
            processed_count: (batch.processed_count || 0) + batchProcessed,
            current_lead_index: (batch.current_lead_index || 0) + batchProcessed,
          })
          .eq("id", batch.id);
      }

      // Check if batch is complete
      const { count: remainingCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("batch_id", batch.id)
        .eq("status", "pending");

      if (!remainingCount || remainingCount === 0) {
        await supabase
          .from("upload_batches")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", batch.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed, batches: batches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Scheduled processor error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
