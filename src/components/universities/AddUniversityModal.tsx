import { useState, useRef, forwardRef } from "react";
import { X, Plus, Upload, Download, Trash2, Info, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import {
  parseStateCityCSV,
  parseCourseSpecializationCSV,
  generateStateCitySampleCSV,
  generateCourseSpecSampleCSV,
} from "@/utils/csvParser";
import { CustomColumnsSection, CustomColumn } from "./CustomColumnsSection";
import {
  PayloadFieldsEditor,
  PayloadField,
  createDefaultPayloadFields,
  payloadFieldsToColumnMapping,
  columnMappingToPayloadFields,
  downloadSampleCSV,
} from "./PayloadFieldsEditor";
import { supabase } from "@/integrations/supabase/client";
import { ImportConfigZone, UniversityExport } from "./UniversityImportExport";
import { MultiPushDefaultsEditor } from "./MultiPushDefaultsEditor";
import {
  UpgradConfigSection,
  DEFAULT_UPGRAD_CONFIG,
  extractUpgradConfig,
  applyUpgradConfig,
  validateUpgradUrl,
  type UpgradConfig,
} from "./UpgradConfigSection";

interface StateCity {
  state: string;
  city: string;
}

interface CourseSpecialization {
  course: string;
  specialization: string;
}

interface AddUniversityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (university: UniversityFormData) => Promise<void>;
  existingUniversities?: string[]; // Array of existing university names for duplicate check
}

export interface UniversityFormData {
  name: string;
  apiUrl: string;
  collegeId: string;
  secretKey: string;
  source: string;
  medium: string;
  campaign: string;
  leadsPerMinute: number;
  apiTimeoutSeconds: number;
  defaultPushConcurrency: number;
  dailyLeadLimit?: number | null;
  status?: "live" | "disabled";
  apiType: string;
  utmLink: string;
  publisherPanelUrl: string;
  publisherId: string;
  authType: string;
  authHeaderKey: string;
  authHeaderValue: string;
  payloadWrapper: string;
  customHeaders: Record<string, string>;
  programs: string[];
  stateCities: StateCity[];
  courseSpecializations: CourseSpecialization[];
  columnMapping: Record<string, string>;
  customColumns: CustomColumn[];
  payloadFields: PayloadField[];
  defaultValues?: Record<string, string>;
}

const apiTypeOptions = [
  {
    value: "nopaperforms",
    label: "NoPaperForms / Meritto",
    description: "Standard JSON with secret_key authentication",
  },
  { value: "leadsquared", label: "LeadSquared", description: "Array of Attribute/Value pairs" },
  { value: "upgrad", label: "upGrad Lead-Drop", description: "Nested JSON + Basic auth + UTM headers" },
  { value: "custom", label: "Custom JSON API", description: "Generic JSON payload format" },
];

export const AddUniversityModal = forwardRef<HTMLDivElement, AddUniversityModalProps>(function AddUniversityModal(
  { isOpen, onClose, onSave, existingUniversities = [] },
  ref,
) {
  const [formData, setFormData] = useState({
    name: "",
    apiUrl: "",
    collegeId: "",
    secretKey: "",
    source: "dekhocampus",
    medium: "dekhocampus",
    campaign: "API",
    leadsPerMinute: 90,
    apiTimeoutSeconds: 30,
    defaultPushConcurrency: 2,
    dailyLeadLimit: "" as number | "",
    status: "live" as "live" | "disabled",
    apiType: "nopaperforms",
    utmLink: "",
    publisherPanelUrl: "",
    publisherId: "",
    authType: "secret_key",
    authHeaderKey: "Authorization",
    authHeaderValue: "",
    payloadWrapper: "object",
    customHeaders: {} as Record<string, string>,
  });

  const [programs, setPrograms] = useState<string[]>([]);
  const [stateCities, setStateCities] = useState<StateCity[]>([]);
  const [courseSpecializations, setCourseSpecializations] = useState<CourseSpecialization[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [payloadFields, setPayloadFields] = useState<PayloadField[]>(createDefaultPayloadFields());
  const [defaultValues, setDefaultValues] = useState<Record<string, string>>({});
  const [upgradConfig, setUpgradConfig] = useState<UpgradConfig>({ ...DEFAULT_UPGRAD_CONFIG });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const stateCityRef = useRef<HTMLInputElement>(null);
  const courseSpecRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "leadsPerMinute" || name === "apiTimeoutSeconds" || name === "defaultPushConcurrency"
          ? Number(value)
          : name === "dailyLeadLimit"
            ? (value === "" ? "" : Number(value))
            : value,
    }));

    // Clear existing error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }

    // Real-time duplicate check for university name field
    if (name === "name" && value.trim()) {
      const isDuplicate = existingUniversities.some(
        (existingName) => existingName.toLowerCase() === value.trim().toLowerCase(),
      );
      if (isDuplicate) {
        setErrors((prev) => ({ ...prev, name: "⚠️ A university with this name already exists" }));
      }
    }
  };

  const handleStateCityUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseStateCityCSV(text);
        setStateCities(parsed);
      };
      reader.readAsText(file);
    }
  };

  const handleCourseSpecUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseCourseSpecializationCSV(text);
        setCourseSpecializations(parsed);
      };
      reader.readAsText(file);
    }
  };

  const downloadSample = (type: "stateCity" | "courseSpec") => {
    const content = type === "stateCity" ? generateStateCitySampleCSV() : generateCourseSpecSampleCSV();
    const filename = type === "stateCity" ? "sample_state_city.csv" : "sample_course_specialization.csv";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addProgram = () => setPrograms([...programs, ""]);
  const removeProgram = (index: number) => setPrograms(programs.filter((_, i) => i !== index));
  const updateProgram = (index: number, value: string) => {
    const updated = [...programs];
    updated[index] = value;
    setPrograms(updated);
  };

  const testApiConnection = async () => {
    if (!formData.apiUrl) {
      setApiTestResult({ success: false, message: "API URL is required" });
      return;
    }

    setIsTestingApi(true);
    setApiTestResult(null);

    try {
      const columnMapping = payloadFieldsToColumnMapping(payloadFields);
      const { data, error } = await supabase.functions.invoke("test-api", {
        body: {
          apiUrl: formData.apiUrl,
          secretKey: formData.secretKey,
          collegeId: formData.collegeId,
          source: formData.source,
          medium: formData.medium,
          campaign: formData.campaign,
          apiType: formData.apiType,
          apiTimeoutSeconds: formData.apiTimeoutSeconds,
          columnMapping,
        },
      });

      if (error) {
        setApiTestResult({ success: false, message: error.message });
      } else if (data.isConfigValid) {
        setApiTestResult({ success: true, message: data.errorMessage || "API configuration is valid!" });
      } else {
        setApiTestResult({ success: false, message: data.errorMessage || "API configuration is invalid" });
      }
    } catch (err) {
      setApiTestResult({ success: false, message: String(err) });
    } finally {
      setIsTestingApi(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "University name is required";
    } else {
      // Check for duplicate names (case-insensitive)
      const isDuplicate = existingUniversities.some(
        (name) => name.toLowerCase() === formData.name.trim().toLowerCase(),
      );
      if (isDuplicate) {
        newErrors.name = "⚠️ A university with this name already exists";
      }
    }

    // API fields validation - conditional based on API type
    const hasApiConfig = formData.apiUrl.trim() || formData.collegeId.trim() || formData.secretKey.trim();

    if (formData.apiType === "nopaperforms" && hasApiConfig) {
      // Meritto requires all three fields
      if (!formData.apiUrl.trim()) newErrors.apiUrl = "API URL is required when configuring API";
      if (formData.apiUrl.trim() && !formData.apiUrl.startsWith("http")) newErrors.apiUrl = "Invalid URL format";
      if (!formData.collegeId.trim()) newErrors.collegeId = "College ID is required for Meritto";
      if (!formData.secretKey.trim()) newErrors.secretKey = "Secret Key is required for Meritto";
    } else if (formData.apiType === "leadsquared") {
      // LeadSquared only requires API URL - College ID & Secret Key are optional
      if (hasApiConfig || formData.apiUrl.trim()) {
        if (!formData.apiUrl.trim()) newErrors.apiUrl = "API URL is required for LeadSquared";
        if (formData.apiUrl.trim() && !formData.apiUrl.startsWith("http")) newErrors.apiUrl = "Invalid URL format";
      }
    } else if (formData.apiType === "upgrad") {
      const urlErr = validateUpgradUrl(formData.apiUrl);
      if (urlErr) newErrors.apiUrl = urlErr;
      if (!formData.secretKey.trim()) newErrors.secretKey = "Basic-auth credentials required (vendor:password or base64)";
    } else if (formData.apiType === "custom") {
      // Custom: only validate URL format if provided
      if (formData.apiUrl.trim() && !formData.apiUrl.startsWith("http")) {
        newErrors.apiUrl = "Invalid URL format";
      }
    }

    // Either API configuration or UTM link is required (except for custom where all is optional)
    if (!hasApiConfig && !formData.utmLink.trim() && formData.apiType !== "custom") {
      newErrors.utmLink = "Either API configuration or UTM link is required";
    }

    if (formData.leadsPerMinute < 1 || formData.leadsPerMinute > 120) {
      newErrors.leadsPerMinute = "Must be between 1 and 120";
    }
    if (formData.apiTimeoutSeconds < 5 || formData.apiTimeoutSeconds > 300) {
      newErrors.apiTimeoutSeconds = "Timeout must be between 5 and 300 seconds";
    }
    if (formData.defaultPushConcurrency < 1 || formData.defaultPushConcurrency > 5) {
      newErrors.defaultPushConcurrency = "Leads at one time must be between 1 and 5";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: "",
      apiUrl: "",
      collegeId: "",
      secretKey: "",
      source: "dekhocampus",
      medium: "dekhocampus",
      campaign: "API",
      leadsPerMinute: 90,
      apiTimeoutSeconds: 30,
      defaultPushConcurrency: 2,
      dailyLeadLimit: "" as any,
      status: "live",
      apiType: "nopaperforms",
      utmLink: "",
      publisherPanelUrl: "",
      publisherId: "",
      authType: "secret_key",
      authHeaderKey: "Authorization",
      authHeaderValue: "",
      payloadWrapper: "object",
      customHeaders: {},
    });
    setPrograms([]);
    setStateCities([]);
    setCourseSpecializations([]);
    setCustomColumns([]);
    setPayloadFields(createDefaultPayloadFields());
    setDefaultValues({});
    setUpgradConfig({ ...DEFAULT_UPGRAD_CONFIG });
    setErrors({});
    setApiTestResult(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      // Build column mapping from payload fields
      let columnMapping = payloadFieldsToColumnMapping(payloadFields);

      // Add custom columns to mapping
      customColumns.forEach((col) => {
        if (col.columnKey) {
          const apiKey = col.apiFieldName?.trim() || col.columnKey;
          columnMapping[col.columnKey] = apiKey;
        }
      });

      // Merge upGrad-specific config (LSQ ID + source-map + metadata)
      if (formData.apiType === "upgrad") {
        columnMapping = applyUpgradConfig(columnMapping, upgradConfig);
      }

      const universityData: UniversityFormData = {
        ...formData,
        dailyLeadLimit: formData.dailyLeadLimit === "" || formData.dailyLeadLimit == null ? null : Number(formData.dailyLeadLimit),
        apiTimeoutSeconds: Number(formData.apiTimeoutSeconds) || 30,
        defaultPushConcurrency: Number(formData.defaultPushConcurrency) || 2,
        utmLink: formData.utmLink,
        publisherPanelUrl: formData.publisherPanelUrl,
        publisherId: formData.publisherId,
        authType: formData.authType,
        authHeaderKey: formData.authHeaderKey,
        authHeaderValue: formData.authHeaderValue,
        payloadWrapper: formData.payloadWrapper,
        customHeaders: formData.customHeaders,
        programs: programs.filter((p) => p.trim()),
        stateCities,
        courseSpecializations,
        columnMapping,
        customColumns,
        payloadFields,
        defaultValues: Object.fromEntries(Object.entries(defaultValues).filter(([_, v]) => v.trim())),
      };

      // Call the parent's onSave handler (which should handle DB insert and state update)
      await onSave(universityData);

      // Reset form and close modal only after successful save
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error saving university:", error);
      setErrors({ submit: "Failed to save university. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Sample preview data for the payload editor
  const previewData: Record<string, string> = {
    name: "Abhishek",
    email: "abcd@gmail.com",
    mobile: "9876543210",
    state: "Delhi",
    city: "South Delhi",
    course: "Under Graduate",
    specialization: "Law",
    address: "123 Main Street",
  };

  const handleImportConfig = (data: UniversityExport) => {
    const imported = data.university;
    setFormData({
      name: imported.name || "",
      apiUrl: imported.apiUrl || "",
      collegeId: imported.collegeId || "",
      secretKey: imported.secretKey || "",
      source: imported.source || "dekhocampus",
      medium: imported.medium || "dekhocampus",
      campaign: imported.campaign || "API",
      leadsPerMinute: imported.leadsPerMinute || 90,
      apiTimeoutSeconds: (imported as any).apiTimeoutSeconds ?? (imported as any).api_timeout_seconds ?? 30,
      defaultPushConcurrency: (imported as any).defaultPushConcurrency ?? (imported as any).default_push_concurrency ?? 2,
      dailyLeadLimit: ((imported as any).dailyLeadLimit ?? "") as any,
      apiType: imported.apiType || "nopaperforms",
      utmLink: (imported as any).utmLink || "",
      publisherPanelUrl: (imported as any).publisherPanelUrl || "",
      publisherId: (imported as any).publisherId || "",
      authType: (imported as any).authType || "secret_key",
      authHeaderKey: (imported as any).authHeaderKey || "Authorization",
      authHeaderValue: (imported as any).authHeaderValue || "",
      payloadWrapper: (imported as any).payloadWrapper || "object",
      customHeaders: (imported as any).customHeaders || {},
      status: ((imported as any).status === "disabled" ? "disabled" : "live"),
    });
    setPrograms(imported.programs || []);
    setStateCities(imported.stateCities || []);
    setCourseSpecializations(imported.courseSpecializations || []);
    setCustomColumns(imported.customColumns || []);

    // Restore payload fields
    if (imported.payloadFields && imported.payloadFields.length > 0) {
      setPayloadFields(imported.payloadFields);
    } else if (imported.columnMapping && Object.keys(imported.columnMapping).length > 0) {
      setPayloadFields(columnMappingToPayloadFields(imported.columnMapping));
    }
    if (imported.columnMapping) setUpgradConfig(extractUpgradConfig(imported.columnMapping));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-4xl animate-slide-up rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Add New University</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure API integration for a new university</p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message Banner */}
        {errors.submit && (
          <div className="mx-6 mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Error Saving University</p>
              <p className="text-xs text-destructive/80 mt-1">{errors.submit}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[75vh] overflow-y-auto">
          {/* Import from existing config */}
          <section>
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Quick Setup
            </h3>
            <ImportConfigZone onImport={handleImportConfig} />
          </section>

          {/* API Type Selection */}
          <section>
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              API Type
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {apiTypeOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-4 transition-all ${
                    formData.apiType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="apiType"
                    value={opt.value}
                    checked={formData.apiType === opt.value}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{opt.description}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Basic Details */}
          <section>
            <h3 className="font-medium text-foreground mb-4">Basic Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">University Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`input-field ${errors.name ? "border-destructive" : ""}`}
                  placeholder="e.g., Lovely Professional University"
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  API URL {(formData.apiType === "nopaperforms" || formData.apiType === "upgrad") && "*"}
                </label>
                <input
                  type="url"
                  name="apiUrl"
                  value={formData.apiUrl}
                  onChange={handleInputChange}
                  className={`input-field ${errors.apiUrl ? "border-destructive" : ""}`}
                  placeholder={
                    formData.apiType === "upgrad"
                      ? "https://staging-lead-ms.upgrad.dev/apis/lead-drop/vendor/dekhocampus/"
                      : "https://api.nopaperforms.com/..."
                  }
                />
                {errors.apiUrl && <p className="text-xs text-destructive mt-1">{errors.apiUrl}</p>}
                {formData.apiType === "upgrad" && !errors.apiUrl && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Must end with <code>/apis/lead-drop/vendor/&lt;slug&gt;/</code> - replace <code>&lt;slug&gt;</code> with the vendor slug upGrad provided.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  College ID {formData.apiType === "nopaperforms" && "*"}
                </label>
                <input
                  type="text"
                  name="collegeId"
                  value={formData.collegeId}
                  onChange={handleInputChange}
                  className={`input-field ${errors.collegeId ? "border-destructive" : ""}`}
                  placeholder="e.g., 524"
                />
                {errors.collegeId && <p className="text-xs text-destructive mt-1">{errors.collegeId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Secret Key / Token {(formData.apiType === "nopaperforms" || formData.apiType === "upgrad") && "*"}
                </label>
                <input
                  type="password"
                  name="secretKey"
                  value={formData.secretKey}
                  onChange={handleInputChange}
                  className={`input-field ${errors.secretKey ? "border-destructive" : ""}`}
                  placeholder={formData.apiType === "upgrad" ? "user:pass (e.g. vendor1:password1)" : "API authentication key"}
                />
                {errors.secretKey && <p className="text-xs text-destructive mt-1">{errors.secretKey}</p>}
                {formData.apiType === "upgrad" && !errors.secretKey && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Basic auth - paste <code>user:pass</code>, base64 of it, or the full <code>Basic xxxx</code> value.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Lead Source Settings */}
          <section>
            <h3 className="font-medium text-foreground mb-4">Lead Source Settings</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Source</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="dekhocampus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Medium</label>
                <input
                  type="text"
                  name="medium"
                  value={formData.medium}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="dekhocampus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Campaign</label>
                <input
                  type="text"
                  name="campaign"
                  value={formData.campaign}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="API"
                />
              </div>
            </div>
          </section>

          {/* UTM Link */}
          <section>
            <h3 className="font-medium text-foreground mb-4">UTM Link</h3>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">UTM Tracking Link</label>
              <input
                type="url"
                name="utmLink"
                value={formData.utmLink}
                onChange={handleInputChange}
                className={`input-field ${errors.utmLink ? "border-destructive" : ""}`}
                placeholder="https://example.com/?utm_source=..."
              />
              {errors.utmLink && <p className="text-xs text-destructive mt-1">{errors.utmLink}</p>}
              <p className="text-xs text-muted-foreground mt-1">Optional UTM tracking URL for this university</p>
            </div>
          </section>

          {/* Publisher Panel */}
          <section>
            <h3 className="font-medium text-foreground mb-4">Publisher Panel Info</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Publisher Panel URL</label>
                <input
                  type="url"
                  name="publisherPanelUrl"
                  value={formData.publisherPanelUrl}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="https://publisher.university.com/login"
                />
                <p className="text-xs text-muted-foreground mt-1">Login URL for the publisher portal</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Publisher ID / Account</label>
                <input
                  type="text"
                  name="publisherId"
                  value={formData.publisherId}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g., DC-2024-001"
                />
                <p className="text-xs text-muted-foreground mt-1">Your publisher account ID</p>
              </div>
            </div>
          </section>

          {/* Authentication Config - for Custom APIs */}
          {formData.apiType === "custom" && (
            <section>
              <h3 className="font-medium text-foreground mb-4">Authentication Method</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                {[
                  { value: "secret_key", label: "Secret Key in Body", desc: "Key sent in JSON payload" },
                  { value: "bearer", label: "Bearer Token", desc: "Authorization: Bearer <token>" },
                  { value: "custom_header", label: "Custom Header", desc: "Custom header key & value" },
                  { value: "none", label: "No Auth", desc: "No authentication needed" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`relative flex cursor-pointer flex-col rounded-xl border-2 p-3 transition-all ${
                      formData.authType === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <input
                      type="radio"
                      name="authType"
                      value={opt.value}
                      checked={formData.authType === opt.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span className="font-medium text-foreground text-sm">{opt.label}</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground">{opt.desc}</span>
                  </label>
                ))}
              </div>
              {(formData.authType === "bearer" || formData.authType === "custom_header") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {formData.authType === "custom_header" && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-2">Header Key</label>
                      <input
                        type="text"
                        name="authHeaderKey"
                        value={formData.authHeaderKey}
                        onChange={handleInputChange}
                        className="input-field"
                        placeholder="e.g., X-API-Key"
                      />
                    </div>
                  )}
                  <div className={formData.authType === "bearer" ? "sm:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      {formData.authType === "bearer" ? "Bearer Token" : "Header Value"}
                    </label>
                    <input
                      type="password"
                      name="authHeaderValue"
                      value={formData.authHeaderValue}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder={formData.authType === "bearer" ? "qfasb&hba@b3pFKnIiMXpB" : "Header value"}
                    />
                  </div>
                </div>
              )}

              {/* Payload Wrapper */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-muted-foreground mb-2">Payload Format</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.payloadWrapper === "object" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payloadWrapper"
                      value="object"
                      checked={formData.payloadWrapper === "object"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">JSON Object</span>
                      <span className="block text-[10px] text-muted-foreground font-mono">{"{ ... }"}</span>
                    </div>
                  </label>
                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.payloadWrapper === "array" ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payloadWrapper"
                      value="array"
                      checked={formData.payloadWrapper === "array"}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div>
                      <span className="text-sm font-medium text-foreground">JSON Array</span>
                      <span className="block text-[10px] text-muted-foreground font-mono">{"[{ ... }]"}</span>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          )}

          {formData.apiType === "upgrad" && (
            <UpgradConfigSection
              config={upgradConfig}
              onChange={setUpgradConfig}
              source={formData.source}
              medium={formData.medium}
              campaign={formData.campaign}
              apiUrl={formData.apiUrl}
              onApiUrlChange={(url) => setFormData((p: typeof formData) => ({ ...p, apiUrl: url }))}
              secretKey={formData.secretKey}
              universityName={formData.name}
            />
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                API Payload Configuration
              </h3>
              <button
                type="button"
                onClick={() => downloadSampleCSV(payloadFields, formData.name || "university")}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" />
                Download Sample CSV
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Configure exactly what fields are sent to the API. Add, remove, or modify fields as needed. Each field
              maps to an API parameter.
            </p>
            <PayloadFieldsEditor
              fields={payloadFields}
              onChange={setPayloadFields}
              previewData={previewData}
              payloadWrapper={formData.payloadWrapper}
              dynamicValues={{
                source: formData.source,
                medium: formData.medium,
                campaign: formData.campaign,
                collegeId: formData.collegeId,
                secretKey: formData.secretKey,
              }}
            />
          </section>

          {/* Test API Button */}
          <section>
            <h3 className="font-medium text-foreground mb-4">Test API Connection</h3>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={testApiConnection}
                disabled={isTestingApi || !formData.apiUrl}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTestingApi ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test API Connection"
                )}
              </button>
              {apiTestResult && (
                <div
                  className={`flex items-center gap-2 text-sm ${apiTestResult.success ? "text-green-600" : "text-destructive"}`}
                >
                  {apiTestResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {apiTestResult.message}
                </div>
              )}
            </div>
          </section>

          {/* Rate Limiting */}
          <section>
            <h3 className="font-medium text-foreground mb-4">Rate Limiting</h3>
            <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Leads Per Minute</label>
                <input
                  type="number"
                  name="leadsPerMinute"
                  value={formData.leadsPerMinute}
                  onChange={handleInputChange}
                  className={`input-field ${errors.leadsPerMinute ? "border-destructive" : ""}`}
                  min="1"
                  max="120"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  1 lead every {Math.round(60 / formData.leadsPerMinute)} seconds
                </p>
                {errors.leadsPerMinute && <p className="text-xs text-destructive mt-1">{errors.leadsPerMinute}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">API Timeout (seconds)</label>
                <input
                  type="number"
                  name="apiTimeoutSeconds"
                  value={formData.apiTimeoutSeconds}
                  onChange={handleInputChange}
                  className={`input-field ${errors.apiTimeoutSeconds ? "border-destructive" : ""}`}
                  min="5"
                  max="300"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Default 30 sec. Use a higher value for slow partners like CTPL.
                </p>
                {errors.apiTimeoutSeconds && <p className="text-xs text-destructive mt-1">{errors.apiTimeoutSeconds}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Default Leads at One Time</label>
                <input
                  type="number"
                  name="defaultPushConcurrency"
                  value={formData.defaultPushConcurrency}
                  onChange={handleInputChange}
                  className={`input-field ${errors.defaultPushConcurrency ? "border-destructive" : ""}`}
                  min="1"
                  max="5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Default upload concurrency for this university. New default is 2.
                </p>
                {errors.defaultPushConcurrency && <p className="text-xs text-destructive mt-1">{errors.defaultPushConcurrency}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Daily Lead Limit (DLL)</label>
                <input
                  type="number"
                  name="dailyLeadLimit"
                  value={formData.dailyLeadLimit as any}
                  onChange={handleInputChange}
                  className="input-field"
                  min="1"
                  placeholder="Leave blank = unlimited"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Hard ceiling per day. Resets at midnight.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">University Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="live">🟢 Live - accept &amp; push leads</option>
                  <option value="disabled">🔴 Disabled - block all pushes</option>
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Disabled universities are skipped during push and shown at the bottom of the admin dashboard.
                </p>
              </div>
            </div>
          </section>

          {/* Programs */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Programs (Optional)</h3>
              <button
                type="button"
                onClick={addProgram}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Add Program
              </button>
            </div>
            {programs.length > 0 && (
              <div className="space-y-2">
                {programs.map((program, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={program}
                      onChange={(e) => updateProgram(index, e.target.value)}
                      className="input-field"
                      placeholder="e.g., B.Tech CSE"
                    />
                    <button
                      type="button"
                      onClick={() => removeProgram(index)}
                      className="flex h-12 w-12 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* State/City CSV Upload */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">State & City Data</h3>
              <button
                type="button"
                onClick={() => downloadSample("stateCity")}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" /> Sample CSV
              </button>
            </div>
            <div className="upload-zone cursor-pointer" onClick={() => stateCityRef.current?.click()}>
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {stateCities.length > 0
                  ? `✓ ${stateCities.length} locations uploaded`
                  : "Click to upload State/City CSV"}
              </p>
              <input ref={stateCityRef} type="file" accept=".csv" onChange={handleStateCityUpload} className="hidden" />
            </div>
            {stateCities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {[...new Set(stateCities.map((sc) => sc.state))].slice(0, 8).map((state, idx) => (
                  <span key={idx} className="badge-info">
                    {state}
                  </span>
                ))}
                {[...new Set(stateCities.map((sc) => sc.state))].length > 8 && (
                  <span className="badge-info">+{[...new Set(stateCities.map((sc) => sc.state))].length - 8} more</span>
                )}
              </div>
            )}
          </section>

          {/* Course/Specialization CSV Upload */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Course & Specialization Data</h3>
              <button
                type="button"
                onClick={() => downloadSample("courseSpec")}
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Download className="h-4 w-4" /> Sample CSV
              </button>
            </div>
            <div className="upload-zone cursor-pointer" onClick={() => courseSpecRef.current?.click()}>
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {courseSpecializations.length > 0
                  ? `✓ ${courseSpecializations.length} courses uploaded`
                  : "Click to upload Course/Specialization CSV"}
              </p>
              <input
                ref={courseSpecRef}
                type="file"
                accept=".csv"
                onChange={handleCourseSpecUpload}
                className="hidden"
              />
            </div>
            {courseSpecializations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {courseSpecializations.slice(0, 8).map((cs, idx) => (
                  <span key={idx} className="badge-success">
                    {cs.course}
                  </span>
                ))}
                {courseSpecializations.length > 8 && (
                  <span className="badge-success">+{courseSpecializations.length - 8} more</span>
                )}
              </div>
            )}
          </section>

          {/* Multi-Push Default Values */}
          <MultiPushDefaultsEditor
            payloadFields={payloadFields}
            customColumns={customColumns}
            values={defaultValues}
            onChange={setDefaultValues}
          />

          {/* Dynamic Columns */}
          <CustomColumnsSection
            columns={customColumns}
            onChange={setCustomColumns}
            courseSpecializations={courseSpecializations}
          />
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-6 py-3 rounded-lg font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save University"
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
