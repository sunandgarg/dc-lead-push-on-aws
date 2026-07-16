import { useMemo, useState } from "react";
import { Info, AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * upGrad-specific configuration: attached lead-drop JSON defaults,
 * field-name remapping from CSV column → upGrad payload key,
 * and metadata defaults.
 *
 * Persisted inside the university `column_mapping` JSON using these prefixes
 * so no schema migration is needed:
 *   __upgrad_src_<upgradField>  → CSV column name to read from
 *   __upgrad_meta_<key>         → metadata override (country/affiliateSource/chatLink/emailTemplateSuffix)
 */
export interface UpgradConfig {
  lsqId: string;
  sourceMap: Record<string, string>;
  platform: string;
  platformSection: string;
  country: string;
  affiliateSource: string;
  chatLink: string;
  emailTemplateSuffix: string;
}

export const UPGRAD_FIELDS: Array<{ key: string; label: string; defaultCsv: string; required?: boolean }> = [
  { key: "firstname", label: "firstname", defaultCsv: "firstname", required: true },
  { key: "lastname", label: "lastname", defaultCsv: "lastname" },
  { key: "email", label: "email", defaultCsv: "email" },
  { key: "mobile", label: "phone.number", defaultCsv: "phone.number", required: true },
  { key: "course", label: "course", defaultCsv: "course", required: true },
  { key: "city", label: "city", defaultCsv: "city" },
  { key: "state", label: "state", defaultCsv: "state" },
];

export const DEFAULT_UPGRAD_CONFIG: UpgradConfig = {
  lsqId: "",
  sourceMap: {},
  platform: "",
  platformSection: "",
  country: "India",
  affiliateSource: "aff_id=1&sub_aff_id=12",
  chatLink: "haptik.com/1234567",
  emailTemplateSuffix: "in",
};

/** Pull the upGrad config out of an existing columnMapping. */
export function extractUpgradConfig(columnMapping: Record<string, string> | undefined | null): UpgradConfig {
  const cfg: UpgradConfig = { ...DEFAULT_UPGRAD_CONFIG, sourceMap: {} };
  if (!columnMapping) return cfg;

  Object.entries(columnMapping).forEach(([k, v]) => {
    if (k.startsWith("__upgrad_src_") && v) {
      cfg.sourceMap[k.replace("__upgrad_src_", "")] = v;
    } else if (k === "__upgrad_meta_platform" && v) cfg.platform = v;
    else if (k === "__upgrad_meta_platformSection" && v) cfg.platformSection = v;
    else if (k === "__upgrad_meta_country" && v) cfg.country = v;
    else if (k === "__upgrad_meta_affiliateSource" && v) cfg.affiliateSource = v;
    else if (k === "__upgrad_meta_chatLink" && v) cfg.chatLink = v;
    else if (k === "__upgrad_meta_emailTemplateSuffix" && v) cfg.emailTemplateSuffix = v;
  });
  return cfg;
}

/** Merge upGrad config back into the columnMapping (mutates a copy and returns it). */
export function applyUpgradConfig(
  columnMapping: Record<string, string>,
  cfg: UpgradConfig,
): Record<string, string> {
  const next: Record<string, string> = { ...columnMapping };

  // Strip any prior upgrad keys
  Object.keys(next).forEach((k) => {
    if (
      k === "__static_extraFields.LSQID" ||
      k.startsWith("__upgrad_src_") ||
      k.startsWith("__upgrad_meta_")
    ) {
      delete next[k];
    }
  });

  Object.entries(cfg.sourceMap).forEach(([k, v]) => {
    if (v && v.trim()) next[`__upgrad_src_${k}`] = v.trim();
  });
  if (cfg.platform && cfg.platform !== DEFAULT_UPGRAD_CONFIG.platform)
    next["__upgrad_meta_platform"] = cfg.platform;
  if (cfg.platformSection && cfg.platformSection !== DEFAULT_UPGRAD_CONFIG.platformSection)
    next["__upgrad_meta_platformSection"] = cfg.platformSection;
  if (cfg.country && cfg.country !== DEFAULT_UPGRAD_CONFIG.country)
    next["__upgrad_meta_country"] = cfg.country;
  if (cfg.affiliateSource && cfg.affiliateSource !== DEFAULT_UPGRAD_CONFIG.affiliateSource)
    next["__upgrad_meta_affiliateSource"] = cfg.affiliateSource;
  if (cfg.chatLink && cfg.chatLink !== DEFAULT_UPGRAD_CONFIG.chatLink)
    next["__upgrad_meta_chatLink"] = cfg.chatLink;
  if (cfg.emailTemplateSuffix && cfg.emailTemplateSuffix !== DEFAULT_UPGRAD_CONFIG.emailTemplateSuffix)
    next["__upgrad_meta_emailTemplateSuffix"] = cfg.emailTemplateSuffix;

  return next;
}

/** Validate the upGrad API URL slug. Returns an error message or "". */
export function validateUpgradUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "API URL is required for upGrad";
  if (!/^https?:\/\//i.test(trimmed)) return "Invalid URL format";
  const m = trimmed.match(/\/apis\/lead-drop\/vendor\/([^/\s<>]+)\/?$/);
  if (!m) {
    return "URL must end with /apis/lead-drop/vendor/<vendor>/";
  }
  const slug = m[1];
  if (slug === "<vendor>" || slug.includes("<") || slug.includes(">")) {
    return "Replace <vendor> with the slug provided by upGrad (e.g. dekhocampus)";
  }
  return "";
}

/** Known upGrad hosts. Toggle just rewrites the host portion of the API URL. */
export const UPGRAD_HOSTS = {
  staging: "staging-lead-ms.upgrad.dev",
  production: "lead-ms.upgrad.com",
} as const;

export type UpgradEnv = "staging" | "production" | "custom";

export function detectUpgradEnv(url: string): UpgradEnv {
  try {
    const u = new URL(url);
    if (u.hostname === UPGRAD_HOSTS.staging) return "staging";
    if (u.hostname === UPGRAD_HOSTS.production) return "production";
  } catch { /* ignore */ }
  return "custom";
}

export function rewriteUpgradHost(url: string, env: UpgradEnv): string {
  if (env === "custom") return url;
  const target = UPGRAD_HOSTS[env];
  try {
    const u = new URL(url);
    u.hostname = target;
    u.protocol = "https:";
    return u.toString();
  } catch {
    // No valid URL - return a sensible default with a placeholder slug
    return `https://${target}/apis/lead-drop/vendor/<vendor>/`;
  }
}

/** Validate Basic auth secret. Accepts user:pass, base64(user:pass), or "Basic xxxx". */
export function validateUpgradSecret(secretKey: string): string {
  const v = (secretKey || "").trim();
  if (!v) return "Basic auth credentials are required (format: user:pass)";
  if (/^Basic\s+[A-Za-z0-9+/=]+$/.test(v)) return "";
  if (/^[A-Za-z0-9+/]+=*$/.test(v) && v.length % 4 === 0 && v.length >= 8) return ""; // base64
  if (/^[^\s:]+:.+$/.test(v)) return ""; // user:pass
  return "Use format user:pass (e.g. vendor1:password1), or paste a base64-encoded value";
}

interface Props {
  config: UpgradConfig;
  onChange: (cfg: UpgradConfig) => void;
  sampleData?: Record<string, string>;
  source: string;
  medium: string;
  campaign: string;
  /** API URL field (controlled by parent modal). Optional for back-compat. */
  apiUrl?: string;
  onApiUrlChange?: (url: string) => void;
  /** Basic auth secret (controlled by parent modal). Used for the Test button. */
  secretKey?: string;
  /** Used by the Test button only (not persisted). */
  universityName?: string;
}

export function UpgradConfigSection({
  config,
  onChange,
  sampleData,
  source,
  medium,
  campaign,
  apiUrl,
  onApiUrlChange,
  secretKey,
  universityName,
}: Props) {
  const sample: Record<string, string> = sampleData || {
    firstname: "FirstName",
    lastname: "LastName",
    email: "user@upgrad.com",
    "phone.number": "9999999999",
    "phone.code": "+91",
    course: "entrepreneurship",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    affiliateSource: "aff_id=1&sub_aff_id=12",
    "extraFields.chatLink": "haptik.com/1234567",
    emailTemplateSuffix: "in",
  };

  const update = <K extends keyof UpgradConfig>(key: K, value: UpgradConfig[K]) =>
    onChange({ ...config, [key]: value });

  const updateSource = (field: string, value: string) =>
    onChange({ ...config, sourceMap: { ...config.sourceMap, [field]: value } });

  const preview = useMemo(() => buildUpgradPreview(config, sample, { source, medium, campaign }), [
    config,
    sample,
    source,
    medium,
    campaign,
  ]);

  const env: UpgradEnv = detectUpgradEnv(apiUrl || "");
  const urlError = apiUrl !== undefined ? validateUpgradUrl(apiUrl) : "";
  const secretError = secretKey !== undefined ? validateUpgradSecret(secretKey) : "";
  const lsqWarning = "";

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: string;
    httpStatus: number;
    response: string;
    request: Record<string, unknown>;
    headers: Record<string, string>;
    error?: string;
  } | null>(null);

  const handleTest = async () => {
    if (urlError) {
      toast.error(urlError);
      return;
    }
    if (secretError) {
      toast.error(secretError);
      return;
    }
    setTesting(true);
    setTestResult(null);

    // Build a sample lead from the preview sample
    const leadData: Record<string, string> = { ...sample };

    // Build the columnMapping the edge function expects (mirror of what gets persisted)
    const columnMapping: Record<string, string> = {};
    Object.entries(config.sourceMap).forEach(([k, v]) => {
      if (v && v.trim()) columnMapping[`__upgrad_src_${k}`] = v.trim();
    });
    if (config.platform) columnMapping["__upgrad_meta_platform"] = config.platform;
    if (config.platformSection) columnMapping["__upgrad_meta_platformSection"] = config.platformSection;
    if (config.country) columnMapping["__upgrad_meta_country"] = config.country;
    if (config.affiliateSource) columnMapping["__upgrad_meta_affiliateSource"] = config.affiliateSource;
    if (config.chatLink) columnMapping["__upgrad_meta_chatLink"] = config.chatLink;
    if (config.emailTemplateSuffix) columnMapping["__upgrad_meta_emailTemplateSuffix"] = config.emailTemplateSuffix;

    const requestPreview = preview;
    const headersPreview: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      utm_source: source || "Channelpartner_dekhocampus",
      utm_medium: medium || "Channelpartner_dekhocampus",
      utm_campaign: campaign || "Channelpartner_dekhocampus",
      Authorization: secretKey ? "Basic ••••••••" : "(missing)",
    };

    try {
      const { data, error } = await supabase.functions.invoke("process-lead", {
        body: {
          universityId: "test-upgrad",
          batchId: `test-${Date.now()}`,
          leadData,
          apiConfig: {
            apiUrl: apiUrl || "",
            secretKey: secretKey || "",
            collegeId: "",
            source,
            medium,
            campaign,
            apiType: "upgrad",
            columnMapping,
          },
        },
      });
      if (error) {
        setTestResult({
          status: "Fail",
          httpStatus: 0,
          response: error.message || String(error),
          request: requestPreview,
          headers: headersPreview,
          error: error.message,
        });
        toast.error("Test failed - see panel below");
      } else {
        setTestResult({
          status: data?.status || "Unknown",
          httpStatus: data?.httpStatus || 0,
          response: data?.response || "",
          request: requestPreview,
          headers: headersPreview,
        });
        if (data?.status === "Success") toast.success(`upGrad accepted the lead (HTTP ${data.httpStatus})`);
        else if (data?.status === "Duplicate") toast.message(`upGrad reported Duplicate (HTTP ${data.httpStatus})`);
        else toast.error(`upGrad returned ${data?.status} (HTTP ${data?.httpStatus})`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setTestResult({
        status: "Fail",
        httpStatus: 0,
        response: msg,
        request: requestPreview,
        headers: headersPreview,
        error: msg,
      });
      toast.error("Test request failed");
    } finally {
      setTesting(false);
    }
  };

  const switchEnv = (next: UpgradEnv) => {
    if (!onApiUrlChange) return;
    if (next === "custom") return; // do nothing
    onApiUrlChange(rewriteUpgradHost(apiUrl || "https://x/apis/lead-drop/vendor/<vendor>/", next));
  };

  return (
    <section className="space-y-5 rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">upGrad Lead-Drop Configuration</h3>
        </div>
        {onApiUrlChange && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 text-xs">
            {(["staging", "production"] as UpgradEnv[]).map((opt) => {
              const active = env === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => switchEnv(opt)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt === "staging" ? "Staging" : "Production"}
                </button>
              );
            })}
            {env === "custom" && (
              <span className="px-2 py-1 rounded-md text-amber-600 dark:text-amber-400" title="URL host doesn't match a known upGrad host">
                Custom
              </span>
            )}
          </div>
        )}
      </div>

      {/* Validation summary */}
      {(urlError || secretError || lsqWarning) && (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/60 dark:bg-amber-950/30 p-3 space-y-1 text-xs">
          {urlError && <p className="text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{urlError}</p>}
          {secretError && <p className="text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />Secret Key: {secretError}</p>}
          {lsqWarning && <p className="text-amber-700 dark:text-amber-300 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{lsqWarning}</p>}
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        upGrad payload keeps <code>sendWelcomeMail</code> disabled,
        <code> isDetectLocation</code> is always <code>false</code>, and <code>extraFields.chatLink</code> is used instead of LSQID.
      </div>

      {/* Field mapping */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">CSV Column → upGrad Field Mapping</h4>
        <p className="text-xs text-muted-foreground mb-3">
          Override the CSV column name each upGrad field reads from. Leave blank to use the default.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {UPGRAD_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                <code className="font-mono">{f.label}</code>
                {f.required && <span className="text-destructive"> *</span>}
              </label>
              <input
                type="text"
                value={config.sourceMap[f.key] || ""}
                onChange={(e) => updateSource(f.key, e.target.value)}
                className="input-field text-sm"
                placeholder={`default: ${f.defaultCsv}`}
                maxLength={64}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Lead Source Metadata</h4>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">platform</label>
            <input
              type="text"
              value={config.platform}
              onChange={(e) => update("platform", e.target.value)}
              className="input-field text-sm"
              placeholder="DWeb"
              maxLength={64}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">platformSection</label>
            <input
              type="text"
              value={config.platformSection}
              onChange={(e) => update("platformSection", e.target.value)}
              className="input-field text-sm"
              placeholder="channelpartner_dekhocampus"
              maxLength={128}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">country</label>
            <input
              type="text"
              value={config.country}
              onChange={(e) => update("country", e.target.value)}
              className="input-field text-sm"
              placeholder="India"
              maxLength={64}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">emailTemplateSuffix</label>
            <input
              type="text"
              value={config.emailTemplateSuffix}
              onChange={(e) => update("emailTemplateSuffix", e.target.value)}
              className="input-field text-sm"
              placeholder="in"
              maxLength={8}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">affiliateSource</label>
            <input
              type="text"
              value={config.affiliateSource}
              onChange={(e) => update("affiliateSource", e.target.value)}
              className="input-field text-sm"
              placeholder="aff_id=1&sub_aff_id=12"
              maxLength={128}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">extraFields.chatLink</label>
            <input
              type="text"
              value={config.chatLink}
              onChange={(e) => update("chatLink", e.target.value)}
              className="input-field text-sm"
              placeholder="haptik.com/1234567"
              maxLength={255}
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-foreground">Payload Preview</h4>
          <span className="text-xs text-muted-foreground">Sample CSV row → nested JSON sent to upGrad</span>
        </div>
        <pre className="bg-background border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-72 text-foreground">
{JSON.stringify(preview, null, 2)}
        </pre>
        <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
          Headers <code>utm_source</code>, <code>utm_medium</code>, <code>utm_campaign</code> and
          <code> Authorization: Basic …</code> are added automatically from the Lead Source / Secret Key fields above.
        </p>
      </div>

      {/* Test Lead Push */}
      {(apiUrl !== undefined || secretKey !== undefined) && (
        <div className="rounded-lg border border-border bg-background/60 p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h4 className="text-sm font-medium text-foreground">Test upGrad Lead Push{universityName ? ` - ${universityName}` : ""}</h4>
              <p className="text-xs text-muted-foreground">
                Sends the sample lead above to <code className="font-mono">{env === "custom" ? "the configured URL" : UPGRAD_HOSTS[env]}</code> using the current settings. Doesn't save anything.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !!urlError || !!secretError}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {testing ? "Testing…" : "Send Test Lead"}
            </button>
          </div>

          {testResult && (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {testResult.status === "Success" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/15 text-green-700 dark:text-green-400 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Success
                  </span>
                )}
                {testResult.status === "Duplicate" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium">
                    <AlertCircle className="h-3 w-3" /> Duplicate
                  </span>
                )}
                {testResult.status !== "Success" && testResult.status !== "Duplicate" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-destructive/15 text-destructive font-medium">
                    <AlertCircle className="h-3 w-3" /> {testResult.status || "Fail"}
                  </span>
                )}
                {testResult.httpStatus > 0 && (
                  <span className="text-muted-foreground">HTTP {testResult.httpStatus}</span>
                )}
                {(() => {
                  try {
                    const j = JSON.parse(testResult.response);
                    if (j.leadIdentifier) return <span className="font-mono text-muted-foreground">leadIdentifier: {j.leadIdentifier}</span>;
                    if (j.message) return <span className="text-muted-foreground">{String(j.message).slice(0, 120)}</span>;
                  } catch { /* ignore */ }
                  return null;
                })()}
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Request → upGrad</p>
                  <pre className="bg-muted/40 border border-border rounded-md p-2 text-[11px] font-mono overflow-x-auto max-h-56 text-foreground">
{`POST ${apiUrl || ""}\n` + Object.entries(testResult.headers).map(([k, v]) => `${k}: ${v}`).join("\n") + "\n\n" + JSON.stringify(testResult.request, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Response from upGrad</p>
                  <pre className="bg-muted/40 border border-border rounded-md p-2 text-[11px] font-mono overflow-x-auto max-h-56 text-foreground whitespace-pre-wrap break-all">
{testResult.response || "(empty body)"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Pure helper - used by both the live preview and (mirrored) by the edge function. */
export function buildUpgradPreview(
  cfg: UpgradConfig,
  row: Record<string, string>,
  _meta: { source?: string; medium?: string; campaign?: string },
): Record<string, unknown> {
  const get = (upgradField: string, fallbackCsv: string) => {
    const csvKey = (cfg.sourceMap[upgradField] || fallbackCsv).trim();
    return row[csvKey] || row[upgradField] || "";
  };

  const fullName = (row.name || "").trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstname = get("firstname", "firstname") || parts.shift() || "Lead";
  const lastname = get("lastname", "lastname") || parts.join(" ") || firstname;

  const rawMobile = (get("mobile", "phone.number") || "").trim();
  let phoneCode = row["phone.code"] || row["phone.countryCode"] || "+91";
  let phoneNumber = rawMobile.replace(/\D/g, "");
  if (rawMobile.startsWith("+")) {
    const m = rawMobile.match(/^\+(\d{1,3})/);
    if (m) {
      phoneCode = `+${m[1]}`;
      phoneNumber = phoneNumber.slice(m[1].length);
    }
  }
  if (phoneNumber.length === 12 && phoneNumber.startsWith("91")) phoneNumber = phoneNumber.slice(2);
  if (phoneNumber.length === 11 && phoneNumber.startsWith("0")) phoneNumber = phoneNumber.slice(1);

  const payload: Record<string, unknown> = {
    firstname,
    lastname,
    email: get("email", "email"),
    phone: { number: phoneNumber, code: phoneCode },
    course: get("course", "course"),
    sendWelcomeMail: false,
    city: get("city", "city"),
    state: get("state", "state"),
    country: row.country || cfg.country || "India",
    isDetectLocation: false,
    affiliateSource: row.affiliateSource || cfg.affiliateSource || "aff_id=1&sub_aff_id=12",
    leadSource: {
      platform: row["leadSource.platform"] || cfg.platform || "",
      platformSection: row["leadSource.platformSection"] || cfg.platformSection || "",
    },
    extraFields: {
      chatLink: row["extraFields.chatLink"] || cfg.chatLink || "haptik.com/1234567",
    },
    emailTemplateSuffix: row.emailTemplateSuffix || cfg.emailTemplateSuffix || "in",
  };

  return payload;
}
