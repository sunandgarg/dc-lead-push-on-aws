import { useMemo, useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";

export interface PayloadField {
  id: string;
  fieldName: string;
  displayName: string;
  sourceType: "lead_data" | "static" | "dynamic";
  sourceKey?: string;
  staticValue?: string;
  dynamicType?: "source" | "medium" | "campaign" | "college_id" | "secret_key";
  isRequired: boolean;
  sortOrder: number;
  isDefault?: boolean;
  hasDropdown?: boolean;
  dropdownValues?: { value: string; parentValue?: string }[];
}

function stringifyPayloadFieldValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";
  if (Array.isArray(value)) {
    return value.map(stringifyPayloadFieldValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKey = ["name", "contact_name", "value", "label", "displayName", "fieldName"].find(
      (key) => key in record,
    );
    if (preferredKey) return stringifyPayloadFieldValue(record[preferredKey]);
    return Object.values(record).map(stringifyPayloadFieldValue).filter(Boolean).join(", ");
  }
  return String(value).trim();
}

interface PayloadFieldsEditorProps {
  fields: PayloadField[];
  onChange: (fields: PayloadField[]) => void;
  previewData?: Record<string, string>;
  payloadWrapper?: string;
  dynamicValues: {
    source: string;
    medium: string;
    campaign: string;
    collegeId: string;
    secretKey: string;
  };
}

const defaultLeadFields = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "mobile", label: "Mobile" },
  { key: "state", label: "State" },
  { key: "city", label: "City" },
  { key: "course", label: "Course" },
  { key: "specialization", label: "Specialization" },
  { key: "address", label: "Address" },
];

export function PayloadFieldsEditor({ fields, onChange, previewData = {}, payloadWrapper = "object", dynamicValues }: PayloadFieldsEditorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customSourceKeyMode, setCustomSourceKeyMode] = useState<Set<string>>(() => new Set());

  const defaultLeadFieldKeys = useMemo(() => new Set(defaultLeadFields.map((f) => f.key)), []);

  const generateId = () => `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const addField = useCallback(() => {
    const newField: PayloadField = {
      id: generateId(),
      fieldName: "",
      displayName: "",
      sourceType: "lead_data",
      sourceKey: "",
      isRequired: false,
      sortOrder: fields.length,
    };
    onChange([...fields, newField]);
    setExpandedId(newField.id);
  }, [fields, onChange]);

  const updateField = useCallback(
    (id: string, updates: Partial<PayloadField>) => {
      onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
    },
    [fields, onChange],
  );

  const removeField = useCallback(
    (id: string) => {
      onChange(fields.filter((f) => f.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
      }
    },
    [fields, onChange, expandedId],
  );

  const moveField = useCallback(
    (id: string, direction: "up" | "down") => {
      const index = fields.findIndex((f) => f.id === id);
      if (index === -1) return;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= fields.length) return;

      const newFields = [...fields];
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      newFields.forEach((f, i) => (f.sortOrder = i));
      onChange(newFields);
    },
    [fields, onChange],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSourceTypeChange = useCallback(
    (fieldId: string, newType: "lead_data" | "static" | "dynamic") => {
      const updates: Partial<PayloadField> = { sourceType: newType };

      if (newType === "lead_data") {
        updates.staticValue = undefined;
        updates.dynamicType = undefined;
      } else if (newType === "static") {
        updates.sourceKey = undefined;
        updates.dynamicType = undefined;
        if (!fields.find((f) => f.id === fieldId)?.staticValue) {
          updates.staticValue = "";
        }
      } else if (newType === "dynamic") {
        updates.sourceKey = undefined;
        updates.staticValue = undefined;
        if (!fields.find((f) => f.id === fieldId)?.dynamicType) {
          updates.dynamicType = "source";
        }
      }

      updateField(fieldId, updates);
    },
    [fields, updateField],
  );

  const getPreviewValue = useCallback(
    (field: PayloadField): string => {
      if (field.sourceType === "static") {
        return field.staticValue || "[empty]";
      }
      if (field.sourceType === "dynamic") {
        switch (field.dynamicType) {
          case "source":
            return dynamicValues.source || "[source]";
          case "medium":
            return dynamicValues.medium || "[medium]";
          case "campaign":
            return dynamicValues.campaign || "[campaign]";
          case "college_id":
            return dynamicValues.collegeId || "[college_id]";
          case "secret_key":
            return "[SECRET_KEY]";
          default:
            return "[dynamic]";
        }
      }
      if (field.sourceKey && previewData[field.sourceKey]) {
        return previewData[field.sourceKey];
      }
      return `[${field.sourceKey || field.displayName || "value"}]`;
    },
    [dynamicValues, previewData],
  );

  const buildPayloadPreview = useCallback((): Record<string, string> => {
    const payload: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.fieldName) {
        payload[field.fieldName] = getPreviewValue(field);
      }
    });
    return payload;
  }, [fields, getPreviewValue]);

  return (
    <div className="space-y-4">
      {/* Payload Preview */}
      <div className="bg-muted/30 rounded-xl p-4 border border-border">
        <h4 className="text-sm font-medium text-foreground mb-2">Live Payload Preview</h4>
        <pre className="bg-background p-4 rounded-lg overflow-x-auto font-mono text-xs text-foreground whitespace-pre-wrap border border-border max-h-48 overflow-y-auto">
          {JSON.stringify(payloadWrapper === "array" ? [buildPayloadPreview()] : buildPayloadPreview(), null, 2)}
        </pre>
      </div>

      {/* Field List */}
      <div className="space-y-2">
        {fields.map((field, index) => {
          const isExpanded = expandedId === field.id;

          return (
            <div
              key={field.id}
              className={`border rounded-lg transition-all ${
                isExpanded ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              {/* Header Row - Only this should toggle expansion */}
              <div
                className="flex items-center gap-2 p-3 cursor-pointer select-none"
                onClick={() => toggleExpanded(field.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground truncate">
                      {field.fieldName || "[No API Field Name]"}
                    </span>
                    {field.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">Default</span>
                    )}
                    {field.isRequired && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {field.sourceType === "static"
                      ? `Static: ${field.staticValue || "[empty]"}`
                      : field.sourceType === "dynamic"
                        ? `Dynamic: ${field.dynamicType}`
                        : `From: ${field.sourceKey || "[select source]"}`}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveField(field.id, "up");
                    }}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveField(field.id, "down");
                    }}
                    disabled={index === fields.length - 1}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeField(field.id);
                    }}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Content - Click events here should NOT toggle */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-2" onClick={(e) => e.stopPropagation()}>
                  <div className="grid gap-3 sm:grid-cols-2 pt-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">API Field Name *</label>
                      <input
                        type="text"
                        value={field.fieldName}
                        onChange={(e) => updateField(field.id, { fieldName: e.target.value })}
                        className="input-field text-sm"
                        placeholder="e.g., field_program"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Exact field name sent to API</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                      <input
                        type="text"
                        value={field.displayName}
                        onChange={(e) => updateField(field.id, { displayName: e.target.value })}
                        className="input-field text-sm"
                        placeholder="e.g., Program"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Shown in forms and CSV mapping</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Value Source</label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {/* Lead Data Button */}
                      <button
                        type="button"
                        onClick={() => handleSourceTypeChange(field.id, "lead_data")}
                        className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${
                          field.sourceType === "lead_data"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="text-sm">From Lead Data</span>
                      </button>

                      {/* Static Value Button */}
                      <button
                        type="button"
                        onClick={() => handleSourceTypeChange(field.id, "static")}
                        className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${
                          field.sourceType === "static"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="text-sm">Static Value</span>
                      </button>

                      {/* Dynamic Field Button */}
                      <button
                        type="button"
                        onClick={() => handleSourceTypeChange(field.id, "dynamic")}
                        className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${
                          field.sourceType === "dynamic"
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-foreground hover:border-primary/50"
                        }`}
                      >
                        <span className="text-sm">Dynamic Field</span>
                      </button>
                    </div>
                  </div>

                  {/* Conditional source options */}
                  {field.sourceType === "lead_data" && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Map from Lead Field
                      </label>
                      <select
                        value={customSourceKeyMode.has(field.id) ? "__custom" : field.sourceKey || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__custom") {
                            setCustomSourceKeyMode((prev) => new Set(prev).add(field.id));
                            updateField(field.id, { sourceKey: field.sourceKey || "" });
                          } else {
                            setCustomSourceKeyMode((prev) => {
                              const next = new Set(prev);
                              next.delete(field.id);
                              return next;
                            });
                            updateField(field.id, { sourceKey: v });
                          }
                        }}
                        className="input-field text-sm bg-card"
                      >
                        <option value="">-- Select or type custom --</option>
                        {defaultLeadFields.map((lf) => (
                          <option key={lf.key} value={lf.key}>
                            {lf.label} ({lf.key})
                          </option>
                        ))}
                        <option value="__custom">Custom field name...</option>
                      </select>
                      {(customSourceKeyMode.has(field.id) ||
                        (field.sourceKey && !defaultLeadFieldKeys.has(field.sourceKey))) && (
                        <input
                          type="text"
                          className="input-field text-sm mt-2"
                          placeholder="Enter custom field key"
                          value={field.sourceKey || ""}
                          onChange={(e) => updateField(field.id, { sourceKey: e.target.value })}
                        />
                      )}
                    </div>
                  )}

                  {field.sourceType === "static" && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Static Value</label>
                      <input
                        type="text"
                        value={field.staticValue || ""}
                        onChange={(e) => updateField(field.id, { staticValue: e.target.value })}
                        className="input-field text-sm"
                        placeholder="Enter fixed value (sent with every API call)"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        This value will be included in every lead submission
                      </p>
                    </div>
                  )}

                  {field.sourceType === "dynamic" && (
                    <div className="mt-3">
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Dynamic Value Type</label>
                      <select
                        value={field.dynamicType || ""}
                        onChange={(e) =>
                          updateField(field.id, { dynamicType: e.target.value as PayloadField["dynamicType"] })
                        }
                        className="input-field text-sm bg-card"
                      >
                        <option value="">-- Select dynamic type --</option>
                        <option value="source">Source (from university config)</option>
                        <option value="medium">Medium (from lead or config)</option>
                        <option value="campaign">Campaign (from lead or config)</option>
                        <option value="college_id">College ID</option>
                        <option value="secret_key">Secret Key</option>
                      </select>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.isRequired}
                        onChange={(e) => updateField(field.id, { isRequired: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">Required field</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.hasDropdown || false}
                        onChange={(e) => updateField(field.id, { hasDropdown: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">Has dropdown options</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Field Button */}
      <button
        type="button"
        onClick={addField}
        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add Payload Field
      </button>
    </div>
  );
}

// Custom column interface for enhanced CSV generation
export interface CustomColumnForCSV {
  columnKey: string;
  columnName: string;
  values: { value: string; parentValue?: string }[];
}

// Generate sample CSV based on payload fields configuration with custom columns
export function generateSampleCSVFromPayloadFields(
  fields: PayloadField[],
  universityName: string = "university",
  customColumns: CustomColumnForCSV[] = [],
): { headers: string[]; sampleRow: string[]; csv: string; commentRow?: string } {
  const leadDataFields = fields
    .filter((f) => f.sourceType === "lead_data" && f.sourceKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const payloadHeaders = leadDataFields.map((f) => f.sourceKey || f.fieldName);
  const customColumnHeaders = customColumns
    .filter((cc) => !payloadHeaders.includes(cc.columnKey))
    .map((cc) => cc.columnKey);

  const headers = [...payloadHeaders, ...customColumnHeaders];

  const sampleValues: Record<string, string> = {
    name: "John Doe",
    email: "john.doe@example.com",
    mobile: "9876543210",
    state: "Delhi",
    city: "New Delhi",
    course: "B.Tech",
    specialization: "Computer Science",
    address: "123 Main Street, New Delhi",
  };

  const sampleRow = headers.map((header) => {
    const payloadField = leadDataFields.find((f) => f.sourceKey === header || f.fieldName === header);
    if (payloadField?.hasDropdown && payloadField.dropdownValues?.length) {
      return payloadField.dropdownValues[0]?.value || `Sample ${payloadField.displayName || header}`;
    }

    const customCol = customColumns.find((cc) => cc.columnKey === header);
    if (customCol && customCol.values.length > 0) {
      return customCol.values[0].value;
    }

    if (sampleValues[header]) {
      return sampleValues[header];
    }

    const field = leadDataFields.find((f) => f.sourceKey === header);
    const displayName = field?.displayName || header;
    return `Sample ${displayName}`;
  });

  const commentValues = headers.map((header) => {
    const payloadField = leadDataFields.find((f) => f.sourceKey === header || f.fieldName === header);
    if (payloadField?.hasDropdown && payloadField.dropdownValues?.length) {
      const values = payloadField.dropdownValues.map((v) => v.value).slice(0, 5);
      return `Options: ${values.join(" | ")}${payloadField.dropdownValues.length > 5 ? " | ..." : ""}`;
    }

    const customCol = customColumns.find((cc) => cc.columnKey === header);
    if (customCol && customCol.values.length > 0) {
      const values = customCol.values.map((v) => v.value).slice(0, 5);
      return `Options: ${values.join(" | ")}${customCol.values.length > 5 ? " | ..." : ""}`;
    }

    return "";
  });

  const hasComments = commentValues.some((v) => v !== "");
  const csvLines: string[] = [];

  if (hasComments) {
    csvLines.push("# " + commentValues.map((val) => (val ? `"${val}"` : '""')).join(","));
  }

  csvLines.push(headers.join(","));
  csvLines.push(sampleRow.map((val) => `"${val}"`).join(","));

  csvLines.push(
    headers
      .map((header, i) => {
        const val = sampleRow[i];
        if (header === "name") return '"Jane Smith"';
        if (header === "email") return '"jane.smith@example.com"';
        if (header === "mobile") return '"9123456780"';
        if (header === "state") return '"Maharashtra"';
        if (header === "city") return '"Mumbai"';

        const customCol = customColumns.find((cc) => cc.columnKey === header);
        if (customCol && customCol.values.length > 1) {
          return `"${customCol.values[1].value}"`;
        }

        return `"${val}"`;
      })
      .join(","),
  );

  return {
    headers,
    sampleRow,
    csv: csvLines.join("\n"),
    commentRow: hasComments ? commentValues.join(",") : undefined,
  };
}

export function downloadSampleCSV(
  fields: PayloadField[],
  universityName: string = "university",
  customColumns: CustomColumnForCSV[] = [],
) {
  const { csv } = generateSampleCSVFromPayloadFields(fields, universityName, customColumns);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${universityName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_sample_leads.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function createDefaultPayloadFields(): PayloadField[] {
  return [
    {
      id: "default_name",
      fieldName: "name",
      displayName: "Name",
      sourceType: "lead_data",
      sourceKey: "name",
      isRequired: true,
      sortOrder: 0,
      isDefault: true,
    },
    {
      id: "default_email",
      fieldName: "email",
      displayName: "Email",
      sourceType: "lead_data",
      sourceKey: "email",
      isRequired: true,
      sortOrder: 1,
      isDefault: true,
    },
    {
      id: "default_mobile",
      fieldName: "mobile",
      displayName: "Mobile",
      sourceType: "lead_data",
      sourceKey: "mobile",
      isRequired: true,
      sortOrder: 2,
      isDefault: true,
    },
    {
      id: "default_state",
      fieldName: "state",
      displayName: "State",
      sourceType: "lead_data",
      sourceKey: "state",
      isRequired: false,
      sortOrder: 3,
      isDefault: true,
    },
    {
      id: "default_city",
      fieldName: "city",
      displayName: "City",
      sourceType: "lead_data",
      sourceKey: "city",
      isRequired: false,
      sortOrder: 4,
      isDefault: true,
    },
    {
      id: "default_source",
      fieldName: "source",
      displayName: "Source",
      sourceType: "dynamic",
      dynamicType: "source",
      isRequired: true,
      sortOrder: 5,
      isDefault: true,
    },
    {
      id: "default_medium",
      fieldName: "medium",
      displayName: "Medium",
      sourceType: "dynamic",
      dynamicType: "medium",
      isRequired: true,
      sortOrder: 6,
      isDefault: true,
    },
    {
      id: "default_campaign",
      fieldName: "campaign",
      displayName: "Campaign",
      sourceType: "dynamic",
      dynamicType: "campaign",
      isRequired: true,
      sortOrder: 7,
      isDefault: true,
    },
    {
      id: "default_college_id",
      fieldName: "college_id",
      displayName: "College ID",
      sourceType: "dynamic",
      dynamicType: "college_id",
      isRequired: true,
      sortOrder: 8,
      isDefault: true,
    },
    {
      id: "default_secret_key",
      fieldName: "secret_key",
      displayName: "Secret Key",
      sourceType: "dynamic",
      dynamicType: "secret_key",
      isRequired: true,
      sortOrder: 9,
      isDefault: true,
    },
  ];
}

export function payloadFieldsToColumnMapping(fields: PayloadField[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  fields.forEach((field) => {
    if (!field.fieldName) return;

    if (field.sourceType === "lead_data" && field.sourceKey) {
      mapping[field.sourceKey] = field.fieldName;
    } else if (field.sourceType === "static" && field.staticValue !== undefined) {
      mapping[`__static_${field.fieldName}`] = field.staticValue;
    }

    mapping[`__field_${field.id}`] = JSON.stringify({
      fieldName: field.fieldName,
      displayName: field.displayName,
      sourceType: field.sourceType,
      sourceKey: field.sourceKey,
      staticValue: field.staticValue,
      dynamicType: field.dynamicType,
      isRequired: field.isRequired,
      sortOrder: field.sortOrder,
      isDefault: field.isDefault,
      hasDropdown: field.hasDropdown,
    });
  });

  return mapping;
}

export function columnMappingToPayloadFields(mapping: Record<string, string>): PayloadField[] {
  const fields: PayloadField[] = [];

  Object.entries(mapping).forEach(([key, value]) => {
    if (key.startsWith("__field_")) {
      try {
        const config = JSON.parse(value) as Partial<PayloadField>;
        const fieldName = stringifyPayloadFieldValue(config.fieldName);
        if (!fieldName) return;

        fields.push({
          id: key.replace("__field_", ""),
          ...config,
          fieldName,
          displayName: stringifyPayloadFieldValue(config.displayName) || fieldName,
          sourceKey: stringifyPayloadFieldValue(config.sourceKey) || undefined,
          staticValue: stringifyPayloadFieldValue(config.staticValue) || undefined,
        });
      } catch {
        // Ignore invalid JSON
      }
    }
  });

  fields.sort((a, b) => a.sortOrder - b.sortOrder);

  if (fields.length === 0) {
    return createDefaultPayloadFields();
  }

  return fields;
}
