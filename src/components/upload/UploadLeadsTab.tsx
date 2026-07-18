import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  Download,
  Rocket,
  FileText,
  CheckCircle2,
  Pause,
  Play,
  RotateCcw,
  Clock,
  Plus,
  AlertTriangle,
  Search,
  FileDown,
  CalendarClock,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import { parseCSV, generateSampleCSV } from "@/utils/csvParser";
import {
  validateLeads,
  checkDatabaseDuplicates,
  generateLeadsCSV,
  buildValidationConfigFromUniversity,
  type Lead,
} from "@/utils/leadValidation";
import { LeadPreviewTable } from "./LeadPreviewTable";
import { UniversityInfoPanel } from "./UniversityInfoPanel";
import { SingleLeadForm } from "./SingleLeadForm";
import { Alert } from "../Alert";
import { supabase } from "@/integrations/supabase/client";
import { useUploadStatePersistence } from "@/hooks/useUploadStatePersistence";
import { appCache } from "@/hooks/useAppCache";

interface CustomColumn {
  columnKey: string;
  columnName: string;
  isRequired: boolean;
  values: { value: string; parentValue?: string }[];
  apiFieldName?: string;
}

interface PayloadFieldDefinition {
  fieldName?: string;
  displayName?: string;
  sourceType?: "lead_data" | "static" | "dynamic";
  sourceKey?: string;
  dynamicType?: "source" | "medium" | "campaign" | "college_id" | "secret_key";
  staticValue?: string;
  isRequired?: boolean;
  sortOrder?: number;
}

function stringifyUiValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map(stringifyUiValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKey = ["name", "contact_name", "value", "label", "displayName", "fieldName"].find(
      (key) => key in record,
    );
    if (preferredKey) return stringifyUiValue(record[preferredKey]);
    return Object.values(record).map(stringifyUiValue).filter(Boolean).join(", ");
  }
  return String(value).trim();
}

function normalizePartnerResponse(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "No response";
  try {
    return JSON.stringify(value);
  } catch {
    const flattened = stringifyUiValue(value);
    return flattened || "No response";
  }
}

function normalizePartnerStatus(value: unknown): "Success" | "Duplicate" | "Fail" | "Cancelled" {
  const status = stringifyUiValue(value).toLowerCase();
  if (status === "success") return "Success";
  if (status === "duplicate") return "Duplicate";
  if (status === "cancelled") return "Cancelled";
  return "Fail";
}

// This is the final UI boundary for asynchronous partner results. Do not rely
// on TypeScript here: Edge Function JSON is untrusted at runtime and a partner
// may return an object (CTPL has returned contact_name objects). React must
// never receive those objects through live result state.
function normalizeResponseMap(values: Map<number, unknown>): Map<number, string> {
  return new Map(
    Array.from(values.entries()).map(([index, value]) => [index, normalizePartnerResponse(value)] as const),
  );
}

// CSV rows and old university mappings are user-controlled data. Keep the
// boundary between them and React/API state strict: neither the preview nor a
// partner request may ever receive an object value (for example
// `{ contact_name: "..." }`).
function normalizeLeadRow(value: Record<string, unknown>): Lead {
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [key, stringifyUiValue(fieldValue)]),
  ) as Lead;
}

// Saved CSV mappings predate the current data normalizers. A damaged browser
// cache can therefore contain a value such as `{ contact_name: "name" }`.
// Mapping values are used by the select modal and must always be primitive
// strings; repair them at the storage boundary, not only after CSV parsing.
function normalizeCsvMapping(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, fieldValue]) => [stringifyUiValue(key), stringifyUiValue(fieldValue)] as const)
      .filter(([key]) => Boolean(key)),
  );
}

function clampUniversityNumber(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

interface University {
  id: string;
  name: string;
  api_url: string;
  college_id: string;
  secret_key: string;
  source: string;
  medium: string;
  campaign: string;
  leads_per_minute: number;
  api_timeout_seconds?: number;
  default_push_concurrency?: number;
  api_type: string;
  column_mapping: Record<string, string>;
  sample_csv_content?: string;
  courseSpecializations?: { course: string; specialization: string }[];
  stateCities?: { state: string; city: string }[];
  customColumns?: CustomColumn[];
  payload_wrapper?: string;
  auth_type?: string;
  auth_header_key?: string;
  auth_header_value?: string;
  custom_headers?: Record<string, string>;
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

function normalizeKeyValueRecord(value: unknown): Record<string, string> {
  const parsed = parseJsonLike<Record<string, unknown>>(value, {});
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed)
      .filter(([key]) => Boolean(key))
      .map(([key, entryValue]) => [key, typeof entryValue === "string" ? entryValue : JSON.stringify(entryValue ?? "")]),
  );
}

function sanitizePayloadFieldConfigValue(rawValue: string): string {
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return rawValue;

    return JSON.stringify({
      ...parsed,
      fieldName: stringifyUiValue(parsed.fieldName),
      displayName: stringifyUiValue(parsed.displayName) || stringifyUiValue(parsed.fieldName),
      sourceKey: stringifyUiValue(parsed.sourceKey) || undefined,
      staticValue: stringifyUiValue(parsed.staticValue) || undefined,
    });
  } catch {
    return rawValue;
  }
}

function normalizeColumnMappingRecord(value: unknown): Record<string, string> {
  const record = normalizeKeyValueRecord(value);
  return Object.fromEntries(
    Object.entries(record).map(([key, entryValue]) => [
      key,
      key.startsWith("__field_") ? sanitizePayloadFieldConfigValue(entryValue) : entryValue,
    ]),
  );
}

function normalizeOptionValues(value: unknown): Array<{ value: string; parentValue?: string }> {
  const parsed = parseJsonLike<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
        const normalized = String(entry).trim();
        return normalized ? { value: normalized } : null;
      }

      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;

      const valueCandidate = "value" in entry ? String((entry as Record<string, unknown>).value ?? "").trim() : "";
      if (!valueCandidate) return null;

      const parentCandidate =
        "parentValue" in entry ? String((entry as Record<string, unknown>).parentValue ?? "").trim() : "";

      return parentCandidate ? { value: valueCandidate, parentValue: parentCandidate } : { value: valueCandidate };
    })
    .filter((entry): entry is { value: string; parentValue?: string } => Boolean(entry));
}

function normalizeCustomColumns(value: unknown): CustomColumn[] {
  const parsed = parseJsonLike<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry, index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const columnKey = String(record.columnKey ?? record.column_key ?? "").trim();
      const rawColumnName = record.columnName ?? record.column_name ?? columnKey ?? `column_${index + 1}`;
      const columnName = String(rawColumnName).trim();

      return {
        columnKey: columnKey || `column_${index + 1}`,
        columnName: columnName || columnKey || `Column ${index + 1}`,
        isRequired: Boolean(record.isRequired ?? record.is_required),
        values: normalizeOptionValues(record.values),
        apiFieldName: String(record.apiFieldName ?? record.api_field_name ?? "").trim() || undefined,
      } satisfies CustomColumn;
    })
    .filter((entry): entry is CustomColumn => Boolean(entry));
}

function normalizeStateCities(value: unknown): Array<{ state: string; city: string }> {
  const parsed = parseJsonLike<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const state = String(record.state ?? "").trim();
      const city = String(record.city ?? "").trim();
      if (!state && !city) return null;
      return { state, city };
    })
    .filter((entry): entry is { state: string; city: string } => Boolean(entry));
}

function normalizeCourseSpecializations(value: unknown): Array<{ course: string; specialization: string }> {
  const parsed = parseJsonLike<unknown[]>(value, []);
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const course = String(record.course ?? "").trim();
      const specialization = String(record.specialization ?? "").trim();
      if (!course && !specialization) return null;
      return { course, specialization };
    })
    .filter((entry): entry is { course: string; specialization: string } => Boolean(entry));
}

// University rows are user-editable JSON and a few older records contain
// `customColumns`/`column_mapping` as strings or null. Normalize them before
// rendering so one malformed university cannot crash the entire Lead Push
// component and invoke the recovery boundary.
function normalizeUniversityRecord(raw: any): University {
  const columnMapping = normalizeColumnMappingRecord(raw?.column_mapping);
  const customColumns = normalizeCustomColumns(raw?.customColumns ?? raw?.custom_columns);
  const stateCities = normalizeStateCities(raw?.stateCities ?? raw?.state_cities);
  const courseSpecializations = normalizeCourseSpecializations(
    raw?.courseSpecializations ?? raw?.course_specializations,
  );

  return {
    ...raw,
    name: String(raw?.name ?? "Unnamed University"),
    api_url: String(raw?.api_url ?? ""),
    college_id: String(raw?.college_id ?? ""),
    secret_key: String(raw?.secret_key ?? ""),
    source: String(raw?.source ?? ""),
    medium: String(raw?.medium ?? ""),
    campaign: String(raw?.campaign ?? ""),
    api_type: String(raw?.api_type ?? "nopaperforms"),
    leads_per_minute: Number(raw?.leads_per_minute) || 60,
    // Accept both database (snake_case) and edit-form (camelCase) records.
    // The value stored for this university is authoritative; there is no
    // hidden CTPL/default override in the upload runner.
    api_timeout_seconds: clampUniversityNumber(
      raw?.api_timeout_seconds ?? raw?.apiTimeoutSeconds,
      30,
      5,
      300,
    ),
    default_push_concurrency: clampUniversityNumber(
      raw?.default_push_concurrency ?? raw?.defaultPushConcurrency,
      2,
      1,
      5,
    ),
    column_mapping: columnMapping,
    customColumns,
    stateCities,
    courseSpecializations,
    payload_wrapper: String(raw?.payload_wrapper ?? "object"),
    auth_type: String(raw?.auth_type ?? "secret_key"),
    auth_header_key: String(raw?.auth_header_key ?? ""),
    auth_header_value: String(raw?.auth_header_value ?? ""),
    custom_headers: normalizeKeyValueRecord(raw?.custom_headers),
  } as University;
}

type ProcessingSlugState = "processing" | "paused" | "complete" | "idle";

type LeadProcessingStatus = "pending" | "success" | "failed" | "duplicate";

const normalizeDbLeadStatus = (status: string | null | undefined): LeadProcessingStatus => {
  const value = (status || "").toLowerCase();
  if (value === "success") return "success";
  if (value === "duplicate") return "duplicate";
  if (value === "fail" || value === "failed" || value === "cancelled") return "failed";
  return "pending";
};

const normalizeIdentityPart = (value: string | null | undefined) => (value || "").trim().toLowerCase();

const buildLeadIdentityKey = (lead: { name?: string | null; email?: string | null; mobile?: string | null }) =>
  `${normalizeIdentityPart(lead.name)}|${normalizeIdentityPart(lead.email)}|${normalizeIdentityPart(lead.mobile)}`;

const UPGRAD_EXACT_SAMPLE_CSV = [
  "firstname,lastname,email,phone.number,phone.code,course,sendWelcomeMail,city,state,country,isDetectLocation,affiliateSource,leadSource.platform,leadSource.platformSection,extraFields.chatLink,emailTemplateSuffix",
  "FirstName,LastName,user@upgrad.com,9999999999,+91,entrepreneurship,false,Mumbai,Maharashtra,India,false,aff_id=1&sub_aff_id=12,,,haptik.com/1234567,in",
  "Rahul,Sharma,rahul.sharma@example.com,9876543210,+91,entrepreneurship,false,Mumbai,Maharashtra,India,false,aff_id=1&sub_aff_id=12,,,haptik.com/1234567,in",
  "Priya,Patel,priya.patel@example.com,9876501234,+91,entrepreneurship,false,Mumbai,Maharashtra,India,false,aff_id=1&sub_aff_id=12,,,haptik.com/1234567,in",
].join("\n");

const UPGRAD_EXACT_FIELDS = [
  "firstname",
  "lastname",
  "email",
  "phone.number",
  "phone.code",
  "course",
  "sendWelcomeMail",
  "city",
  "state",
  "country",
  "isDetectLocation",
  "affiliateSource",
  "leadSource.platform",
  "leadSource.platformSection",
  "extraFields.chatLink",
  "emailTemplateSuffix",
];

const LOCAL_STORAGE_PURGE_KEYS = new Set([
  "upload:lastSourceLabel",
  "dekhocampus_upload_leads_state_v1",
  "dekhocampus_upload_v3",
  "dekhocampus_upload_processing_v1",
  "dekhocampus_app_cache_v3",
  "dekhocampus_app_cache_v4",
  "lpAdminDashboardCache.v2",
]);

const LOCAL_STORAGE_PURGE_PREFIXES = ["csv_mapping_", "dekhocampus_"];
const SESSION_STORAGE_PURGE_KEYS = new Set([
  "dc_route_state",
  "app:chunk-reload",
  "app:has_unsaved_draft",
  "dekhocampus_upload_session_v1",
  "dekhocampus_session_state_v2",
  "dekhocampus_session_state_v3",
]);
const SESSION_STORAGE_PURGE_PREFIXES = ["app:page:", "app:sub_slugs", "app:draft_indicator", "dekhocampus_"];

const CSV_HEADER_ALIASES: Record<string, string> = {
  // This typo existed in the CTPL Invertis sample. Keep accepting old files so
  // users do not have to manually repair already-downloaded CSVs.
  campaign_nanme: "campaign_name",
  campaign_namne: "campaign_name",
};

const normalizeMappingToken = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function getPayloadFieldDefinitions(columnMapping: Record<string, string> = {}): PayloadFieldDefinition[] {
  return Object.entries(columnMapping).flatMap(([key, value]) => {
    if (!key.startsWith("__field_") || !value) return [];
    try {
      const rawField = JSON.parse(value) as PayloadFieldDefinition;
      const fieldName = stringifyUiValue(rawField?.fieldName);
      if (!fieldName) return [];
      return [{
        ...rawField,
        fieldName,
        displayName: stringifyUiValue(rawField?.displayName) || fieldName,
        sourceKey: stringifyUiValue(rawField?.sourceKey) || undefined,
        staticValue: stringifyUiValue(rawField?.staticValue) || undefined,
        sortOrder: Number.isFinite(Number(rawField?.sortOrder)) ? Number(rawField?.sortOrder) : 0,
      }];
    } catch {
      return [];
    }
  }).sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
}

function getPreviewAliases(field: string): string[] {
  const normalized = String(field || "").trim().toLowerCase();
  if (["specialisation", "specialization"].includes(normalized)) {
    return ["specialization", "Specialization", "Specialisation", "specialisation", "specializationName", "specialization_name"];
  }
  if (["program", "field_program", "programname", "program_name"].includes(normalized)) {
    return ["program", "Program", "field_program", "programName", "program_name"];
  }
  if (normalized === "course") return ["course", "Course"];
  if (normalized === "campus") return ["campus", "Campus"];
  return [field].filter(Boolean);
}

function readPreviewLeadValue(lead: Lead, ...candidates: Array<string | undefined>): string {
  const seen = new Set<string>();
  const expanded = candidates
    .filter(Boolean)
    .flatMap((candidate) => getPreviewAliases(candidate as string))
    .filter((candidate) => {
      if (seen.has(candidate)) return false;
      seen.add(candidate);
      return true;
    });

  for (const candidate of expanded) {
    const value = lead[candidate];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function getPayloadTargetForHeader(header: string, columnMapping: Record<string, string> = {}): string {
  const aliasedHeader = CSV_HEADER_ALIASES[header.trim().toLowerCase()] || header;
  const normalizedHeader = normalizeMappingToken(aliasedHeader);
  const field = getPayloadFieldDefinitions(columnMapping).find((candidate) => {
    if (candidate.sourceType && candidate.sourceType !== "lead_data") return false;
    return [candidate.sourceKey, candidate.fieldName, candidate.displayName]
      .filter(Boolean)
      .some((value) => normalizeMappingToken(value) === normalizedHeader);
  });
  return field ? field.sourceKey?.trim() || field.fieldName?.trim() || "" : "";
}

function purgeStorageEntries(storage: Storage, keys: Set<string>, prefixes: string[]) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (key.startsWith("sb-") || key.includes("auth-token")) continue;
    if (keys.has(key) || prefixes.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

async function purgeBrowserCacheStorage() {
  if (!("caches" in window)) return;
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
}

interface UploadLeadsTabProps {
  universities: University[];
  selectedUniversity?: University | null;
  onSelectUniversity?: (uni: University) => void;
  onFileUpload?: (filename: string) => void;
  onClearFile?: () => void;
  onProcessingStateChange?: (state: ProcessingSlugState) => void;
  currentFileName?: string | null;
  currentProcessingState?: ProcessingSlugState;
}

export function UploadLeadsTab({
  universities,
  selectedUniversity: initialSelectedUniversity,
  onSelectUniversity,
  onFileUpload,
  onClearFile: _onClearFile,
  onProcessingStateChange,
  currentFileName,
  currentProcessingState: _currentProcessingState = "idle",
}: UploadLeadsTabProps) {
  const safeUniversities = useMemo(() => universities.map(normalizeUniversityRecord), [universities]);
  const persistence = useUploadStatePersistence();
  const { state: persistedState, processing: persistedProcessing } = persistence;

  const [selectedUniversity, setSelectedUniversityState] = useState<University | null>(() => {
    if (persistedState.selectedUniversityId) {
      const found = safeUniversities.find((u) => u.id === persistedState.selectedUniversityId);
      if (found) return found;
    }
    return initialSelectedUniversity ? normalizeUniversityRecord(initialSelectedUniversity) : null;
  });

  const leads = persistedState.leads;
  const fileName = persistedState.fileName;
  const csvData = persistedState.csvData;
  const processedCount = persistedState.processedCount;
  const leadStatuses = persistence.leadStatusesMap;
  const leadResponses = persistence.leadResponsesMap;
  const leadPayloads = persistence.leadPayloadsMap;
  const leadDbIds = persistence.leadDbIdsMap;
  const validationErrors = persistence.validationErrorsMap;
  const dbDuplicates = persistence.dbDuplicatesSet;
  const hasValidationErrors = persistedState.hasValidationErrors;
  const duplicateAction = persistedState.duplicateAction;
  const csvHeaders = persistedState.csvHeaders;
  const tempColumnMapping = persistedState.tempColumnMapping;
  const pageSize = persistedState.pageSize;
  const batchId = persistedState.batchId;

  const [isProcessing, setIsProcessing] = useState(Boolean(persistedProcessing.isProcessing && persistedState.batchId));
  // Per-run only: intentionally not included in upload persistence or university settings.
  const [pushConcurrency, setPushConcurrency] = useState(2);
  const [isConcurrencyUnlocked, setIsConcurrencyUnlocked] = useState(false);
  const [showConcurrencyPin, setShowConcurrencyPin] = useState(false);
  const [concurrencyPin, setConcurrencyPin] = useState("");
  const [concurrencyPinError, setConcurrencyPinError] = useState("");
  const [isPaused, setIsPaused] = useState(Boolean(persistedProcessing.isPaused));
  const [isBackgroundPolling, setIsBackgroundPolling] = useState(Boolean(persistedProcessing.isProcessing && persistedState.batchId));
  const [showColumnMapping, setShowColumnMapping] = useState(false);
  // ✅ FIX 1: Local state for the mapping dialog - edits are instant, no persistence lag
  const [localColumnMapping, setLocalColumnMapping] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ type: "success" | "error" | "info" | "warning"; message: string } | null>(null);
  const [startTime, setStartTime] = useState<number | null>(persistedProcessing.startTime);
  const [showSingleLeadForm, setShowSingleLeadForm] = useState(persistedState.showSingleLeadForm);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isPurgingCache, setIsPurgingCache] = useState(false);
  const [customPageSize, setCustomPageSize] = useState<string>("");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<string>(() => {
    try {
      return localStorage.getItem("upload:lastSourceLabel") || "";
    } catch {
      return "";
    }
  });
  // Post-mapping "Data Source" entry dialog
  const [showSourceEntry, setShowSourceEntry] = useState(false);
  const [pendingMapping, setPendingMapping] = useState<Record<string, string> | null>(null);
  // Always ask fresh — do NOT persist source/description between uploads
  const [pendingSourceLabel, setPendingSourceLabel] = useState<string>("");
  const [pendingDataDescription, setPendingDataDescription] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef<boolean>(false);
  const pausedRef = useRef<boolean>(false);
  const activeRunIdRef = useRef(0);
  const activePacketControllersRef = useRef<Set<AbortController>>(new Set());
  const currentIndexRef = useRef<number>(persistedProcessing.currentIndex);
  const applyColumnMappingAndProcessRef = useRef<((mapping?: Record<string, string>) => void) | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingInFlightRef = useRef(false);
  const lastUrlProcessingStateRef = useRef<ProcessingSlugState | null>(null);
  // Refs for polling to avoid stale closures
  const leadsRef = useRef(leads);
  const leadDbIdsRef = useRef(leadDbIds);
  const persistenceRef = useRef(persistence);

  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!selectedUniversity?.id) {
      setPushConcurrency(2);
      setIsConcurrencyUnlocked(false);
      return;
    }

    setPushConcurrency(Math.min(5, Math.max(1, selectedUniversity.default_push_concurrency || 2)));
    setIsConcurrencyUnlocked(false);
  }, [selectedUniversity?.id, selectedUniversity?.default_push_concurrency]);

  // The parent refreshes university records after add/edit. Previously this
  // component kept the old object when its id was unchanged, so a saved
  // timeout/concurrency could look correct in Settings but never be used by
  // Lead Push until a full browser refresh.
  useEffect(() => {
    const preferredId = initialSelectedUniversity?.id || persistedState.selectedUniversityId;
    if (!preferredId) return;
    const freshUniversity = safeUniversities.find((university) => university.id === preferredId);
    if (freshUniversity) setSelectedUniversityState(freshUniversity);
  }, [initialSelectedUniversity?.id, persistedState.selectedUniversityId, safeUniversities]);

  // Keep refs in sync for polling
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);
  useEffect(() => {
    leadDbIdsRef.current = leadDbIds;
  }, [leadDbIds]);
  useEffect(() => {
    persistenceRef.current = persistence;
  }, [persistence]);

  useEffect(() => {
    persistence.setProcessing({
      isProcessing,
      isPaused,
      currentIndex: currentIndexRef.current,
      startTime,
      batchId,
    });

    if (onProcessingStateChange) {
      let slugState: ProcessingSlugState = "idle";
      if (isProcessing && isPaused) {
        slugState = "paused";
      } else if (isProcessing) {
        slugState = "processing";
      } else if (leads.length > 0 && processedCount === leads.length) {
        slugState = "complete";
      }

      if (lastUrlProcessingStateRef.current === slugState) return;
      lastUrlProcessingStateRef.current = slugState;
      onProcessingStateChange(slugState);
    }
  }, [isProcessing, isPaused, startTime, batchId, leads.length, processedCount]);

  // ========== POLLING: Real-time batch & lead status sync from DB ==========
  // Uses refs to avoid stale closures - this function is stable and never recreated
  // Simplified polling - only reads batch aggregate counts (no leads table)
  const pollBatchProgress = useCallback(async (pollBatchId: string) => {
    if (isPollingInFlightRef.current) return;
    isPollingInFlightRef.current = true;

    try {
      const { data: batch } = await supabase
        .from("upload_batches")
        .select("success_count, duplicate_count, fail_count, status, is_paused, is_cancelled, total_leads")
        .eq("id", pollBatchId)
        .maybeSingle();

      if (!batch) return;

      setIsPaused(Boolean(batch.is_paused));

      const processed = (batch.success_count ?? 0) + (batch.duplicate_count ?? 0) + (batch.fail_count ?? 0);
      persistenceRef.current.setState({ processedCount: processed });

      const isBatchComplete =
        batch.status === "completed" ||
        batch.status === "cancelled" ||
        (processed >= (batch.total_leads ?? 0) && (batch.total_leads ?? 0) > 0);

      if (isBatchComplete) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        setIsBackgroundPolling(false);
        setIsProcessing(false);
        setIsPaused(false);

        const success = batch.success_count ?? 0;
        const failed = (batch.fail_count ?? 0) + (batch.duplicate_count ?? 0);
        setAlert({
          type: batch.status === "cancelled" ? "info" : failed === 0 ? "success" : "info",
          message:
            batch.status === "cancelled"
              ? "Processing was cancelled."
              : `Processing complete! Success: ${success}, Failed: ${failed}`,
        });
      }
    } catch (error) {
      console.error("[Polling] Error:", error);
    } finally {
      isPollingInFlightRef.current = false;
    }
  }, []);

  // Start/stop polling when background processing state changes
  useEffect(() => {
    const shouldPoll = Boolean(batchId && isBackgroundPolling);

    if (shouldPoll && batchId) {
      // Initial poll immediately
      pollBatchProgress(batchId);

      // Then poll every 3 seconds
      pollingRef.current = setInterval(() => {
        pollBatchProgress(batchId);
      }, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [batchId, isBackgroundPolling, pollBatchProgress]);

  // If the upload view remounts during an active push, restore the visible
  // processing state instead of dropping back to "Process Now". Polling keeps
  // the aggregate counters aligned with the active batch until it completes.
  useEffect(() => {
    if (batchId && persistedProcessing.isProcessing) {
      setIsProcessing(true);
      setIsPaused(Boolean(persistedProcessing.isPaused));
      setIsBackgroundPolling(true);
      if (persistedProcessing.startTime) {
        setStartTime(persistedProcessing.startTime);
      }
    }
  }, [batchId, persistedProcessing.isProcessing, persistedProcessing.isPaused, persistedProcessing.startTime]);

  useEffect(() => {
    if (persistedState.selectedUniversityId && safeUniversities.length > 0) {
      const found = safeUniversities.find((u) => u.id === persistedState.selectedUniversityId);
      if (found && (!selectedUniversity || selectedUniversity.id !== found.id)) {
        setSelectedUniversityState(normalizeUniversityRecord(found));
        if (onSelectUniversity) {
          onSelectUniversity(found);
        }
      }
    }
  }, [safeUniversities, persistedState.selectedUniversityId]);

  const setLeads = useCallback(
    (newLeads: Lead[]) => {
      persistence.setLeads(newLeads);
    },
    [persistence],
  );

  const setFileName = useCallback(
    (name: string) => {
      persistence.setState({ fileName: name });
      if (name && onFileUpload) {
        onFileUpload(name);
      }
    },
    [persistence, onFileUpload],
  );

  const setCsvData = useCallback(
    (data: string) => {
      persistence.setState({ csvData: data });
    },
    [persistence],
  );

  const setProcessedCount = useCallback(
    (count: number) => {
      persistence.setState({ processedCount: count });
    },
    [persistence],
  );

  const setLeadStatuses = useCallback(
    (statuses: Map<number, "pending" | "success" | "failed" | "duplicate">) => {
      persistence.setState({
        leadStatuses: Object.fromEntries(statuses.entries()),
      });
    },
    [persistence],
  );

  const setLeadResponses = useCallback(
    (responses: Map<number, string>) => {
      persistence.setState({
        leadResponses: Object.fromEntries(normalizeResponseMap(responses).entries()),
      });
    },
    [persistence],
  );

  const setLeadPayloads = useCallback(
    (payloads: Map<number, string>) => {
      persistence.setState({
        leadPayloads: Object.fromEntries(payloads.entries()),
      });
    },
    [persistence],
  );

  const setLeadDbIds = useCallback(
    (dbIds: Map<number, string>) => {
      persistence.setState({
        leadDbIds: Object.fromEntries(dbIds.entries()),
      });
    },
    [persistence],
  );

  const setValidationErrors = useCallback(
    (errors: Map<number, string[]>) => {
      persistence.setState({
        validationErrors: Object.fromEntries(errors.entries()),
        hasValidationErrors: errors.size > 0,
      });
    },
    [persistence],
  );

  const setDbDuplicates = useCallback(
    (duplicates: Set<number>) => {
      persistence.setState({ dbDuplicates: Array.from(duplicates) });
    },
    [persistence],
  );

  const setDuplicateAction = useCallback(
    (action: "skip" | "process") => {
      persistence.setState({ duplicateAction: action });
    },
    [persistence],
  );

  const setCsvHeaders = useCallback(
    (headers: string[]) => {
      persistence.setState({ csvHeaders: headers.map((header) => stringifyUiValue(header)).filter(Boolean) });
    },
    [persistence],
  );

  const setTempColumnMapping = useCallback(
    (mapping: Record<string, string>) => {
      persistence.setState({
        tempColumnMapping: Object.fromEntries(
          Object.entries(mapping).map(([key, value]) => [stringifyUiValue(key), stringifyUiValue(value)]),
        ),
      });
    },
    [persistence],
  );

  const setPageSize = useCallback(
    (size: number) => {
      persistence.setState({ pageSize: size });
    },
    [persistence],
  );

  const setBatchId = useCallback(
    (id: string | null) => {
      persistence.setState({ batchId: id });
    },
    [persistence],
  );

  const normalizeUpgradMobile = (value: string) => {
    const rawMobile = (value || "").toString().trim();
    let countryCode = "+91";
    let number = rawMobile.replace(/\D/g, "");
    const plusMatch = rawMobile.match(/^\+(\d{1,3})/);
    if (plusMatch) {
      countryCode = `+${plusMatch[1]}`;
      number = number.slice(plusMatch[1].length);
    } else if (number.length === 12 && number.startsWith("91")) {
      number = number.slice(2);
    } else if (number.length === 11 && number.startsWith("0")) {
      number = number.slice(1);
    }
    return { countryCode, number };
  };

  const normalizeUpgradLead = (lead: Lead): Lead => {
    if ((selectedUniversity?.api_type || "") !== "upgrad") return lead;
    const phone = normalizeUpgradMobile(lead["phone.number"] || lead.mobile || "");
    const programOfInterest = slugifyUpgradCourse(lead.programOfInterest || lead.course || lead.specialization || "");
    return {
      ...lead,
      name: lead.name || [lead.firstname, lead.lastname].filter(Boolean).join(" ").trim(),
      mobile: phone.number,
      "phone.code": lead["phone.code"] || lead["phone.countryCode"] || phone.countryCode,
      "phone.number": phone.number,
      course: lead.course || programOfInterest,
      country: lead.country || "India",
      sendWelcomeMail: "false",
      isDetectLocation: lead.isDetectLocation || "false",
      affiliateSource: lead.affiliateSource || "aff_id=1&sub_aff_id=12",
      "leadSource.platform": lead["leadSource.platform"] || "",
      "leadSource.platformSection": lead["leadSource.platformSection"] || "",
      "extraFields.chatLink": lead["extraFields.chatLink"] || "haptik.com/1234567",
      emailTemplateSuffix: lead.emailTemplateSuffix || "in",
    };
  };

  const slugifyUpgradCourse = (value: string) =>
    (value || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

  const isLeadSquaredCustomUiPublisher = (apiUrl?: string) =>
    (apiUrl || "").toLowerCase().includes("customui.leadsquared.com");

  const addFirstAvailablePayloadAlias = (payload: Record<string, string>, aliases: string[]) => {
    const existingValue = aliases
      .map((key) => payload[key])
      .find((value) => value !== undefined && value !== null && String(value).trim() !== "");

    if (!existingValue) return;

    aliases.forEach((key) => {
      if (!payload[key] || !String(payload[key]).trim()) {
        payload[key] = String(existingValue);
      }
    });
  };

  const addAcademicPayloadAliases = (payload: Record<string, string>) => {
    addFirstAvailablePayloadAlias(payload, ["campus", "Campus"]);
    addFirstAvailablePayloadAlias(payload, ["course", "Course"]);
    addFirstAvailablePayloadAlias(payload, ["specialization", "Specialization", "Specialisation", "specialisation"]);
  };

  const canonicalizePayloadField = (payload: Record<string, string>, canonicalKey: string, aliases: string[]) => {
    const existingValue = [canonicalKey, ...aliases]
      .map((key) => payload[key])
      .find((value) => value !== undefined && value !== null && String(value).trim() !== "");

    if (existingValue !== undefined && existingValue !== null) {
      payload[canonicalKey] = String(existingValue);
    }

    aliases.forEach((key) => {
      if (key !== canonicalKey) delete payload[key];
    });
  };

  const normalizeMerittoNoPaperFormsPayload = (payload: Record<string, string>) => {
    addFirstAvailablePayloadAlias(payload, ["campus", "Campus"]);
    canonicalizePayloadField(payload, "course", ["Course"]);
    canonicalizePayloadField(payload, "specialization", [
      "Specialization",
      "Specialisation",
      "specialisation",
      "specializationName",
      "specialization_name",
    ]);
  };

  const normalizeCustomUiPublisherPayload = (payload: unknown) => {
    if (!isLeadSquaredCustomUiPublisher(selectedUniversity?.api_url) || Array.isArray(payload) || !payload || typeof payload !== "object") {
      return payload;
    }

    const normalized = { ...(payload as Record<string, string>) };
    addAcademicPayloadAliases(normalized);
    return normalized;
  };

  const normalizeLeadSquaredTrackingFields = (payload: Record<string, string>) => {
    const sourceValue = payload.leadSource || payload.source || "";
    const mediumValue = payload.leadMedium || payload.medium || "";
    const campaignValue = payload.leadCampaign || payload.campaign || "";

    delete payload.source;
    delete payload.medium;
    delete payload.campaign;

    if (sourceValue) payload.leadSource = sourceValue;
    if (mediumValue) payload.leadMedium = mediumValue;
    if (campaignValue) payload.leadCampaign = campaignValue;
  };

  const ensureLeadSquaredTrackingFields = (payload: Record<string, string>) => {
    if (!payload.leadSource && selectedUniversity?.source) payload.leadSource = selectedUniversity.source;
    if (!payload.leadMedium && selectedUniversity?.medium) payload.leadMedium = selectedUniversity.medium;
    if (!payload.leadCampaign && selectedUniversity?.campaign) payload.leadCampaign = selectedUniversity.campaign;
  };

  const buildLeadSquaredAttributePayload = (payload: Record<string, string>) =>
    Object.entries(payload)
      .filter(([_, value]) => value !== undefined && value !== null && String(value).trim() !== "")
      .sort(([left], [right]) => {
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
        const leftIndex = preferredOrder.includes(left) ? preferredOrder.indexOf(left) : preferredOrder.length;
        const rightIndex = preferredOrder.includes(right) ? preferredOrder.indexOf(right) : preferredOrder.length;
        return leftIndex === rightIndex ? 0 : leftIndex - rightIndex;
      })
      .map(([key, value]) => ({ Attribute: key, Value: String(value) }));

  const buildMappedPayloadPreview = (lead: Lead): string => {
    if (!selectedUniversity) return "";

    const apiType = selectedUniversity.api_type || "nopaperforms";
    const columnMapping = selectedUniversity.column_mapping || {};
    const customColumns = selectedUniversity.customColumns || [];
    const payloadFields = getPayloadFieldDefinitions(columnMapping);

    const customColumnApiMapping: Record<string, string> = {};
    customColumns.forEach((col: any) => {
      if (col.columnKey && col.apiFieldName) {
        customColumnApiMapping[col.columnKey] = col.apiFieldName;
      }
    });

    const entries = Object.entries(lead).filter(([, v]) => typeof v === "string" && v.trim()) as Array<
      [string, string]
    >;
    if (payloadFields.length > 0) {
      const payload: Record<string, string> = {};
      const manualAcademicFieldKeys = new Set(["campus", "course", "specialization", "specialisation", "program"]);
      const payloadFieldKeys = new Set(
        payloadFields
          .flatMap((field) => [field.fieldName, field.sourceKey, field.displayName])
          .filter(Boolean)
          .map((field) => normalizeMappingToken(field as string)),
      );

      payloadFields.forEach((field) => {
        if (!field.fieldName) return;
        let value = "";
        if (field.sourceType === "lead_data") {
          const sourceKey = field.sourceKey?.trim() || field.fieldName;
          value = readPreviewLeadValue(lead, sourceKey, field.fieldName);
        } else if (field.sourceType === "static") {
          value = field.staticValue || "";
        } else if (field.sourceType === "dynamic") {
          switch (field.dynamicType) {
            case "source":
              value = lead.leadSource?.trim() || selectedUniversity.source || "";
              break;
            case "medium":
              value = lead.leadMedium?.trim() || selectedUniversity.medium || "";
              break;
            case "campaign":
              value = lead.leadCampaign?.trim() || selectedUniversity.campaign || "";
              break;
            case "college_id":
              value = selectedUniversity.college_id || "";
              break;
            case "secret_key":
              value = selectedUniversity.secret_key ? "[hidden]" : "";
              break;
          }
        }
        if (value || field.isRequired) payload[field.fieldName] = value;
      });

      entries.forEach(([key, value]) => {
        if (["leadSource", "leadMedium", "leadCampaign"].includes(key)) return;
        // A manual CSV override is already represented by the lead key. Keep
        // it when the university mapping does not contain that key (e.g.
        // CSV column -> Campus while the saved field is named campus).
        const mappedKey =
          customColumnApiMapping[key] ||
          columnMapping[key] ||
          (payloadFieldKeys.has(normalizeMappingToken(key)) || manualAcademicFieldKeys.has(normalizeMappingToken(key))
            ? key
            : "");
        if (mappedKey && !payload[mappedKey]) payload[mappedKey] = value;
      });
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__static_") && value && !payload[key.replace("__static_", "")]) {
          payload[key.replace("__static_", "")] = value;
        }
      });

      if (apiType === "meritto" || apiType === "nopaperforms") {
        if (selectedUniversity.college_id && !payload.college_id) {
          payload.college_id = selectedUniversity.college_id;
        }
        normalizeMerittoNoPaperFormsPayload(payload);
      }

      if (apiType === "leadsquared") {
        normalizeLeadSquaredTrackingFields(payload);
        ensureLeadSquaredTrackingFields(payload);
        return JSON.stringify(buildLeadSquaredAttributePayload(payload), null, 2);
      }

      const normalizedPayload = normalizeCustomUiPublisherPayload(payload);
      const finalPayload = selectedUniversity.payload_wrapper === "array" ? [normalizedPayload] : normalizedPayload;
      return JSON.stringify(finalPayload, null, 2);
    }

    if (apiType === "leadsquared") {
      const trackingPayload: Record<string, string> = {};
      entries.forEach(([key, value]) => {
        const mappedKey = customColumnApiMapping[key] || columnMapping[key] || key;
        trackingPayload[mappedKey] = value;
      });
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__static_") && value) {
          trackingPayload[key.replace("__static_", "")] = value;
        }
      });
      normalizeLeadSquaredTrackingFields(trackingPayload);
      ensureLeadSquaredTrackingFields(trackingPayload);
      return JSON.stringify(buildLeadSquaredAttributePayload(trackingPayload), null, 2);
    }

    if (apiType === "upgrad") {
      const upgradMeta: Record<string, string> = {};
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__upgrad_meta_") && value) upgradMeta[key.replace("__upgrad_meta_", "")] = value;
      });
      const get = (upgradField: string, fallbackField: string) => {
        const mappedKey = (columnMapping as any)[`__upgrad_src_${upgradField}`] || fallbackField;
        return (
          (lead as any)[mappedKey] ||
          (lead as any)[upgradField] ||
          (lead as any)[fallbackField] ||
          ""
        ).toString();
      };
      const fullName = (get("firstname", "name") || lead.name || "").trim();
      const parts = fullName.split(/\s+/).filter(Boolean);
      const firstname = (lead.firstname || parts.shift() || fullName || "Lead").trim();
      const lastname =
        lead.lastname ||
        ((columnMapping as any).__upgrad_src_lastname && (lead as any)[(columnMapping as any).__upgrad_src_lastname]) ||
        parts.join(" ") ||
        firstname;
      const phone = normalizeUpgradMobile(lead["phone.number"] || get("mobile", "mobile"));
      const course = (
        lead.course ||
        lead.programOfInterest ||
        get("course", "course") ||
        get("specialization", "specialization")
      )
        .toString()
        .trim();
      const upPayload: Record<string, unknown> = {
        firstname,
        lastname,
        email: get("email", "email"),
        phone: {
          number: phone.number,
          code: lead["phone.code"] || lead["phone.countryCode"] || phone.countryCode,
        },
        course,
        sendWelcomeMail: false,
        city: get("city", "city"),
        state: get("state", "state"),
        country: lead.country || upgradMeta.country || "India",
        isDetectLocation: false,
        affiliateSource: lead.affiliateSource || upgradMeta.affiliateSource || "aff_id=1&sub_aff_id=12",
        leadSource: {
          platform: lead["leadSource.platform"] || "",
          platformSection: lead["leadSource.platformSection"] || "",
        },
        extraFields: {
          chatLink: lead["extraFields.chatLink"] || upgradMeta.chatLink || "haptik.com/1234567",
        },
        emailTemplateSuffix: lead.emailTemplateSuffix || upgradMeta.emailTemplateSuffix || "in",
      };
      Object.entries(columnMapping).forEach(([k, v]) => {
        if (k.startsWith("__static_") && v) {
          const fullKey = k.replace("__static_", "");
          if (["extraFields.LSQID", "sendWelcomeMail", "isDetectLocation"].includes(fullKey)) return;
          if (fullKey.includes(".")) {
            const segs = fullKey.split(".");
            let cur: any = upPayload;
            for (let i = 0; i < segs.length - 1; i++) {
              if (typeof cur[segs[i]] !== "object" || cur[segs[i]] === null) cur[segs[i]] = {};
              cur = cur[segs[i]];
            }
            cur[segs[segs.length - 1]] = v;
          } else {
            (upPayload as any)[fullKey] = v;
          }
        }
      });
      return JSON.stringify(upPayload, null, 2);
    }

    if (apiType === "meritto" || apiType === "nopaperforms") {
      const payload: Record<string, string> = {
        secret_key: selectedUniversity.secret_key ? "[hidden]" : "",
        source: lead.leadSource?.trim() || selectedUniversity.source,
        medium: lead.leadMedium?.trim() || selectedUniversity.medium,
        campaign: lead.leadCampaign?.trim() || selectedUniversity.campaign,
      };

      entries.forEach(([key, value]) => {
        const mappedKey = customColumnApiMapping[key] || columnMapping[key] || key;
        if (!["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
          payload[mappedKey] = value;
        }
      });

      // Include static payload fields (e.g. access_key) and __static_* entries
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__static_") && value) {
          payload[key.replace("__static_", "")] = value;
        } else if (key.startsWith("__field_") && value) {
          try {
            const f = JSON.parse(value);
            if (f && f.fieldName && f.sourceType === "static" && f.staticValue) {
              payload[f.fieldName] = f.staticValue;
            }
          } catch {
            /* skip */
          }
        }
      });

      if (selectedUniversity.college_id && !payload.college_id) {
        payload.college_id = selectedUniversity.college_id;
      }
      normalizeMerittoNoPaperFormsPayload(payload);

      return JSON.stringify(payload, null, 2);
    }

    const payload: Record<string, string> = {};

    const hasSourceMapping = Object.keys(columnMapping).some((k) => k === "leadSource" || k === "source");
    const hasMediumMapping = Object.keys(columnMapping).some((k) => k === "leadMedium" || k === "medium");
    const hasCampaignMapping = Object.keys(columnMapping).some((k) => k === "leadCampaign" || k === "campaign");

    if (hasSourceMapping) {
      const sourceVal = lead.leadSource?.trim() || selectedUniversity.source || "";
      if (sourceVal) payload[columnMapping["leadSource"] || columnMapping["source"] || "source"] = sourceVal;
    }
    if (hasMediumMapping) {
      const mediumVal = lead.leadMedium?.trim() || selectedUniversity.medium || "";
      if (mediumVal) payload[columnMapping["leadMedium"] || columnMapping["medium"] || "medium"] = mediumVal;
    }
    if (hasCampaignMapping) {
      const campaignVal = lead.leadCampaign?.trim() || selectedUniversity.campaign || "";
      if (campaignVal) payload[columnMapping["leadCampaign"] || columnMapping["campaign"] || "campaign"] = campaignVal;
    }

    entries.forEach(([key, value]) => {
      if (!["leadSource", "leadMedium", "leadCampaign"].includes(key)) {
        if (customColumnApiMapping[key]) {
          payload[customColumnApiMapping[key]] = value;
          return;
        }
        if (columnMapping[key]) {
          payload[columnMapping[key]] = value;
          return;
        }
        payload[key] = value;
      }
    });

    if (columnMapping) {
      Object.entries(columnMapping).forEach(([key, value]) => {
        if (key.startsWith("__static_")) {
          payload[key.replace("__static_", "")] = value;
        }
      });
    }

    const normalizedPayload = normalizeCustomUiPublisherPayload(payload);
    const finalPayload = selectedUniversity.payload_wrapper === "array" ? [normalizedPayload] : normalizedPayload;
    return JSON.stringify(finalPayload, null, 2);
  };

  const handleUniversityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uni = safeUniversities.find((u) => u.id === e.target.value);
    setSelectedUniversityState(uni || null);
    persistence.setState({ selectedUniversityId: uni?.id || null });
    if (uni && onSelectUniversity) {
      onSelectUniversity(uni);
    }
    clearAll();
  };

  const handleRateLimitUpdate = (newRate: number) => {
    if (selectedUniversity) {
      setSelectedUniversityState({ ...selectedUniversity, leads_per_minute: newRate });
    }
  };

  const handleFileUploadEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUniversity) return;

    setFileName(file.name);

    if (onFileUpload) {
      onFileUpload(file.name);
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      // FileReader callbacks run outside React's event boundary. A malformed
      // CSV or a bad saved mapping must therefore be handled here explicitly;
      // otherwise the modal backdrop can remain mounted and look like a
      // white/black screen with no useful error.
      try {
        const text = typeof event.target?.result === "string" ? event.target.result : "";
        if (!text.trim()) throw new Error("The selected file is empty.");
        setCsvData(text);

        const isUpgradCsv = (selectedUniversity.api_type || "") === "upgrad";
        const { data, headers } = parseCSV(text, { preserveHeaders: isUpgradCsv });
      setCsvHeaders(headers);

      if (headers.length === 0 || data.length === 0) {
        setShowColumnMapping(false);
        delete (window as any).__pendingCsvData;
        setAlert({
          type: "error",
          message: "This CSV has no usable header or lead rows. Please use the university sample and try again.",
        });
        return;
      }

      // upGrad-specific pre-flight CSV validation (non-blocking warnings)
      if (isUpgradCsv) {
        const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
        const required = ["firstname", "email", "phone.number", "phone.code", "course"];
        const missing = required.filter((r) => !lowerHeaders.includes(r));
        const issues: string[] = [];
        if (missing.length) {
          issues.push(
            `Missing exact upGrad column(s): ${missing.join(", ")}. Download the upGrad sample and keep these JSON-style headers unchanged.`,
          );
        }
        const mobileKey = headers.find((h) => h.toLowerCase().trim() === "phone.number");
        const courseKey = headers.find((h) => h.toLowerCase().trim() === "course");
        let badMobiles = 0;
        let badCourses = 0;
        let emptyRows = 0;
        data.forEach((row) => {
          const allEmpty = Object.values(row).every((v) => !v || !String(v).trim());
          if (allEmpty) {
            emptyRows++;
            return;
          }
          if (mobileKey) {
            const digits = String(row[mobileKey] || "").replace(/\D/g, "");
            const normalized =
              digits.length === 12 && digits.startsWith("91")
                ? digits.slice(2)
                : digits.length === 11 && digits.startsWith("0")
                  ? digits.slice(1)
                  : digits;
            if (normalized.length !== 10) badMobiles++;
          }
          if (courseKey) {
            const v = String(row[courseKey] || "").trim();
            if (v && !/^[a-z0-9-]+$/.test(v)) badCourses++;
          }
        });
        if (badMobiles)
          issues.push(
            `${badMobiles} row(s) have mobile numbers that aren't 10-digit Indian format (will be auto-normalized; +91/0 prefixes stripped).`,
          );
        if (badCourses)
          issues.push(
            `${badCourses} row(s) use course values with spaces/special characters. Keep course exactly as upGrad JSON expects, e.g. entrepreneurship.`,
          );
        if (emptyRows) issues.push(`${emptyRows} empty row(s) detected - they will be skipped.`);
        if (issues.length) {
          setAlert({
            type: missing.length ? "error" : "warning",
            message: `upGrad CSV check: ${issues.join(" ")}`,
          });
          if (missing.length) return;
        }
      }

      const customColumnKeys = (selectedUniversity.customColumns || []).map((col) => ({
        key: col.columnKey?.toLowerCase(),
        name: col.columnName?.toLowerCase(),
        originalKey: col.columnKey,
      }));

      // Check for saved mapping for this university
      const savedMappingKey = `csv_mapping_${selectedUniversity.id}`;
      const savedMappingRaw = localStorage.getItem(savedMappingKey);
      let savedMapping: Record<string, string> | null = null;
      try {
        if (savedMappingRaw) {
          savedMapping = normalizeCsvMapping(JSON.parse(savedMappingRaw));
          // Replace old/bad cache immediately, so the same broken mapping
          // cannot crash the modal again on the next upload.
          localStorage.setItem(savedMappingKey, JSON.stringify(savedMapping));
        }
      } catch {
        /* ignore */
      }

      // ✅ FIX 2: Always show mapping dialog - pre-fill with saved mapping if available
      if (savedMapping && headers.every((h) => h in savedMapping)) {
        setLocalColumnMapping(savedMapping);
        setTempColumnMapping(savedMapping);
        (window as any).__pendingCsvData = data;
        setShowColumnMapping(true);
        return;
      }

      const initialMapping: Record<string, string> = {};
      const usedFields = new Set<string>();
      headers.forEach((header) => {
        const normalizedHeader = header.toLowerCase().trim();

        // University payload fields take priority over generic aliases. This is
        // essential when a partner needs both `program` and `course`: the old
        // generic mapper collapsed `program` into `course` and silently skipped
        // the real course column.
        const payloadTarget = getPayloadTargetForHeader(header, selectedUniversity.column_mapping || {});
        if (payloadTarget && !usedFields.has(payloadTarget)) {
          initialMapping[header] = payloadTarget;
          usedFields.add(payloadTarget);
          return;
        }

        if ((selectedUniversity.api_type || "") === "upgrad" && UPGRAD_EXACT_FIELDS.includes(header)) {
          initialMapping[header] = header;
          usedFields.add(header);
          return;
        }

        const matchedCustomCol = customColumnKeys.find(
          (col) => col.key === normalizedHeader || col.name === normalizedHeader,
        );
        if (matchedCustomCol && !usedFields.has(matchedCustomCol.originalKey)) {
          initialMapping[header] = matchedCustomCol.originalKey;
          usedFields.add(matchedCustomCol.originalKey);
          return;
        }

        const existingMappedKey = Object.entries(selectedUniversity.column_mapping || {}).find(([key, value]) => {
          const cleanKey = key.startsWith("__") ? "" : key.toLowerCase();
          const cleanValue = typeof value === "string" ? value.toLowerCase() : "";
          return cleanKey === normalizedHeader || cleanValue === normalizedHeader;
        });
        if (existingMappedKey && !existingMappedKey[0].startsWith("__") && !usedFields.has(existingMappedKey[0])) {
          initialMapping[header] = existingMappedKey[0];
          usedFields.add(existingMappedKey[0]);
        } else {
          let autoField = "";
          if (["name", "full_name", "fullname", "student_name", "student name"].includes(normalizedHeader)) {
            autoField = "name";
          } else if (
            ["email", "email_id", "emailaddress", "email_address", "email address"].includes(normalizedHeader)
          ) {
            autoField = "email";
          } else if (
            ["mobile", "phone", "mobile_number", "phone_number", "contact", "phone number", "mobile number"].includes(
              normalizedHeader,
            )
          ) {
            autoField = "mobile";
          } else if (["state", "state_name", "state name"].includes(normalizedHeader)) {
            autoField = "state";
          } else if (["city", "city_name", "city name"].includes(normalizedHeader)) {
            autoField = "city";
          } else if (["course", "program", "course_name", "course name", "programme"].includes(normalizedHeader)) {
            autoField = "course";
          } else if (["specialization", "specialisation", "branch", "stream", "spec"].includes(normalizedHeader)) {
            autoField = "specialization";
          } else if (["source", "lead_source", "utm_source", "lead source"].includes(normalizedHeader)) {
            autoField = "leadSource";
          } else if (["medium", "lead_medium", "utm_medium", "lead medium"].includes(normalizedHeader)) {
            autoField = "leadMedium";
          } else if (
            ["campaign", "campaign_name", "campaign_nanme", "campaign_namne", "lead_campaign", "utm_campaign", "lead campaign"].includes(
              normalizedHeader,
            )
          ) {
            autoField = "leadCampaign";
          } else if (["address", "full_address", "street_address", "full address"].includes(normalizedHeader)) {
            autoField = "address";
          }

          if (autoField && !usedFields.has(autoField)) {
            initialMapping[header] = autoField;
            usedFields.add(autoField);
          } else {
            initialMapping[header] = "";
          }
        }
      });

      // ✅ FIX 3: Set localColumnMapping (not persistence) so dialog edits work instantly
        setLocalColumnMapping(initialMapping);
        setShowColumnMapping(true);
        (window as any).__pendingCsvData = data;
      } catch (error) {
        console.error("[Lead Push] CSV parsing failed:", error);
        setShowColumnMapping(false);
        setShowSourceEntry(false);
        setPendingMapping(null);
        setLocalColumnMapping({});
        delete (window as any).__pendingCsvData;
        setAlert({
          type: "error",
          message: error instanceof Error ? error.message : "The CSV could not be parsed. Please re-save it as UTF-8 CSV and try again.",
        });
      }
    };

    reader.readAsText(file);
    reader.onerror = () => {
      setShowColumnMapping(false);
      delete (window as any).__pendingCsvData;
      setAlert({ type: "error", message: "The CSV could not be read. Please re-save it as UTF-8 CSV and try again." });
    };
  };

  // ✅ FIX 4: Accept mappingOverride so the "Apply" button passes localColumnMapping directly
  const applyColumnMappingAndProcess = useCallback(
    (mappingOverride?: Record<string, string>) => {
      const rawData = (window as any).__pendingCsvData;
      if (!rawData || !selectedUniversity) {
        setShowColumnMapping(false);
        setAlert({ type: "error", message: "The CSV preview expired. Please upload the file again." });
        return;
      }

      try {

      const activeMapping = normalizeCsvMapping(mappingOverride ?? tempColumnMapping);
      if (!Array.isArray(rawData) || rawData.length === 0) {
        setAlert({
          type: "error",
          message:
            "No lead rows found in this file. Please upload a CSV or tab-separated file with at least one data row.",
        });
        return;
      }

      const fixedDefaults: Record<string, string> = {};
      Object.entries(selectedUniversity.column_mapping || {}).forEach(([key, value]) => {
        if (key.startsWith("__fixed_") && value) {
          fixedDefaults[key.replace("__fixed_", "")] = value;
        }
      });

      // Persist the mapping to localStorage for next upload
      const savedMappingKey = `csv_mapping_${selectedUniversity.id}`;
      localStorage.setItem(savedMappingKey, JSON.stringify(activeMapping));
      // Also sync to persistence state
      setTempColumnMapping(activeMapping);

      const mappedLeads: Lead[] = rawData.map((row: Record<string, string>) => {
        const lead: Partial<Lead> = { ...fixedDefaults };

        Object.entries(activeMapping).forEach(([csvHeader, targetField]) => {
          const value = row[csvHeader];
          if (value && targetField && targetField.trim() !== "") {
            (lead as any)[targetField] = value;

            // Mirror payload-field aliases back to canonical lead fields so
            // validation (which reads lead.email/mobile/name) doesn't flag them as Missing.
            const tf = targetField.toLowerCase();
            if (!lead.email && ["emailid", "email_id", "emailaddress", "email_address", "email", "emailaddress1"].includes(tf)) {
              lead.email = value;
            }
            if (!lead.mobile && ["phone", "phonenumber", "phone_number", "mobilenumber", "mobile_number", "contact", "contactnumber", "mobile", "mobile_no"].includes(tf)) {
              lead.mobile = value;
            }
            if (!lead.name && ["fullname", "full_name", "studentname", "student_name", "firstname", "name", "studentname1"].includes(tf)) {
              lead.name = value;
            }
          }
        });

        const locationValue = row.location || row.Location || row.LOCATION || "";
        if (locationValue && (!lead.city?.trim() || !lead.state?.trim())) {
          const [cityPart, ...stateParts] = locationValue
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          if (!lead.city?.trim() && cityPart) lead.city = cityPart;
          if (!lead.state?.trim() && stateParts.length > 0) lead.state = stateParts.join(", ");
        }

        if ((selectedUniversity.api_type || "") === "upgrad") {
          if (!lead.firstname?.trim() && lead.name?.trim()) {
            const [first, ...rest] = lead.name.trim().split(/\s+/);
            lead.firstname = first || "";
            lead.lastname = lead.lastname || rest.join(" ") || first || "";
          }
          if (!lead.name?.trim()) lead.name = [lead.firstname, lead.lastname].filter(Boolean).join(" ").trim();
        }

        if (!lead.leadSource?.trim() && selectedUniversity.source?.trim()) lead.leadSource = selectedUniversity.source;
        if (!lead.leadMedium?.trim() && selectedUniversity.medium?.trim()) lead.leadMedium = selectedUniversity.medium;
        if (!lead.leadCampaign?.trim() && selectedUniversity.campaign?.trim())
          lead.leadCampaign = selectedUniversity.campaign;

        return normalizeLeadRow(normalizeUpgradLead(lead as Lead));
      });

      const payloadMap = new Map<number, string>();
      mappedLeads.forEach((lead, idx) => {
        payloadMap.set(idx, buildMappedPayloadPreview(lead));
      });
      setLeadPayloads(payloadMap);

      const validationConfig = buildValidationConfigFromUniversity({
        customColumns: selectedUniversity.customColumns,
      });

      const { invalidLeads, hasDuplicates } = validateLeads(mappedLeads, validationConfig);

      const errorMap = new Map<number, string[]>();
      invalidLeads.forEach(({ index, errors }) => {
        errorMap.set(index, errors);
      });

      setValidationErrors(errorMap);

      if (invalidLeads.length > 0) {
        setAlert({
          type: "warning",
          message: `${invalidLeads.length} lead(s) have validation errors. ${hasDuplicates ? "Duplicates detected!" : ""} Review and fix before processing.`,
        });
      } else if (hasDuplicates) {
        setAlert({
          type: "warning",
          message: "Duplicate emails or mobile numbers detected in CSV. These may be rejected by the API.",
        });
      }

      setLeads(mappedLeads);
      setLeadStatuses(new Map());
      setLeadResponses(new Map());
      setDbDuplicates(new Set());
      setProcessedCount(0);
      currentIndexRef.current = 0;
      setShowColumnMapping(false);
      setLocalColumnMapping({});
        delete (window as any).__pendingCsvData;
      } catch (error) {
        console.error("[Lead Push] Mapping failed:", error);
        setShowColumnMapping(false);
        setShowSourceEntry(false);
        setPendingMapping(null);
        delete (window as any).__pendingCsvData;
        setAlert({
          type: "error",
          message: error instanceof Error ? error.message : "The column mapping could not be applied. Please upload the CSV again.",
        });
      }
    },
    [
      selectedUniversity,
      tempColumnMapping,
      buildMappedPayloadPreview,
      setLeadPayloads,
      setValidationErrors,
      setLeads,
      setLeadStatuses,
      setLeadResponses,
      setDbDuplicates,
      setProcessedCount,
      setTempColumnMapping,
      normalizeUpgradLead,
    ],
  );

  useEffect(() => {
    applyColumnMappingAndProcessRef.current = applyColumnMappingAndProcess;
  }, [applyColumnMappingAndProcess]);

  const checkDbDuplicates = async () => {
    if (!selectedUniversity || leads.length === 0) return;

    setIsCheckingDuplicates(true);
    try {
      const { emails, mobiles } = await checkDatabaseDuplicates(leads, selectedUniversity.id, supabase);

      const duplicateIndices = new Set<number>();
      leads.forEach((lead, index) => {
        const normalizedEmail = lead.email?.trim().toLowerCase();
        const normalizedMobile = lead.mobile?.replace(/[\s\-().+]/g, "");

        if ((normalizedEmail && emails.has(normalizedEmail)) || (normalizedMobile && mobiles.has(normalizedMobile))) {
          duplicateIndices.add(index);
        }
      });

      setDbDuplicates(duplicateIndices);

      if (duplicateIndices.size > 0) {
        setAlert({
          type: "warning",
          message: `Found ${duplicateIndices.size} lead(s) that already exist in database. You can skip or process them.`,
        });
      } else {
        setAlert({
          type: "success",
          message: "No duplicates found in database. Ready to process!",
        });
      }
    } catch (error) {
      console.error("Error checking duplicates:", error);
      setAlert({ type: "error", message: "Failed to check for duplicates" });
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleUpdateLead = (index: number, updatedLead: Lead) => {
    const newLeads = [...leads];
    newLeads[index] = updatedLead;
    setLeads(newLeads);

    const newPayloads = new Map(leadPayloads);
    newPayloads.set(index, buildMappedPayloadPreview(updatedLead));
    setLeadPayloads(newPayloads);

    const validationConfig = selectedUniversity
      ? buildValidationConfigFromUniversity({
          customColumns: selectedUniversity.customColumns,
        })
      : undefined;
    const { invalidLeads } = validateLeads([updatedLead], validationConfig);
    const newErrors = new Map(validationErrors);

    if (invalidLeads.length > 0) {
      newErrors.set(index, invalidLeads[0].errors);
    } else {
      newErrors.delete(index);
    }

    setValidationErrors(newErrors);
  };

  const exportFailedLeads = () => {
    const failedLeads = leads.filter((_, index) => leadStatuses.get(index) === "failed");
    if (failedLeads.length === 0) return;

    const csvContent = generateLeadsCSV(failedLeads);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `failed_leads_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleCSV = () => {
    const isUpgrad = (selectedUniversity?.api_type || "") === "upgrad";
    const content = isUpgrad ? UPGRAD_EXACT_SAMPLE_CSV : generateSampleCSV();
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isUpgrad ? "upgrad_sample_leads.csv" : "sample_leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const createBatch = async (status: string = "processing") => {
    if (!selectedUniversity) return null;

    // Don't save CSV data to reduce storage usage
    const { data, error } = await supabase
      .from("upload_batches")
      .insert({
        university_id: selectedUniversity.id,
        file_name: fileName,
        total_leads: leads.length,
        csv_data: null, // No longer saving CSV to reduce cloud storage
        status,
        is_paused: false,
        is_cancelled: false,
        processed_count: 0,
        current_lead_index: 0,
        source_label: sourceLabel.trim() || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create batch: ${error.message}`);
    return data.id;
  };

  // Frontend-driven processing. Lead payloads are not stored in public.leads;
  // only the batch history, counters, and aggregate statistics are persisted.
  const startBackgroundProcessing = async () => {
    if (!selectedUniversity || leads.length === 0) return;

    processingRef.current = true;
    const runId = ++activeRunIdRef.current;
    setIsProcessing(true);
    setStartTime(Date.now());
    setAlert({
      type: "info",
      message: `Processing ${leads.length} leads (${pushConcurrency} at a time)...`,
    });

    try {
      const newBatchId = await createBatch("processing");
      if (!newBatchId) {
        setAlert({ type: "error", message: "Failed to create batch" });
        setIsProcessing(false);
        processingRef.current = false;
        return;
      }
      setBatchId(newBatchId);

      const apiConfig = getApiConfig();
      const statuses = new Map<number, LeadProcessingStatus>();
      const responses = new Map<number, string>();
      let processed = 0;
      let nextLeadIndex = 0;
      const workerCount = Math.min(pushConcurrency, leads.length);
      // Claim one lead per worker so Pause takes effect after only the currently
      // active request (at most pushConcurrency leads), never a hidden packet.
      const packetSize = 1;

      // Each worker still sends exactly one lead per request. The per-run control
      // only changes how many independent requests may be in flight together.
      const leadWorker = async () => {
        while (processingRef.current) {
          while (pausedRef.current && processingRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
          if (!processingRef.current) return;

          const packetStart = nextLeadIndex;
          if (packetStart >= leads.length) return;
          nextLeadIndex = Math.min(nextLeadIndex + packetSize, leads.length);
          const packet = leads
            .slice(packetStart, nextLeadIndex)
            .map((lead, offset) => ({ lead, index: packetStart + offset }));

          packet.forEach(({ index }) => {
            statuses.set(index, "pending");
            responses.set(index, "Waiting for partner response...");
          });
          setLeadStatuses(new Map(statuses));
          setLeadResponses(new Map(responses));

          const controller = new AbortController();
          activePacketControllersRef.current.add(controller);
          const results = await processLeadPacket(packet, newBatchId, apiConfig, controller.signal);
          activePacketControllersRef.current.delete(controller);

          // Stop starts a new run generation and aborts active requests. Never
          // let late responses mutate progress or produce a false completion.
          if (runId !== activeRunIdRef.current || !processingRef.current || controller.signal.aborted) return;
          packet.forEach(({ index }, resultIndex) => {
            const result = results[resultIndex];
            const status: LeadProcessingStatus =
              result.status === "Success" ? "success" : result.status === "Duplicate" ? "duplicate" : "failed";
            statuses.set(index, status);
            responses.set(index, result.response);
          });

          processed += packet.length;
          currentIndexRef.current = processed;
          setLeadStatuses(new Map(statuses));
          setLeadResponses(new Map(responses));
          setProcessedCount(processed);
        }
      };

      await Promise.all(Array.from({ length: workerCount }, () => leadWorker()));

      if (runId !== activeRunIdRef.current || !processingRef.current) return;

      // Ensure partial final groups are always visible.
      setLeadStatuses(new Map(statuses));
      setLeadResponses(new Map(responses));
      setProcessedCount(processed);

      // Mark batch complete
      if (processingRef.current) {
        await supabase
          .from("upload_batches")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            processed_count: processed,
          })
          .eq("id", newBatchId);
      }

      processingRef.current = false;
      setIsProcessing(false);

      const successCount = [...statuses.values()].filter((s) => s === "success").length;
      const failCount = [...statuses.values()].filter((s) => s === "failed").length;
      const dupCount = [...statuses.values()].filter((s) => s === "duplicate").length;

      setAlert({
        type: failCount === 0 ? "success" : "info",
        message: `Complete! Success: ${successCount}, Failed: ${failCount}, Duplicate: ${dupCount}`,
      });
    } catch (error) {
      console.error("Processing error:", error);
      setAlert({
        type: "error",
        message: error instanceof Error ? error.message : `Processing failed: ${String(error)}`,
      });
      processingRef.current = false;
      setIsProcessing(false);
    }
  };

  // Scheduling would require storing lead payloads until the scheduled time.
  // Lead Push is configured as no-lead-storage, so scheduled pushes are blocked.
  const scheduleProcessing = async (scheduledAt: Date) => {
    if (!selectedUniversity || leads.length === 0) return;

    setIsScheduling(true);
    try {
      setAlert({
        type: "error",
        message: `Scheduling is disabled because it requires saving lead data until ${scheduledAt.toLocaleString()}. Use Push Now for no-storage lead pushing.`,
      });
    } catch (error) {
      console.error("Schedule error:", error);
      setAlert({ type: "error", message: "Failed to schedule: " + String(error) });
    } finally {
      setIsScheduling(false);
      setShowScheduleModal(false);
    }
  };

  // Pre-compute apiConfig once per university to avoid redundant work per lead
  const getApiConfig = useCallback(() => {
    if (!selectedUniversity) return null;
    const customColumnApiMapping: Record<string, string> = {};
    (selectedUniversity.customColumns || []).forEach((col: any) => {
      if (col.columnKey && col.apiFieldName) {
        customColumnApiMapping[col.columnKey] = col.apiFieldName;
      }
    });

    return {
      apiUrl: selectedUniversity.api_url,
      secretKey: selectedUniversity.secret_key,
      collegeId: selectedUniversity.college_id,
      source: selectedUniversity.source,
      medium: selectedUniversity.medium,
      campaign: selectedUniversity.campaign,
      apiType: selectedUniversity.api_type || "nopaperforms",
      columnMapping: selectedUniversity.column_mapping || {},
      customColumnMapping: customColumnApiMapping,
      payloadWrapper: selectedUniversity.payload_wrapper || "object",
      authType: selectedUniversity.auth_type || "secret_key",
      authHeaderKey: selectedUniversity.auth_header_key || "",
      authHeaderValue: selectedUniversity.auth_header_value || "",
      customHeaders: selectedUniversity.custom_headers || {},
      apiTimeoutSeconds:
        clampUniversityNumber(selectedUniversity.api_timeout_seconds, 30, 5, 300),
      universityDefaults: {},
    };
  }, [selectedUniversity]);

  // Direct edge function call - no leads table insert
  const processLead = async (
    lead: Lead,
    _index: number,
    batchIdParam: string,
    precomputedApiConfig?: ReturnType<typeof getApiConfig>,
  ): Promise<{ success: boolean; status: string; response: string }> => {
    if (!selectedUniversity) return { success: false, status: "Fail", response: "No university selected" };

    try {
      const apiConfig = precomputedApiConfig || getApiConfig();

      const { data, error } = await supabase.functions.invoke("process-lead", {
        body: {
          universityId: selectedUniversity.id,
          batchId: batchIdParam,
          sourceLabel: sourceLabel.trim() || null,
          leadData: {
            ...lead,
            leadSource: lead.leadSource || selectedUniversity.source,
            leadMedium: lead.leadMedium || selectedUniversity.medium,
            leadCampaign: lead.leadCampaign || selectedUniversity.campaign,
          },
          apiConfig,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        return { success: false, status: "Fail", response: error.message };
      }

      return {
        success: normalizePartnerStatus(data?.status) === "Success",
        status: normalizePartnerStatus(data?.status),
        response: normalizePartnerResponse(data?.response),
      };
    } catch (error) {
      console.error("Process lead error:", error);
      return { success: false, status: "Fail", response: String(error) };
    }
  };

  // Amortize Edge Function startup and database guard/counter work across a
  // small packet. The Edge Function still POSTs each lead separately to the
  // partner; concurrency controls only how many of those POSTs overlap.
  const processLeadPacket = async (
    packet: Array<{ lead: Lead; index: number }>,
    batchIdParam: string,
    apiConfig: ReturnType<typeof getApiConfig>,
    signal?: AbortSignal,
  ): Promise<Array<{ success: boolean; status: string; response: string }>> => {
    if (!selectedUniversity || !apiConfig) {
      return packet.map(() => ({ success: false, status: "Fail", response: "No university selected" }));
    }

    const tasks = packet.map(({ lead }) => ({
      universityId: selectedUniversity.id,
      batchId: batchIdParam,
      sourceLabel: sourceLabel.trim() || null,
      leadData: {
        ...lead,
        leadSource: lead.leadSource || selectedUniversity.source,
        leadMedium: lead.leadMedium || selectedUniversity.medium,
        leadCampaign: lead.leadCampaign || selectedUniversity.campaign,
      },
      apiConfig,
    }));

    try {
      const { data, error } = await supabase.functions.invoke("process-lead", {
        body: { tasks, concurrency: 1 },
        signal,
      });
      if (error) throw error;
      const results = Array.isArray(data?.results) ? data.results : [];
      return packet.map((_, index) => {
        const result = results[index] || {};
        return {
          success: normalizePartnerStatus(result.status) === "Success",
          status: normalizePartnerStatus(result.status),
          response: normalizePartnerResponse(result.response),
        };
      });
    } catch (error) {
      if (signal?.aborted) {
        return packet.map(() => ({ success: false, status: "Cancelled", response: "Processing stopped" }));
      }
      console.error("Process lead packet error:", error);
      return packet.map(() => ({ success: false, status: "Fail", response: String(error) }));
    }
  };

  const checkBatchStatus = async (batchIdToCheck: string): Promise<{ isPaused: boolean; isCancelled: boolean }> => {
    const { data } = await supabase
      .from("upload_batches")
      .select("is_paused, is_cancelled")
      .eq("id", batchIdToCheck)
      .maybeSingle();
    return {
      isPaused: data?.is_paused ?? false,
      isCancelled: data?.is_cancelled ?? false,
    };
  };

  const processLeads = useCallback(async () => {
    if (!selectedUniversity || leads.length === 0) return;

    if (!sourceLabel.trim()) {
      setAlert({
        type: "error",
        message: "Please enter a Source of Data before pushing (e.g. 'Meta Ads – Jan campaign').",
      });
      return;
    }
    try {
      localStorage.setItem("upload:lastSourceLabel", sourceLabel.trim());
    } catch {
      /* ignore */
    }

    setAlert({
      type: "info",
      message: `Queuing ${leads.length} leads for background processing...`,
    });
    await startBackgroundProcessing();
  }, [selectedUniversity, leads, startBackgroundProcessing, sourceLabel]);

  const pauseProcessing = async () => {
    pausedRef.current = true;
    setIsPaused(true);
    setAlert({ type: "info", message: "Processing paused. Click resume to continue." });
    if (batchId) {
      supabase.from("upload_batches").update({ is_paused: true, status: "paused" }).eq("id", batchId).then();
    }
  };

  const resumeProcessing = async () => {
    pausedRef.current = false;
    setIsPaused(false);
    setAlert(null);
    if (batchId) {
      await supabase.from("upload_batches").update({ is_paused: false, status: "processing" }).eq("id", batchId);
    }
  };

  const stopProcessing = async () => {
    processingRef.current = false;
    pausedRef.current = false;
    activeRunIdRef.current++;
    activePacketControllersRef.current.forEach((controller) => controller.abort());
    activePacketControllersRef.current.clear();
    setIsProcessing(false);
    setIsPaused(false);
    setIsBackgroundPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setAlert({ type: "info", message: "Processing stopped. Remaining leads cancelled." });
    if (batchId) {
      supabase.from("upload_batches").update({ status: "cancelled", is_cancelled: true }).eq("id", batchId).then();
    }
  };

  const retryLead = async (index: number) => {
    if (!selectedUniversity || !batchId) return;

    const statuses = new Map(leadStatuses);
    const responses = new Map(leadResponses);
    statuses.set(index, "pending");
    setLeadStatuses(new Map(statuses));

    const lead = leads[index];
    const result = await processLead(lead, index, batchId);

    const retryStatus =
      result.status === "Success" ? "success" : result.status === "Duplicate" ? "duplicate" : "failed";
    statuses.set(index, retryStatus);
    responses.set(index, result.response);
    setLeadStatuses(new Map(statuses));
    setLeadResponses(new Map(responses));
  };

  const bulkRetryFailed = async () => {
    if (!selectedUniversity || !batchId) return;

    setIsProcessing(true);
    const statuses = new Map(leadStatuses);
    const responses = new Map(leadResponses);
    const failedIndices = [...statuses.entries()].filter(([_, s]) => s === "failed").map(([i]) => i);
    const precomputedApiConfig = getApiConfig();
    failedIndices.forEach((index) => statuses.set(index, "pending"));
    setLeadStatuses(new Map(statuses));

    let retryCursor = 0;
    let retryCompleted = 0;
    const retryWorker = async () => {
      while (true) {
        const index = failedIndices[retryCursor++];
        if (index === undefined) return;
        const result = await processLead(leads[index], index, batchId, precomputedApiConfig);
        const bulkRetryStatus =
          result.status === "Success" ? "success" : result.status === "Duplicate" ? "duplicate" : "failed";
        statuses.set(index, bulkRetryStatus);
        responses.set(index, result.response);
        retryCompleted++;
        setLeadStatuses(new Map(statuses));
        setLeadResponses(new Map(responses));
      }
    };

    await Promise.all(Array.from({ length: Math.min(pushConcurrency, failedIndices.length) }, () => retryWorker()));

    setIsProcessing(false);
    const successCount = [...statuses.values()].filter((s) => s === "success").length;
    const stillFailed = [...statuses.values()].filter((s) => s === "failed").length;
    setAlert({
      type: stillFailed === 0 ? "success" : "info",
      message: `Retry complete! ${successCount} total succeeded, ${stillFailed} still failed.`,
    });
  };

  const clearAll = () => {
    processingRef.current = false;
    pausedRef.current = false;
    activeRunIdRef.current++;
    activePacketControllersRef.current.forEach((controller) => controller.abort());
    activePacketControllersRef.current.clear();
    setIsBackgroundPolling(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setLeads([]);
    setFileName("");
    setCsvData("");
    setLeadStatuses(new Map());
    setLeadResponses(new Map());
    setLeadPayloads(new Map());
    setValidationErrors(new Map());
    setDbDuplicates(new Set());
    setProcessedCount(0);
    setBatchId(null);
    setIsProcessing(false);
    setIsPaused(false);
    setPushConcurrency(
      selectedUniversity
        ? clampUniversityNumber(selectedUniversity.default_push_concurrency, 2, 1, 5)
        : 2,
    );
    setIsConcurrencyUnlocked(false);
    setShowConcurrencyPin(false);
    setConcurrencyPin("");
    setConcurrencyPinError("");
    setStartTime(null);
    currentIndexRef.current = 0;
    setCsvHeaders([]);
    setTempColumnMapping({});
    // ✅ FIX 5: Reset local mapping state on clear
    setLocalColumnMapping({});
    setShowColumnMapping(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePurgeCache = async () => {
    setIsPurgingCache(true);

    try {
      clearAll();
      persistence.resetAll();
      appCache.reset();
      purgeStorageEntries(localStorage, LOCAL_STORAGE_PURGE_KEYS, LOCAL_STORAGE_PURGE_PREFIXES);
      purgeStorageEntries(sessionStorage, SESSION_STORAGE_PURGE_KEYS, SESSION_STORAGE_PURGE_PREFIXES);
      await purgeBrowserCacheStorage();

      setSourceLabel("");
      setPendingSourceLabel("");
      setPendingDataDescription("");
      setPendingMapping(null);
      setShowSourceEntry(false);
      setAlert({
        type: "success",
        message: "Cache purged. Upload state, mappings, stale page cache, and browser cache were cleared.",
      });
    } catch (error) {
      console.error("Failed to purge upload cache:", error);
      setAlert({
        type: "error",
        message: "Could not purge all cache. Please refresh and try again.",
      });
    } finally {
      setIsPurgingCache(false);
    }
  };

  const handlePageSizeChange = (size: number | "custom") => {
    if (size === "custom") {
      const customVal = parseInt(customPageSize, 10);
      if (customVal > 0 && customVal <= leads.length) {
        setPageSize(customVal);
      }
    } else {
      setPageSize(size);
    }
  };

  const rawFailedCount = [...leadStatuses.values()].filter((s) => s === "failed").length;
  const duplicateCount = [...leadStatuses.values()].filter((s) => s === "duplicate").length;
  const successCount = [...leadStatuses.values()].filter((s) => s === "success").length;
  const failedCount = rawFailedCount + duplicateCount;
  const processedDisplayCount = successCount + failedCount;
  const pendingCount = Math.max(leads.length - processedDisplayCount, 0);

  const getEstimatedTime = () => {
    if (!startTime || !selectedUniversity) return null;
    const hasStableSample = processedDisplayCount >= 8;
    const elapsed = (Date.now() - startTime) / 1000;
    // Before two packets complete, use configured throughput instead of a
    // cold-start sample. ETA remains visible, then becomes measured/live.
    const configuredPerLead = 60 / Math.max(1, (selectedUniversity.leads_per_minute || 60) * pushConcurrency);
    const avgTimePerLead = hasStableSample ? elapsed / processedDisplayCount : configuredPerLead;
    const secondsRemaining = Math.round(pendingCount * avgTimePerLead);
    const prefix = hasStableSample ? "" : "Initial estimate: ";

    if (secondsRemaining < 60) return `${prefix}${secondsRemaining}s remaining`;
    if (secondsRemaining < 3600) return `${prefix}${Math.round(secondsRemaining / 60)}m remaining`;
    return `${prefix}${Math.round(secondsRemaining / 3600)}h ${Math.round((secondsRemaining % 3600) / 60)}m remaining`;
  };

  const hasOpenUploadModal =
    showColumnMapping || showConcurrencyPin || showSourceEntry || showScheduleModal || showSingleLeadForm;
  // The fixed action bars previously used the maximum possible z-index and sat
  // above the mapping dialog. On some screens that left only the dark backdrop
  // visible, which looked like the page had blacked out.
  const showUploadActionBar = Boolean(selectedUniversity || currentFileName || fileName) && !hasOpenUploadModal;
  const hasLoadedLeads = leads.length > 0;
  const isAllProcessed = leads.length > 0 && processedDisplayCount >= leads.length;

  return (
    <div className={`space-y-6 ${showUploadActionBar ? "pt-24 pb-32" : ""}`}>
      {alert && (
        <div className="mb-6">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      {showUploadActionBar &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div className="fixed inset-x-0 top-0 z-40 border-b border-border bg-card px-4 py-3 shadow-2xl">
              <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {!hasLoadedLeads
                      ? selectedUniversity
                        ? currentFileName || fileName
                          ? `CSV selected: ${currentFileName || fileName}`
                          : "Select a CSV to push leads"
                        : "Loading upload controls..."
                      : isProcessing
                        ? `Pushing leads: ${processedDisplayCount} / ${leads.length}`
                        : isAllProcessed
                          ? `All visible leads processed: ${processedDisplayCount} / ${leads.length}`
                          : `Ready to push ${leads.length} lead(s)`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasValidationErrors
                      ? "Fix validation errors before pushing."
                      : hasLoadedLeads
                        ? "Action buttons stay visible here while you review the preview."
                        : selectedUniversity
                          ? "Upload or re-select the CSV file to load leads and enable pushing."
                          : "Please wait while the university setup loads."}
                  </p>
                </div>

                {hasLoadedLeads && (
                  <div className="mb-3 w-full sm:max-w-md">
                    <label className="mb-1 block text-xs font-medium text-foreground">
                      Source of Data <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={sourceLabel}
                      onChange={(e) => setSourceLabel(e.target.value)}
                      placeholder="e.g. Meta Ads – Jan campaign, Justdial export 2026-03"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Saved on the batch so you can find this push later by source name.
                    </p>
                  </div>
                )}

                {!hasLoadedLeads ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!selectedUniversity}
                    className="btn-primary flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <Upload className="h-5 w-5" />
                    Upload CSV
                  </button>
                ) : !isProcessing ? (
                  <button
                    onClick={processLeads}
                    disabled={hasValidationErrors || leads.length === 0 || isAllProcessed}
                    className="btn-success flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <Rocket className="h-5 w-5" />
                    Continue & Push Leads
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    {isPaused ? (
                      <button
                        onClick={resumeProcessing}
                        className="btn-success flex min-h-12 items-center justify-center gap-2"
                      >
                        <Play className="h-5 w-5" />
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseProcessing}
                        className="btn-primary flex min-h-12 items-center justify-center gap-2"
                      >
                        <Pause className="h-5 w-5" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={stopProcessing}
                      className="flex min-h-12 items-center justify-center rounded-lg bg-destructive px-5 font-medium text-destructive-foreground"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>

            {hasLoadedLeads && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-4 py-3 shadow-2xl">
                <div className="mx-auto flex max-w-6xl justify-end">
                  {!isProcessing ? (
                    <button
                      onClick={processLeads}
                      disabled={hasValidationErrors || leads.length === 0 || isAllProcessed}
                      className="btn-success flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      <Rocket className="h-5 w-5" />
                      Continue & Push Leads
                    </button>
                  ) : (
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
                      {isPaused ? (
                        <button
                          onClick={resumeProcessing}
                          className="btn-success flex min-h-12 items-center justify-center gap-2"
                        >
                          <Play className="h-5 w-5" />
                          Resume
                        </button>
                      ) : (
                        <button
                          onClick={pauseProcessing}
                          className="btn-primary flex min-h-12 items-center justify-center gap-2"
                        >
                          <Pause className="h-5 w-5" />
                          Pause
                        </button>
                      )}
                      <button
                        onClick={stopProcessing}
                        className="flex min-h-12 items-center justify-center rounded-lg bg-destructive px-5 font-medium text-destructive-foreground"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>,
          document.body,
        )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Upload Leads</h2>
          <p className="text-muted-foreground">Select a university and upload student leads via CSV</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePurgeCache}
            disabled={isPurgingCache}
            title="Purge upload cache"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            {isPurgingCache ? "Purging..." : "Purge Cache"}
          </button>
          {selectedUniversity?.sample_csv_content && (
            <button
              onClick={() => {
                const blob = new Blob([selectedUniversity.sample_csv_content!], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${selectedUniversity.name}_sample.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex items-center gap-2 text-success hover:underline font-medium"
            >
              <Download className="h-5 w-5" />
              {selectedUniversity.name} Sample
            </button>
          )}
          <button onClick={downloadSampleCSV} className="flex items-center gap-2 text-primary hover:underline">
            <Download className="h-5 w-5" />
            Generic Sample
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Panel - Upload */}
        <div className="lg:col-span-2 space-y-6">
          {/* University Selection */}
          <div className="card-elevated p-6">
            <h3 className="font-medium text-foreground mb-4">Select University</h3>
            <select
              value={selectedUniversity?.id || ""}
              onChange={handleUniversityChange}
              className="input-field"
              disabled={isProcessing}
            >
              <option value="">Choose a university...</option>
              {safeUniversities.map((uni) => (
                <option key={uni.id} value={uni.id}>
                  {uni.name}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload & Single Lead Options */}
          {selectedUniversity && (
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-foreground">Upload Leads CSV</h3>
                <button
                  onClick={() => setShowSingleLeadForm(true)}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" />
                  Add Single Lead
                </button>
              </div>
              <div
                className={`upload-zone ${isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                onClick={() => !isProcessing && fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-10 w-10 text-primary mb-3" />
                {fileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-foreground font-medium">{fileName}</span>
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  </div>
                ) : (
                  <>
                    <p className="text-foreground font-medium mb-1">Drop your CSV file here or click to browse</p>
                    <p className="text-sm text-primary">
                      {(selectedUniversity.api_type || "") === "upgrad"
                        ? "Columns: firstname, lastname, email, phone.number, phone.code, course"
                        : "Columns: Name, Email, Mobile, State, City, Course, Specialization"}
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUploadEvent}
                className="hidden"
                disabled={isProcessing}
              />
            </div>
          )}

          {leads.length > 0 && (
            <div className="sticky top-4 z-20 rounded-lg border border-border bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isProcessing
                      ? `Pushing leads: ${processedDisplayCount} / ${leads.length}`
                      : `Ready to push ${leads.length} lead(s)`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedUniversity.api_type || "") === "upgrad"
                      ? "upGrad payload preview below matches the nested JSON sent to the API."
                      : "Review the preview below before pushing."}
                  </p>
                </div>

                {!isProcessing ? (
                  <button
                    onClick={processLeads}
                    disabled={hasValidationErrors || leads.length === 0 || processedDisplayCount === leads.length}
                    className="btn-success flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Rocket className="h-5 w-5" />
                    Continue & Push Leads
                  </button>
                ) : (
                  <div className="flex gap-2">
                    {isPaused ? (
                      <button onClick={resumeProcessing} className="btn-success flex items-center justify-center gap-2">
                        <Play className="h-5 w-5" />
                        Resume
                      </button>
                    ) : (
                      <button onClick={pauseProcessing} className="btn-primary flex items-center justify-center gap-2">
                        <Pause className="h-5 w-5" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={stopProcessing}
                      className="rounded-lg bg-destructive px-4 py-3 font-medium text-destructive-foreground"
                    >
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Table */}
          {leads.length > 0 && (
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-foreground">Lead Preview ({leads.length} records)</h3>
                  {hasValidationErrors && (
                    <p className="text-xs text-warning flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      {validationErrors.size} lead(s) have errors - click edit to fix
                    </p>
                  )}
                  {dbDuplicates.size > 0 && (
                    <p className="text-xs text-warning flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      {dbDuplicates.size} duplicate(s) found in database
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {failedCount > 0 && !isProcessing && (
                    <button
                      onClick={exportFailedLeads}
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <FileDown className="h-4 w-4" />
                      Export Failed
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="text-sm text-destructive hover:underline"
                    disabled={isProcessing}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {processedDisplayCount === 0 && (
                <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
                  <button
                    onClick={checkDbDuplicates}
                    disabled={isCheckingDuplicates}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Search className="h-4 w-4" />
                    {isCheckingDuplicates ? "Checking..." : "Check Database Duplicates"}
                  </button>
                  {dbDuplicates.size > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Duplicate action:</span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={duplicateAction === "skip"}
                          onChange={() => setDuplicateAction("skip")}
                          className="accent-primary"
                        />
                        <span>Skip</span>
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={duplicateAction === "process"}
                          onChange={() => setDuplicateAction("process")}
                          className="accent-primary"
                        />
                        <span>Process anyway</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {(selectedUniversity.api_type || "") === "upgrad" && leadPayloads.has(0) && (
                <div className="mb-4 rounded-lg border border-border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">upGrad Request JSON</p>
                    <p className="text-xs text-muted-foreground">First row preview</p>
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
                    {leadPayloads.get(0)}
                  </pre>
                </div>
              )}

              <LeadPreviewTable
                leads={leads.slice(0, pageSize)}
                showStatus={isProcessing || processedDisplayCount > 0 || leadResponses.size > 0 || leadStatuses.size > 0}
                leadStatuses={leadStatuses}
                leadResponses={leadResponses}
                leadPayloads={leadPayloads}
                validationErrors={validationErrors}
                dbDuplicates={dbDuplicates}
                onRetry={!isProcessing ? retryLead : undefined}
                onUpdateLead={!isProcessing ? handleUpdateLead : undefined}
                isEditable={!isProcessing && processedDisplayCount === 0}
                rowOffset={0}
              />

              {processedDisplayCount === 0 && !isProcessing && (
                <div className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/30 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">Review the Request JSON, then push leads.</p>
                    <p className="text-xs text-muted-foreground">
                      The preview now matches the exact upGrad nested payload sent to the API.
                    </p>
                  </div>
                  <button
                    onClick={processLeads}
                    disabled={hasValidationErrors || leads.length === 0}
                    className="btn-success flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Rocket className="h-5 w-5" />
                    Continue & Push Leads
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(pageSize, leads.length)} of {leads.length} records
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show:</span>
                  {[10, 20, 50, 100].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      className={`px-2 py-1 text-sm rounded ${
                        pageSize === size
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={customPageSize}
                      onChange={(e) => setCustomPageSize(e.target.value)}
                      placeholder="Custom"
                      className="w-16 px-2 py-1 text-sm border border-border rounded bg-background"
                      min="1"
                      max={leads.length}
                    />
                    <button
                      onClick={() => handlePageSizeChange("custom")}
                      disabled={!customPageSize || parseInt(customPageSize, 10) < 1}
                      className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {selectedUniversity && (
            <UniversityInfoPanel university={selectedUniversity} onRateLimitUpdate={handleRateLimitUpdate} />
          )}

          {leads.length > 0 && (
            <div className="card-elevated p-6">
              <h3 className="font-medium text-foreground mb-4">Processing Status</h3>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono text-foreground">
                    {processedDisplayCount} / {leads.length}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${leads.length > 0 ? (processedDisplayCount / leads.length) * 100 : 0}%` }}
                  />
                </div>
                {isProcessing && !isPaused && getEstimatedTime() && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {getEstimatedTime()}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-2 rounded-lg bg-success/10">
                  <p className="font-display text-xl font-bold text-success">{successCount}</p>
                  <p className="text-xs text-muted-foreground">Success</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-destructive/10">
                  <p className="font-display text-xl font-bold text-destructive">{failedCount}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted">
                  <p className="font-display text-xl font-bold text-muted-foreground">{pendingCount}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>

              <div className="space-y-2">
                {!isProcessing ? (
                  <>
                    <button
                      onClick={processLeads}
                      className="btn-success w-full flex items-center justify-center gap-2"
                      disabled={processedDisplayCount === leads.length}
                    >
                      <Rocket className="h-5 w-5" />
                      {processedDisplayCount > 0 ? "Continue Processing" : "Process Now (Live)"}
                    </button>
                    {processedDisplayCount === 0 && (
                      <>
                        <button
                          onClick={startBackgroundProcessing}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium border border-primary text-primary hover:bg-primary/10"
                        >
                          <Clock className="h-5 w-5" />
                          Queue for Background Processing
                        </button>
                        <button
                          onClick={() => {
                            const now = new Date();
                            const defaultDate = now.toISOString().split("T")[0];
                            const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes() + 5).padStart(2, "0")}`;
                            setScheduleDate(defaultDate);
                            setScheduleTime(defaultTime);
                            setShowScheduleModal(true);
                          }}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium border border-accent text-accent-foreground hover:bg-accent/10 bg-accent/5"
                        >
                          <CalendarClock className="h-5 w-5" />
                          Schedule for Later
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex gap-2">
                    {isPaused ? (
                      <button
                        onClick={resumeProcessing}
                        className="btn-success flex-1 flex items-center justify-center gap-2"
                      >
                        <Play className="h-5 w-5" />
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={pauseProcessing}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        <Pause className="h-5 w-5" />
                        Pause
                      </button>
                    )}
                    <button
                      onClick={stopProcessing}
                      className="px-4 py-3 rounded-lg font-medium bg-destructive text-destructive-foreground"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {failedCount > 0 && !isProcessing && (
                  <button
                    onClick={bulkRetryFailed}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium border border-warning text-warning hover:bg-warning/10"
                  >
                    <RotateCcw className="h-5 w-5" />
                    Retry All Failed ({failedCount})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showSingleLeadForm && selectedUniversity && (
        <SingleLeadForm
          university={selectedUniversity}
          onClose={() => setShowSingleLeadForm(false)}
          onSuccess={() => {
            setAlert({ type: "success", message: "Lead submitted successfully!" });
          }}
        />
      )}

      {/* ✅ FIXED COLUMN MAPPING DIALOG - uses localColumnMapping for instant edits */}
      {showColumnMapping && selectedUniversity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-xl">
            {/* Header, speed control, and mappings share one scroll area. The
                speed control naturally scrolls out of view; actions never do. */}
            <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-xl font-bold text-foreground">Map CSV Columns</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Match your CSV columns to the correct lead fields. Each field can only be used once.
              </p>
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium text-foreground">Leads at one time: {pushConcurrency}</span>
                    <p className="text-xs text-muted-foreground">Locked at 3 by default for safe, fast processing.</p>
                  </div>
                  <button
                    type="button"
                    aria-label={isConcurrencyUnlocked ? "Lock lead speed" : "Request lead speed unlock"}
                    onClick={() => {
                      if (isConcurrencyUnlocked) {
                        setIsConcurrencyUnlocked(false);
                        return;
                      }
                      setConcurrencyPin("");
                      setConcurrencyPinError("");
                      setShowConcurrencyPin(true);
                    }}
                    className="rounded-md border border-border bg-card p-2 text-foreground hover:border-primary hover:text-primary"
                  >
                    {isConcurrencyUnlocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2" role="group" aria-label="Mapping leads processed at one time">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={pushConcurrency === count}
                      disabled={!isConcurrencyUnlocked}
                      onClick={() => setPushConcurrency(count)}
                      className={`rounded-md border py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                        pushConcurrency === count
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/60"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {csvHeaders.map((header) => {
                // ✅ Use localColumnMapping to compute used fields
                const usedByOthers = new Set<string>();
                Object.entries(localColumnMapping).forEach(([h, f]) => {
                  if (h !== header && f && f.trim() !== "") {
                    usedByOthers.add(f);
                  }
                });

                const customColOptions = (selectedUniversity.customColumns || [])
                  .filter((col) => col.columnKey)
                  .map((col) => ({
                    value: col.columnKey,
                    label: col.columnName || col.columnKey,
                  }));

                const payloadFieldOptions = getPayloadFieldDefinitions(selectedUniversity.column_mapping || {})
                  .filter((field) => !field.sourceType || field.sourceType === "lead_data")
                  .map((field) => ({
                    value: field.sourceKey?.trim() || field.fieldName?.trim() || "",
                    label: field.displayName?.trim() || field.fieldName?.trim() || field.sourceKey?.trim() || "",
                  }))
                  .filter((option) => option.value);

                const standardOptions = [
                  ...payloadFieldOptions,
                  ...((selectedUniversity.api_type || "") === "upgrad"
                    ? UPGRAD_EXACT_FIELDS.map((field) => ({ value: field, label: field }))
                    : []),
                  { value: "name", label: "Name" },
                  { value: "email", label: "Email" },
                  { value: "mobile", label: "Mobile" },
                  { value: "state", label: "State" },
                  { value: "city", label: "City" },
                  { value: "address", label: "Address" },
                  { value: "course", label: "Course" },
                  { value: "formId", label: "formId" },
                  { value: "specialization", label: "Specialization" },
                  { value: "leadSource", label: "Source" },
                  { value: "leadMedium", label: "Medium" },
                  { value: "campaign_name", label: "campaign_name" },
                  { value: "program", label: "program" },
                  { value: "campus", label: "campus" },
                  { value: "district", label: "district" },
                  { value: "leadCampaign", label: "Campaign" },
                  { value: "FirstName", label: "FirstName" },
                  { value: "EmailAddress", label: "EmailAddress" },
                  { value: "Phone", label: "Phone" },
                  { value: "discipline", label: "discipline" },
                  { value: "school", label: "school" },
                  { value: "program", label: "program" },
                  { value: "mx_State", label: "mx_State" },
                  { value: "mx_Course", label: "mx_Course" },
                  { value: "mx_City", label: "mx_City" },
                  { value: "mx_Date_Of_Birth", label: "mx_Date_Of_Birth" },
                  { value: "mx_City_New", label: "mx_City_New" },
                  { value: "mx_Discipline_New", label: "mx_Discipline_New" },
                  { value: "mx_Program_New", label: "mx_Program_New" },
                  { value: "field_session", label: "field_session" },
                  { value: "center", label: "center" },
                  { value: "field_program", label: "field_program" },
                  { value: "mx_Btech_Specialisation", label: "mx_Btech_Specialisation" },
                  { value: "course_id", label: "course_id" },
                  { value: "studentName", label: "studentName" },
                  { value: "fatherName", label: "fatherName" },
                  { value: "mobile_no", label: "mobile_no" },
                  { value: "cityname", label: "cityname" },
                  { value: "courseId", label: "courseId" },
                  { value: "center", label: "center" },
                  { value: "Entity4", label: "Entity4" },
                  { value: "faculty", label: "faculty" },
                  { value: "mx_Country", label: "mx_Country" },
                  { value: "mx_Present_State", label: "mx_Present_State" },
                  { value: "mx_Course_Interested_In", label: "mx_Course_Interested_In" },
                  { value: "programName", label: "programName" },
                  { value: "specializationName", label: "specializationName" },
                  { value: "campusId", label: "campusId" },
                  { value: "districtName", label: "districtName" },
                  { value: "emailId", label: "EmailId" },
                  { value: "access_key", label: "access_key" },
                  { value: "Campus", label: "Campus" },
                  { value: "specialization", label: "specialization" },
                  { value: "course", label: "course" }
                ];

                // Payload editors and the legacy standard list can contain the
                // same key more than once. De-duplicate them to prevent unstable
                // React option rendering inside the mapping modal.
                const allOptions = [...new Map([...standardOptions, ...customColOptions].map((opt) => [opt.value, opt])).values()];

                return (
                  <div key={header} className="flex items-center gap-4">
                    <span className="w-1/3 text-sm font-medium text-foreground truncate" title={header}>
                      {header}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    {/* ✅ Bound to localColumnMapping - changes reflect instantly */}
                    <select
                      value={localColumnMapping[header] || ""}
                      onChange={(e) => setLocalColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                      className="flex-1 input-field text-sm"
                    >
                      <option value="">-- Skip this column --</option>
                      {allOptions.map((opt) => {
                        const isUsed = usedByOthers.has(opt.value);
                        return (
                          <option key={opt.value} value={opt.value} disabled={isUsed}>
                            {opt.label}
                            {isUsed ? " (already mapped)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>
            </div>

            <div className="shrink-0 border-t border-border bg-card p-4 sm:p-6 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  const savedMappingKey = `csv_mapping_${selectedUniversity.id}`;
                  localStorage.removeItem(savedMappingKey);
                  setAlert({ type: "info", message: "Saved column mapping cleared. It will ask again next time." });
                }}
                className="text-sm text-warning hover:underline"
              >
                Reset Saved Mapping
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowColumnMapping(false);
                    setCsvHeaders([]);
                    setTempColumnMapping({});
                    setLocalColumnMapping({});
                    setFileName("");
                    setCsvData("");
                    delete (window as any).__pendingCsvData;
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="px-6 py-3 rounded-lg font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                {/* ✅ Opens "Data Source" entry dialog before applying mapping */}
                <button
                  onClick={() => {
                    setPendingMapping(localColumnMapping);
                    setShowColumnMapping(false);
                    setShowSourceEntry(true);
                  }}
                  className="btn-primary"
                >
                  Apply Mapping & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConcurrencyPin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-2xl">
            <h3 className="font-display text-lg font-bold text-foreground">Unlock lead speed</h3>
            <p className="mt-1 text-sm text-muted-foreground">Enter the CTO PIN to change leads processed at one time.</p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={concurrencyPin}
              onChange={(event) => {
                setConcurrencyPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                setConcurrencyPinError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && concurrencyPin === "123456") {
                  setIsConcurrencyUnlocked(true);
                  setShowConcurrencyPin(false);
                  setConcurrencyPin("");
                }
              }}
              placeholder="6-digit PIN"
              aria-label="CTO PIN"
              className="input-field mt-4 w-full"
            />
            {concurrencyPinError && <p className="mt-2 text-sm text-destructive">{concurrencyPinError}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConcurrencyPin(false);
                  setConcurrencyPin("");
                  setConcurrencyPinError("");
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (concurrencyPin !== "123456") {
                    setConcurrencyPinError("Incorrect PIN. Please ask the CTO.");
                    return;
                  }
                  setIsConcurrencyUnlocked(true);
                  setShowConcurrencyPin(false);
                  setConcurrencyPin("");
                }}
                className="btn-primary"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ DATA SOURCE ENTRY DIALOG — shown after column mapping is applied */}
      {showSourceEntry && selectedUniversity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-xl font-bold text-foreground">Tag this Data</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Help track this batch later. Tell us where the data came from and what it is.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Data Source <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={pendingSourceLabel}
                  onChange={(e) => setPendingSourceLabel(e.target.value)}
                  placeholder="e.g. Facebook Ads, Justdial, Excel Dec 2026"
                  className="input-field w-full"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Where did this data come from? (campaign, vendor, channel, etc.)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  What data are you uploading? <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={pendingDataDescription}
                  onChange={(e) => setPendingDataDescription(e.target.value)}
                  placeholder="e.g. BBA enquiries from Delhi, Nov week-3 ad leads"
                  rows={3}
                  className="input-field w-full resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Short description — used for reporting & filtering only.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  // Back to mapping without losing pending state
                  setShowSourceEntry(false);
                  setShowColumnMapping(true);
                }}
                className="px-6 py-3 rounded-lg font-medium text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
              <button
                onClick={() => {
                  const src = pendingSourceLabel.trim();
                  if (!src) {
                    setAlert({ type: "error", message: "Please enter a Data Source to continue." });
                    return;
                  }
                  const desc = pendingDataDescription.trim();
                  const combined = desc ? `${src} — ${desc}` : src;
                  setSourceLabel(combined);
                  setShowSourceEntry(false);
                  const mapping = pendingMapping || localColumnMapping;
                  setPendingMapping(null);
                  // Reset so next upload always asks fresh
                  setPendingSourceLabel("");
                  setPendingDataDescription("");
                  applyColumnMappingAndProcess(mapping);
                }}
                className="btn-primary"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedUniversity && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Schedule Processing
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Leads will be processed automatically at the scheduled time - no need to keep the app open.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">University</label>
                <p className="text-sm text-muted-foreground">{selectedUniversity.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Total Leads</label>
                <p className="text-sm text-muted-foreground">
                  {leads.length} leads from {fileName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Rate</label>
                <p className="text-sm text-muted-foreground">{selectedUniversity.leads_per_minute || 90} leads/minute</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>
              {leads.length > 0 && scheduleDate && scheduleTime && (
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p>
                    Sequential mode sends one lead, waits for its response, then sends the next lead.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-6 py-3 rounded-lg font-medium text-muted-foreground hover:bg-muted"
                disabled={isScheduling}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!scheduleDate || !scheduleTime) {
                    setAlert({ type: "error", message: "Please select both date and time" });
                    return;
                  }
                  const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
                  if (scheduledAt <= new Date()) {
                    setAlert({ type: "error", message: "Scheduled time must be in the future" });
                    return;
                  }
                  scheduleProcessing(scheduledAt);
                }}
                disabled={isScheduling || !scheduleDate || !scheduleTime}
                className="btn-primary flex items-center gap-2"
              >
                {isScheduling ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <CalendarClock className="h-4 w-4" />
                    Schedule {leads.length} Leads
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
