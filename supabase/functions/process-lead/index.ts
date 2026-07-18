import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface PayloadFieldConfig {
  fieldName: string;
  displayName: string;
  sourceType: "lead_data" | "static" | "dynamic";
  sourceKey?: string;
  staticValue?: string;
  dynamicType?: "source" | "medium" | "campaign" | "college_id" | "secret_key";
  isRequired: boolean;
  sortOrder: number;
}

interface LeadPayload {
  universityId: string;
  batchId: string;
  sourceLabel?: string;
  leadData: Record<string, string>;
  apiConfig: {
    apiUrl: string;
    secretKey: string;
    collegeId: string;
    source: string;
    medium: string;
    campaign: string;
    apiType: string;
    columnMapping: Record<string, string>;
    customColumnMapping?: Record<string, string>;
    payloadWrapper?: string;
    authType?: string;
    authHeaderKey?: string;
    authHeaderValue?: string;
    customHeaders?: Record<string, string>;
    universityDefaults?: Record<string, string>;
    apiTimeoutSeconds?: number;
  };
}

// Do not automatically retry partner POSTs: a timed-out request may already
// have been accepted, and retrying adds delay plus duplicate risk. Users can
// explicitly retry failed rows after reviewing the response.
const MAX_PARTNER_ATTEMPTS = 1;
// The client chooses 1-5 for an individual run. Scheduled/background callers
// continue to request 1, while this cap safely permits the interactive choice.
const MAX_PARTNER_CONCURRENCY = 5;
const PARTNER_TIMEOUT_MS = 30000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const STOPPED_STATUSES = new Set(["Cancelled", "Paused", "Stopped"]);

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

function aliasesForField(field: string): string[] {
  const normalized = String(field || "").trim().toLowerCase();
  if (["specialisation", "specialization"].includes(normalized)) return FIELD_ALIASES.specialization;
  if (["program", "field_program", "programname", "program_name"].includes(normalized)) return FIELD_ALIASES.program;
  if (normalized === "course") return FIELD_ALIASES.course;
  if (normalized === "campus") return FIELD_ALIASES.campus;
  return [field].filter(Boolean);
}

function readLeadValue(leadData: Record<string, string>, ...candidates: string[]): string {
  const seen = new Set<string>();
  const expanded = candidates
    .filter(Boolean)
    .flatMap((candidate) => aliasesForField(candidate))
    .filter((candidate) => {
      if (seen.has(candidate)) return false;
      seen.add(candidate);
      return true;
    });

  for (const candidate of expanded) {
    const value = leadData[candidate];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

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

function normalizeMerittoNoPaperFormsPayload(payload: Record<string, string>, apiConfig: LeadPayload["apiConfig"]) {
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

function ensureLeadSquaredTrackingFields(payload: Record<string, string>, apiConfig: LeadPayload["apiConfig"]) {
  if (!payload.leadSource && apiConfig.source) payload.leadSource = apiConfig.source;
  if (!payload.leadMedium && apiConfig.medium) payload.leadMedium = apiConfig.medium;
  if (!payload.leadCampaign && apiConfig.campaign) payload.leadCampaign = apiConfig.campaign;
}

function buildLeadSquaredAttributePayload(payload: Record<string, string>): Array<{ Attribute: string; Value: string }> {
  const preferredOrder = [
    "FirstName",
    "EmailAddress",
    "Phone",
    "mx_State",
    "mx_City",
    "mx_Course",
    "leadSource",
    "leadMedium",
    "leadCampaign",
  ];
  const orderIndex = new Map(preferredOrder.map((key, index) => [key, index]));

  return Object.entries(payload)
    .filter(([_, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .sort(([left], [right]) => {
      const leftIndex = orderIndex.has(left) ? orderIndex.get(left)! : preferredOrder.length;
      const rightIndex = orderIndex.has(right) ? orderIndex.get(right)! : preferredOrder.length;
      return leftIndex === rightIndex ? 0 : leftIndex - rightIndex;
    })
    .map(([key, value]) => ({ Attribute: key, Value: String(value) }));
}

async function getBlockedBatchIds(batchIds: string[]): Promise<Set<string>> {
  if (batchIds.length === 0) return new Set();

  const { data: batchRows, error } = await supabase
    .from("upload_batches")
    .select("id,status,is_paused,is_cancelled")
    .in("id", [...new Set(batchIds)]);

  if (error) {
    console.error("Batch control check failed:", error);
    // Fail closed: if we cannot verify control state, do not send queued leads.
    return new Set(batchIds);
  }

  const blockedBatchIds = new Set(
    (batchRows || [])
      .filter((row: any) => row.is_cancelled || row.is_paused || ["cancelled", "paused"].includes(row.status))
      .map((row: any) => row.id),
  );
  const returnedBatchIds = new Set((batchRows || []).map((row: any) => row.id));
  batchIds.forEach((batchId) => {
    if (!returnedBatchIds.has(batchId)) blockedBatchIds.add(batchId);
  });
  return blockedBatchIds;
}

function stoppedResult() {
  return {
    success: false,
    status: "Cancelled",
    response: "Processing was stopped before this lead was sent",
    httpStatus: 0,
  };
}

function resolvePartnerTimeoutMs(apiConfig: LeadPayload["apiConfig"]): number {
  const configuredSeconds = Number(apiConfig.apiTimeoutSeconds);
  if (Number.isFinite(configuredSeconds) && configuredSeconds >= 5 && configuredSeconds <= 300) {
    return Math.round(configuredSeconds * 1000);
  }

  if ((apiConfig.apiUrl || "").toLowerCase().includes("ctpl")) {
    return 90000;
  }

  return PARTNER_TIMEOUT_MS;
}

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

function parsePayloadFieldConfig(value: unknown): PayloadFieldConfig | null {
  const parsed = parseJsonLike<Partial<PayloadFieldConfig>>(value, value as Partial<PayloadFieldConfig>);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const fieldName = String(parsed.fieldName ?? "").trim();
  const displayName = String(parsed.displayName ?? fieldName).trim();
  const sourceType =
    parsed.sourceType === "static" || parsed.sourceType === "dynamic" || parsed.sourceType === "lead_data"
      ? parsed.sourceType
      : "lead_data";

  if (!fieldName) return null;

  return {
    fieldName,
    displayName,
    sourceType,
    sourceKey: String(parsed.sourceKey ?? "").trim() || undefined,
    staticValue: String(parsed.staticValue ?? "").trim() || undefined,
    dynamicType: parsed.dynamicType,
    isRequired: Boolean(parsed.isRequired),
    sortOrder: Number(parsed.sortOrder) || 0,
  };
}

function retryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.min(5000, Math.max(250, seconds * 1000));
  }
  return Math.min(3000, 300 * 2 ** attempt + Math.floor(Math.random() * 200));
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

// Categorize API response into Success/Duplicate/Fail
function categorizeResponse(httpStatus: number, responseBody: string, isHttpOk: boolean): string {
  const rs = responseBody.toLowerCase();

  const isDuplicate =
    rs.includes("duplicate") || rs.includes("already exist") || rs.includes("already registered") ||
    rs.includes("already present") || rs.includes("record exists") || rs.includes("lead already") ||
    rs.includes("entry already") || rs.includes("email already") || rs.includes("mobile already") ||
    rs.includes("phone already") || rs.includes("contact already");

  if (httpStatus === 409 || isDuplicate) {
    return "Duplicate";
  }

  if (isHttpOk) {
    try {
      const jr = JSON.parse(responseBody);
      const errCode = String(jr.errorCode || jr.error_code || "").toLowerCase();
      const jrStatus = String(jr.status || jr.Status || "").toLowerCase();
      const leadSquaredIsCreated =
        jr?.Message && typeof jr.Message === "object" && "IsCreated" in jr.Message
          ? jr.Message.IsCreated
          : jr.IsCreated;

      // LeadSquared: IsCreated=true is a new lead; false is an accepted
      // existing/secondary lead and should not be shown as a hard failure.
      if (leadSquaredIsCreated === false) {
        return "Duplicate";
      }
      if (leadSquaredIsCreated === true) {
        return "Success";
      }

      if (errCode === "duplicate" || jrStatus === "duplicate") {
        return "Duplicate";
      }

      const errMsg = String(jr.error || jr.message || jr.Message || "").toLowerCase();
      if (errMsg.includes("duplicate") || errMsg.includes("already exist") || errMsg.includes("already registered") ||
          errMsg.includes("email already") || errMsg.includes("mobile already")) {
        return "Duplicate";
      }

      // Check isLeadExists / leadAlreadyExists - if lead already exists, treat as Duplicate
      if (jr.isLeadExists === true || jr.leadAlreadyExists === true) {
        return "Duplicate";
      }

      // upGrad: firstByUser=false means lead already existed → Duplicate
      if (jr.firstByUser === false) {
        return "Duplicate";
      }

      // upGrad Lead-Drop returns a leadIdentifier on success (HTTP 2xx) with firstByUser=true
      if (jr.leadIdentifier || jr.lead_identifier || jr.leadId) {
        return "Success";
      }

      const numericStatus = Number(jr.status ?? jr.Status ?? jr.statusCode ?? jr.code);
      if (!isNaN(numericStatus) && numericStatus >= 200 && numericStatus < 300) {
        return "Success";
      }

      const msgLower = String(jr.message || jr.Message || "").toLowerCase();
      if (
        msgLower.includes("submitted successfully") ||
        msgLower.includes("submitted succesfully") ||
        msgLower.includes("success") ||
        msgLower === "data submitted"
      ) {
        return "Success";
      }

      if (
        jrStatus === "success" || jr.status === true || jr.status === 1 ||
        jr.success === true || jr.success === 1 ||
        jr.result === true || jr.result === 1 ||
        String(jr.result || jr.Result || "").toLowerCase() === "success" || jr.message === "1"
      ) {
        return "Success";
      }

      if (jrStatus === "fail" || jrStatus === "failed" || jr.success === false || jr.error) {
        return "Fail";
      }

      return "Fail";
    } catch {
      // Some partner APIs return a plain success token instead of JSON.
      const plain = responseBody.trim().toLowerCase().replace(/^['"]|['"]$/g, "");
      if (["1", "true", "success", "ok"].includes(plain)) return "Success";
      return "Fail";
    }
  }

  return "Fail";
}

// ---------- Core processor: handles ONE task end-to-end ----------
async function processOne(
  input: LeadPayload,
  options: { skipGuards?: boolean; skipPersistence?: boolean } = {},
): Promise<{ success: boolean; status: string; response: string; httpStatus: number }> {
  const { batchId, leadData, apiConfig, universityId, sourceLabel } = input;
  const srcLabel = (sourceLabel || "").trim();

  // Every caller must honour Pause/Stop, including legacy single-lead
  // requests. The old background worker used single-task mode and could keep
  // posting after an admin cancelled the batch because only batch mode checked
  // this flag. Check immediately before any partner request so cancellation is
  // a real server-side stop switch, not just a UI state.
  if (batchId && !options.skipGuards) {
    try {
      const { data: batchRow } = await supabase
        .from("upload_batches")
        .select("status,is_paused,is_cancelled")
        .eq("id", batchId)
        .maybeSingle();
      if (!batchRow) {
        return {
          success: false,
          status: "Cancelled",
          response: "Processing was stopped before this lead was sent",
          httpStatus: 0,
        };
      }
      if (batchRow?.is_cancelled || batchRow?.is_paused || ["cancelled", "paused"].includes(batchRow?.status)) {
        return {
          success: false,
          status: "Cancelled",
          response: "Processing was stopped before this lead was sent",
          httpStatus: 0,
        };
      }
    } catch (e) {
      // A transient control-read failure must not silently disable the safety
      // switch; fail closed for this lead instead of sending unexpectedly.
      console.error("Batch cancellation check failed:", e);
      return { success: false, status: "Fail", response: "Could not verify batch control state", httpStatus: 0 };
    }
  }

  // Status guard
  if (universityId && !options.skipGuards) {
    try {
      const { data: uniRow } = await supabase.from("universities").select("status").eq("id", universityId).maybeSingle();
      if (uniRow?.status === "disabled") {
        try { await supabase.rpc("upsert_lead_push_stat", { p_university_id: universityId, p_source: srcLabel, p_status: "fail" }); } catch (_) {}
        return { success: false, status: "Disabled", response: "University is disabled - push blocked", httpStatus: 0 };
      }
    } catch (e) { console.error("Status check failed (continuing):", e); }
  }

  // DLL
  if (universityId && !options.skipGuards) {
    try {
      const { data: dllRows } = await supabase.rpc("check_and_reserve_dll", { p_university_id: universityId });
      const dll = Array.isArray(dllRows) ? dllRows[0] : dllRows;
      if (dll && dll.allowed === false) {
        try { await supabase.rpc("upsert_lead_push_stat", { p_university_id: universityId, p_source: srcLabel, p_status: "dll_blocked" }); } catch (_) {}
        return { success: false, status: "DLL_Blocked", response: `Daily lead limit reached (${dll.current_count}/${dll.daily_limit})`, httpStatus: 0 };
      }
    } catch (e) { console.error("DLL check failed (continuing):", e); }
  }

  let responseBody = "";
  let status = "Fail";
  let httpStatus = 0;

  const built = buildPayload(leadData, apiConfig);
  const { payload, headers } = built;
  const finalPayload = apiConfig.payloadWrapper === "array" && !Array.isArray(payload) ? [payload] : payload;
  const partnerTimeoutMs = resolvePartnerTimeoutMs(apiConfig);

  for (let attempt = 0; attempt < MAX_PARTNER_ATTEMPTS; attempt++) {
    let apiResponse: Response | null = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), partnerTimeoutMs);
    try {
      apiResponse = await fetch(apiConfig.apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(finalPayload),
        signal: controller.signal,
      });
      httpStatus = apiResponse.status;
      responseBody = await apiResponse.text();

      if (isTransientStatus(httpStatus) && attempt < MAX_PARTNER_ATTEMPTS - 1) {
        await sleep(retryDelayMs(apiResponse, attempt));
        continue;
      }

      status = categorizeResponse(httpStatus, responseBody, apiResponse.ok);
      break;
    } catch (fetchError) {
      const isTimeout = fetchError instanceof DOMException && fetchError.name === "AbortError";
      responseBody = JSON.stringify({
        error: isTimeout
          ? `Partner API timed out after ${Math.round(partnerTimeoutMs / 1000)} seconds`
          : String(fetchError),
        type: isTimeout ? "timeout" : "network_error",
        attempt: attempt + 1,
      });
      status = "Fail";
      if (attempt < MAX_PARTNER_ATTEMPTS - 1) {
        await sleep(retryDelayMs(apiResponse, attempt));
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // Batch counter
  if (batchId && !options.skipPersistence) {
    const rpc = status === "Success" ? "increment_batch_success" : status === "Duplicate" ? "increment_batch_duplicate" : "increment_batch_fail";
    try { await supabase.rpc(rpc, { batch_uuid: batchId }); } catch (_) {}
  }

  // Daily + cumulative rollup
  if (universityId && !options.skipPersistence) {
    try {
      await supabase.rpc("upsert_lead_push_stat", {
        p_university_id: universityId,
        p_source: srcLabel,
        p_status: status.toLowerCase(),
      });
    } catch (e) { console.error("Stats upsert failed:", e); }
  }

  return { success: status === "Success", status, response: responseBody, httpStatus };
}

// ---------- Payload builder (extracted so both single + batch use it) ----------
function buildPayload(leadData: Record<string, string>, apiConfig: LeadPayload["apiConfig"]): { payload: unknown; headers: Record<string, string> } {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const columnMapping = normalizeStringRecord(apiConfig.columnMapping);
  const customHeaders = normalizeStringRecord(apiConfig.customHeaders);
  const customColumnMapping = normalizeStringRecord(apiConfig.customColumnMapping);
  const universityDefaults = normalizeStringRecord(apiConfig.universityDefaults);

  if (apiConfig.authType === "bearer" && apiConfig.authHeaderValue) {
    headers["Authorization"] = `Bearer ${apiConfig.authHeaderValue}`;
  } else if (apiConfig.authType === "custom_header" && apiConfig.authHeaderKey && apiConfig.authHeaderValue) {
    headers[apiConfig.authHeaderKey] = apiConfig.authHeaderValue;
  }
  if (customHeaders) {
    Object.entries(customHeaders).forEach(([key, value]) => {
      if (key && value) headers[key] = value;
    });
  }

  const payloadFields: PayloadFieldConfig[] = [];
  const staticFields: Record<string, string> = {};
  const fixedDefaults: Record<string, string> = {};
  const fieldMappings: Record<string, string> = {};
  Object.entries(columnMapping).forEach(([key, value]) => {
    if (key.startsWith("__field_")) {
      const field = parsePayloadFieldConfig(value);
      if (field) payloadFields.push(field);
    } else if (key.startsWith("__static_")) {
      staticFields[key.replace("__static_", "")] = value;
    } else if (key.startsWith("__fixed_")) {
      fixedDefaults[key.replace("__fixed_", "")] = value;
    } else {
      fieldMappings[key] = value;
    }
  });

  Object.entries(customColumnMapping).forEach(([key, value]) => {
    if (value) fieldMappings[key] = value;
  });

  payloadFields.sort((a, b) => a.sortOrder - b.sortOrder);

  const leadDataWithDefaults = { ...leadData };
  Object.entries(fixedDefaults).forEach(([key, defaultValue]) => {
    if (!leadDataWithDefaults[key] || !leadDataWithDefaults[key].trim()) {
      leadDataWithDefaults[key] = defaultValue;
    }
  });
  Object.entries(universityDefaults).forEach(([key, defaultValue]) => {
    if (defaultValue && (!leadDataWithDefaults[key] || !leadDataWithDefaults[key].trim())) {
      leadDataWithDefaults[key] = defaultValue;
    }
  });

  let payload: unknown;

  if (apiConfig.apiType === "upgrad") {
    const src = leadDataWithDefaults.leadSource || apiConfig.source || "";
    const med = leadDataWithDefaults.leadMedium || apiConfig.medium || "";
    const camp = leadDataWithDefaults.leadCampaign || apiConfig.campaign || "";
    if (src) headers["utm_source"] = src;
    if (med) headers["utm_medium"] = med;
    if (camp) headers["utm_campaign"] = camp;

    const sk = (apiConfig.secretKey || "").trim();
    if (sk) {
      if (sk.toLowerCase().startsWith("basic ")) headers["Authorization"] = sk;
      else if (sk.includes(":")) headers["Authorization"] = `Basic ${btoa(sk)}`;
      else headers["Authorization"] = `Basic ${sk}`;
    }

    const upgradSrcMap: Record<string, string> = {};
    const upgradMeta: Record<string, string> = {};
    Object.entries(columnMapping).forEach(([k, v]) => {
      if (k.startsWith("__upgrad_src_") && v) upgradSrcMap[k.replace("__upgrad_src_", "")] = v;
      else if (k.startsWith("__upgrad_meta_") && v) upgradMeta[k.replace("__upgrad_meta_", "")] = v;
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
        const value = leadDataWithDefaults[candidate];
        if (value) return value;
      }
      return "";
    };

    const fullName = (leadDataWithDefaults.name || "").trim();
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const firstname = (readField("firstname", "firstname") || nameParts.shift() || "Lead").trim();
    const lastname = (readField("lastname", "lastname") || nameParts.join(" ") || firstname).trim();

    const rawMobileInput = (readField("mobile", "phone.number") || "").trim();
    let phoneCode = (leadDataWithDefaults["phone.code"] || leadDataWithDefaults["phone.countryCode"] || "+91").trim() || "+91";
    let phoneNumber = rawMobileInput.replace(/\D/g, "");
    const plusMatch = rawMobileInput.match(/^\+(\d{1,3})/);
    if (plusMatch) {
      phoneCode = `+${plusMatch[1]}`;
      phoneNumber = phoneNumber.slice(plusMatch[1].length);
    } else if (phoneNumber.length === 12 && phoneNumber.startsWith("91")) {
      phoneNumber = phoneNumber.slice(2);
    } else if (phoneNumber.length === 11 && phoneNumber.startsWith("0")) {
      phoneNumber = phoneNumber.slice(1);
    }

    const upPayload: Record<string, unknown> = {
      firstname,
      lastname,
      email: readField("email", "email"),
      phone: { number: phoneNumber, code: phoneCode },
      course: readField("course", "course"),
      sendWelcomeMail: false,
      city: readField("city", "city"),
      state: readField("state", "state"),
      country: leadDataWithDefaults.country || upgradMeta.country || "India",
      isDetectLocation: false,
      affiliateSource: leadDataWithDefaults.affiliateSource || upgradMeta.affiliateSource || "aff_id=1&sub_aff_id=12",
      leadSource: {
        platform: leadDataWithDefaults["leadSource.platform"] || "",
        platformSection: leadDataWithDefaults["leadSource.platformSection"] || "",
      },
      extraFields: {
        chatLink: leadDataWithDefaults["extraFields.chatLink"] || upgradMeta.chatLink || "haptik.com/1234567",
      },
      emailTemplateSuffix: leadDataWithDefaults.emailTemplateSuffix || upgradMeta.emailTemplateSuffix || "in",
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
  } else if (payloadFields.length > 0) {
    const formPayload: Record<string, string> = {};
    const manualAcademicFieldKeys = new Set(["campus", "course", "specialization", "specialisation", "program"]);
    const payloadFieldKeys = new Set(
      payloadFields
        .flatMap((field) => [field.fieldName, field.sourceKey, field.displayName])
        .filter(Boolean)
        .map((field) => String(field).trim().toLowerCase()),
    );
    payloadFields.forEach((field) => {
      if (!field.fieldName) return;
      let value = "";
      if (field.sourceType === "lead_data") {
        // Legacy university configurations sometimes saved an empty sourceKey.
        // Falling back to fieldName keeps those configurations usable and makes
        // the generated sample/mapping behavior consistent with the payload.
        const sourceKey = field.sourceKey?.trim() || field.fieldName;
        value = readLeadValue(leadDataWithDefaults, sourceKey, field.fieldName, field.displayName);
      } else if (field.sourceType === "static") {
        value = field.staticValue || "";
      } else if (field.sourceType === "dynamic") {
        switch (field.dynamicType) {
          case "source": value = leadDataWithDefaults.leadSource || apiConfig.source; break;
          case "medium": value = leadDataWithDefaults.leadMedium || apiConfig.medium; break;
          case "campaign": value = leadDataWithDefaults.leadCampaign || apiConfig.campaign; break;
          case "college_id": value = apiConfig.collegeId; break;
          case "secret_key": value = apiConfig.secretKey; break;
        }
      }
      if (value || field.isRequired) formPayload[field.fieldName] = value;
    });
    Object.entries(leadDataWithDefaults).forEach(([key, value]) => {
      if (value && !["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
        // Preserve a manual CSV target even when it is not present as a key in
        // the university's saved mapping (for example, Campus vs campus).
        const normalizedKey = key.trim().toLowerCase();
        const apiKey =
          fieldMappings[key] ||
          (payloadFieldKeys.has(normalizedKey) || manualAcademicFieldKeys.has(normalizedKey) ? key : "");
        if (apiKey && !formPayload[apiKey]) formPayload[apiKey] = value;
      }
    });
    Object.entries(staticFields).forEach(([key, value]) => {
      if (value && !formPayload[key]) formPayload[key] = value;
    });
    if (apiConfig.apiType === "meritto" || apiConfig.apiType === "nopaperforms") {
      normalizeMerittoNoPaperFormsPayload(formPayload, apiConfig);
    }
    if (apiConfig.apiType === "leadsquared") {
      normalizeLeadSquaredTrackingFields(formPayload);
      ensureLeadSquaredTrackingFields(formPayload, apiConfig);
      payload = buildLeadSquaredAttributePayload(formPayload);
    } else {
      payload = formPayload;
    }
  } else if (apiConfig.apiType === "leadsquared") {
    const lsPayload: Record<string, string> = {};
    Object.entries(leadDataWithDefaults).filter(([_, v]) => v).forEach(([key, value]) => {
      lsPayload[fieldMappings[key] || key] = value;
    });
    Object.entries(staticFields).forEach(([key, value]) => { if (value) lsPayload[key] = value; });
    normalizeLeadSquaredTrackingFields(lsPayload);
    ensureLeadSquaredTrackingFields(lsPayload, apiConfig);
    payload = buildLeadSquaredAttributePayload(lsPayload);
  } else if (apiConfig.apiType === "meritto" || apiConfig.apiType === "nopaperforms") {
    const formData: Record<string, string> = {};
    Object.entries(leadDataWithDefaults).forEach(([key, value]) => {
      if (value) formData[fieldMappings[key] || key] = value;
    });
    formData[fieldMappings["medium"] || "medium"] = leadDataWithDefaults.leadMedium || apiConfig.medium;
    formData[fieldMappings["campaign"] || "campaign"] = leadDataWithDefaults.leadCampaign || apiConfig.campaign;
    formData.college_id = apiConfig.collegeId;
    formData[fieldMappings["source"] || "source"] = leadDataWithDefaults.leadSource || apiConfig.source;
    formData.secret_key = apiConfig.secretKey;
    Object.entries(staticFields).forEach(([key, value]) => { formData[key] = value; });
    normalizeMerittoNoPaperFormsPayload(formData, apiConfig);
    payload = formData;
  } else {
    const genericPayload: Record<string, string> = {};
    const hasSourceMapping = Object.keys(apiConfig.columnMapping).some((k) => k === "leadSource" || k === "source");
    const hasMediumMapping = Object.keys(apiConfig.columnMapping).some((k) => k === "leadMedium" || k === "medium");
    const hasCampaignMapping = Object.keys(apiConfig.columnMapping).some((k) => k === "leadCampaign" || k === "campaign");

    Object.entries(leadDataWithDefaults).forEach(([key, value]) => {
      if (value && !["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
        genericPayload[fieldMappings[key] || key] = value;
      }
    });
    if (hasSourceMapping) {
      const v = leadDataWithDefaults.leadSource || apiConfig.source;
      if (v) genericPayload[fieldMappings["leadSource"] || fieldMappings["source"] || "source"] = v;
    }
    if (hasMediumMapping) {
      const v = leadDataWithDefaults.leadMedium || apiConfig.medium;
      if (v) genericPayload[fieldMappings["leadMedium"] || fieldMappings["medium"] || "medium"] = v;
    }
    if (hasCampaignMapping) {
      const v = leadDataWithDefaults.leadCampaign || apiConfig.campaign;
      if (v) genericPayload[fieldMappings["leadCampaign"] || fieldMappings["campaign"] || "campaign"] = v;
    }
    if (apiConfig.collegeId) genericPayload.college_id = apiConfig.collegeId;
    if (apiConfig.secretKey) genericPayload.secret_key = apiConfig.secretKey;
    Object.entries(staticFields).forEach(([key, value]) => { if (value) genericPayload[key] = value; });
    payload = genericPayload;
  }

  if (apiConfig.apiType === "leadsquared" && !Array.isArray(payload)) {
    const flat = payload as Record<string, string>;
    normalizeLeadSquaredTrackingFields(flat);
    ensureLeadSquaredTrackingFields(flat, apiConfig);
    payload = buildLeadSquaredAttributePayload(flat);
  } else {
    payload = normalizeCustomUiPublisherPayload(payload, apiConfig.apiUrl);
  }

  if (apiConfig.apiType === "leadsquared") {
    headers["Content-Type"] = "application/json";
  }

  return { payload, headers };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // ---- BATCH mode: { tasks: LeadPayload[], concurrency?: number } ----
    // One HTTP roundtrip processes many tasks with internal parallelism.
    // This is the high-performance path used by Multi-Push.
    if (body && Array.isArray(body.tasks)) {
      const tasks: LeadPayload[] = body.tasks;
      // Enforced server-side for every current and future university. Even an
      // outdated or custom client cannot flood a partner with 50-200 requests.
      const concurrency = Math.max(1, Math.min(MAX_PARTNER_CONCURRENCY, Number(body.concurrency) || 1));
      const results: any[] = new Array(tasks.length);
      const work: number[] = [];
      const groups = new Map<string, number[]>();
      const cancelledTaskIndices = new Set<number>();

      tasks.forEach((task, index) => {
        const key = task.universityId || "";
        const indices = groups.get(key) || [];
        indices.push(index);
        groups.set(key, indices);
      });

      // Read batch state once per request. This is the server-side stop switch
      // for older browser workers: after Stop/Purge marks a batch cancelled,
      // late workers cannot continue posting leads to the partner API.
      const batchIds = [...new Set(tasks.map((task) => task.batchId).filter(Boolean))];
      if (batchIds.length > 0) {
        const blockedBatchIds = await getBlockedBatchIds(batchIds);
        tasks.forEach((task, index) => {
          if (blockedBatchIds.has(task.batchId)) {
            cancelledTaskIndices.add(index);
            results[index] = stoppedResult();
          }
        });
      }

      // One status read and one atomic capacity reservation per university
      // replaces the database calls that previously serialized every lead.
      let optimized = true;
      const universityIds = [...groups.keys()].filter(Boolean);
      const statusByUniversity = new Map<string, string>();
      if (universityIds.length > 0) {
        const { data: universityRows, error: statusError } = await supabase
          .from("universities")
          .select("id,status")
          .in("id", universityIds);
        if (statusError) optimized = false;
        (universityRows || []).forEach((row: any) => statusByUniversity.set(row.id, row.status));
      }

      if (optimized) {
        for (const [universityId, indices] of groups) {
          const activeIndices = indices.filter((index) => !cancelledTaskIndices.has(index));
          if (activeIndices.length === 0) continue;
          if (!universityId) {
            work.push(...activeIndices);
            continue;
          }

          if (statusByUniversity.get(universityId) === "disabled") {
            activeIndices.forEach((index) => {
              results[index] = {
                success: false,
                status: "Disabled",
                response: "University is disabled - push blocked",
                httpStatus: 0,
              };
            });
            continue;
          }

          const { data: capacityRows, error: capacityError } = await supabase.rpc("reserve_lead_push_capacity", {
            p_university_id: universityId,
            p_requested: activeIndices.length,
          });
          if (capacityError) {
            optimized = false;
            break;
          }

          const capacity = Array.isArray(capacityRows) ? capacityRows[0] : capacityRows;
          const allowedCount = Math.max(0, Math.min(activeIndices.length, Number(capacity?.allowed_count ?? activeIndices.length)));
          work.push(...activeIndices.slice(0, allowedCount));
          activeIndices.slice(allowedCount).forEach((index) => {
            results[index] = {
              success: false,
              status: "DLL_Blocked",
              response: `Daily lead limit reached (${capacity?.current_count ?? 0}/${capacity?.daily_limit ?? 0})`,
              httpStatus: 0,
            };
          });
        }
      }

      // Safe compatibility path while a deployment is between function and
      // migration versions. It preserves all old guards until both are live.
      if (!optimized) {
        work.length = 0;
        tasks.forEach((_, index) => {
          if (!cancelledTaskIndices.has(index)) work.push(index);
        });
      }

      let cursor = 0;

      const worker = async () => {
        while (true) {
          const workIndex = cursor++;
          if (workIndex >= work.length) return;
          const idx = work[workIndex];
          try {
            const taskBatchId = tasks[idx].batchId;
            if (taskBatchId) {
              const blockedBatchIds = await getBlockedBatchIds([taskBatchId]);
              if (blockedBatchIds.has(taskBatchId)) {
                cancelledTaskIndices.add(idx);
                results[idx] = stoppedResult();
                continue;
              }
            }
            results[idx] = await processOne(
              tasks[idx],
              optimized ? { skipGuards: true, skipPersistence: true } : {},
            );
          } catch (e) {
            results[idx] = { success: false, status: "Fail", response: String(e), httpStatus: 0 };
          }
        }
      };

      const pool = Math.min(concurrency, work.length);
      await Promise.all(Array.from({ length: pool }, () => worker()));

      if (optimized) {
        const aggregates = new Map<string, {
          batchId: string;
          universityId: string;
          source: string;
          success: number;
          fail: number;
          duplicate: number;
          dllBlocked: number;
        }>();

        tasks.forEach((task, index) => {
          const source = (task.sourceLabel || "").trim();
          const key = `${task.batchId || ""}|${task.universityId || ""}|${source}`;
          const aggregate = aggregates.get(key) || {
            batchId: task.batchId || "",
            universityId: task.universityId || "",
            source,
            success: 0,
            fail: 0,
            duplicate: 0,
            dllBlocked: 0,
          };
          const status = results[index]?.status;
          if (status === "Success") aggregate.success++;
          else if (status === "Duplicate") aggregate.duplicate++;
          else if (status === "DLL_Blocked") aggregate.dllBlocked++;
          else if (STOPPED_STATUSES.has(status)) {
            aggregates.set(key, aggregate);
            return;
          }
          else aggregate.fail++;
          aggregates.set(key, aggregate);
        });

        await Promise.all([...aggregates.values()].map((aggregate) =>
          supabase.rpc("record_lead_push_batch_results", {
            p_batch_id: aggregate.batchId || null,
            p_university_id: aggregate.universityId || null,
            p_source: aggregate.source,
            p_success: aggregate.success,
            p_fail: aggregate.fail,
            p_duplicate: aggregate.duplicate,
            p_dll_blocked: aggregate.dllBlocked,
          })
        ));
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Single-task mode (legacy / single-lead callers) ----
    const result = await processOne(body as LeadPayload);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ success: false, status: "Fail", error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
