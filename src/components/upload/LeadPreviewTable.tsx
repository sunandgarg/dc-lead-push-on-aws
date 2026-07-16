import { RotateCcw, CheckCircle2, XCircle, Clock, Eye, AlertTriangle, Pencil, Check, X } from "lucide-react";
import { useState, Fragment, useMemo } from "react";
import { type Lead } from "@/utils/leadValidation";

// Module-level helper: recursively flatten any value to a string for safe React rendering
const safeStringify = (val: unknown): string => {
  if (typeof val === "string") return val;
  if (val == null) return "";
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) return val.map(safeStringify).filter(Boolean).join(", ");
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const preferred = ["name", "contact_name", "value", "label"].find((k) => k in obj);
    if (preferred) return safeStringify(obj[preferred]);
    return Object.values(obj).map(safeStringify).filter(Boolean).join(", ");
  }
  return String(val);
};

interface LeadPreviewTableProps {
  leads: Lead[];
  showStatus?: boolean;
  leadStatuses?: Map<number, "pending" | "success" | "failed" | "duplicate">;
  leadResponses?: Map<number, string>;
  leadPayloads?: Map<number, string>;
  validationErrors?: Map<number, string[]>;
  dbDuplicates?: Set<number>;
  onRetry?: (index: number) => void;
  onUpdateLead?: (index: number, lead: Lead) => void;
  isEditable?: boolean;
  rowOffset?: number;
}

export function LeadPreviewTable({
  leads,
  showStatus = false,
  leadStatuses = new Map(),
  leadResponses = new Map(),
  leadPayloads = new Map(),
  validationErrors = new Map(),
  dbDuplicates = new Set(),
  onRetry,
  onUpdateLead,
  isEditable = false,
  rowOffset = 0,
}: LeadPreviewTableProps) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editData, setEditData] = useState<Lead | null>(null);

  // Deep-normalize every lead value to a string - prevents React from ever seeing an object child.
  // Use JSON.stringify as fingerprint so ANY nested value change triggers recalculation.
  const leadsJson = JSON.stringify(leads);
  const safeLeads = useMemo(
    () => leads.map((lead) => {
      const safe: Record<string, string> = {};
      for (const [k, v] of Object.entries(lead)) {
        safe[k] = safeStringify(v);
      }
      return safe as unknown as Lead;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leadsJson],
  );

  const getStatusIcon = (index: number) => {
    // Check for db duplicates
    if (dbDuplicates.has(index)) {
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    }

    // Check for validation errors
    if (validationErrors.has(index)) {
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    }

    const status = leadStatuses.get(index);
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "duplicate":
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (index: number) => {
    const status = leadStatuses.get(index);
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-success/10 text-success">
            Success
          </span>
        );
      case "duplicate":
      case "failed":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/10 text-destructive">
            Failed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const formatResponse = (response: unknown) => {
    const safeResponse = safeStringify(response);
    try {
      const parsed = JSON.parse(safeResponse);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return safeResponse;
    }
  };

  const getResponseSummary = (response: unknown) => {
    const safeResponse = safeStringify(response);
    try {
      const parsed = JSON.parse(safeResponse);
      if (parsed.message) return parsed.message;
      if (parsed.error) return parsed.error;
      if (parsed.status) return parsed.status;
      return "View response";
    } catch {
      return safeResponse.substring(0, 30) + (safeResponse.length > 30 ? "..." : "");
    }
  };

  const startEditing = (index: number) => {
    setEditingRow(index);
    // The preview is tolerant of historical/object-valued leads. The edit
    // controls must be equally strict: an input value may not receive an
    // object such as `{ contact_name: "..." }`.
    setEditData(
      Object.fromEntries(
        Object.entries(leads[index] || {}).map(([key, value]) => [key, safeStringify(value)]),
      ) as Lead,
    );
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditData(null);
  };

  const saveEditing = () => {
    if (editingRow !== null && editData && onUpdateLead) {
      onUpdateLead(editingRow, editData);
      setEditingRow(null);
      setEditData(null);
    }
  };

  const updateField = (field: keyof Lead, value: string) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  const hasValidationErrors = validationErrors.size > 0;
  const hasDbDuplicates = dbDuplicates.size > 0;
  const showStatusCol = showStatus || hasValidationErrors || hasDbDuplicates;
  const showActionCol = showStatus || isEditable;
  const showPayloadCol = showStatus || isEditable;
  const statusDataColumns = (showPayloadCol ? 1 : 0) + (showStatus ? 1 : 0);
  const colSpan = 5 + (showStatusCol ? 1 : 0) + statusDataColumns + (showActionCol ? 1 : 0);

  const getDisplayValue = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (value == null) return "";

    if (Array.isArray(value)) {
      return value.map(getDisplayValue).filter(Boolean).join(", ");
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 1) {
        return getDisplayValue(entries[0][1]);
      }

      const preferredKey = ["name", "contact_name", "value", "label"].find(
        (key) => key in (value as Record<string, unknown>),
      );
      if (preferredKey) {
        return getDisplayValue((value as Record<string, unknown>)[preferredKey]);
      }

      return entries
        .map(([, nestedValue]) => getDisplayValue(nestedValue))
        .filter(Boolean)
        .join(", ");
    }

    return "";
  };

  const renderCellValue = (value: unknown, fallback: string = "-") => {
    const displayValue = getDisplayValue(value).trim();
    return displayValue || fallback;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Mobile</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Location</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Course</th>
            {(showStatus || hasValidationErrors || hasDbDuplicates) && (
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
            )}
            {showPayloadCol && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Request JSON</th>}
            {showStatus && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Response JSON</th>}
            {(showStatus || isEditable) && (
              <th className="px-3 py-2 text-center font-medium text-muted-foreground">Action</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {safeLeads.map((lead, index) => {
            const actualIndex = rowOffset + index;
            const errors = validationErrors.get(actualIndex);
            const hasErrors = errors && errors.length > 0;
            const isDbDuplicate = dbDuplicates.has(actualIndex);
            const isEditing = editingRow === actualIndex;

            return (
              <Fragment key={index}>
                <tr
                  className={`hover:bg-muted/30 transition-colors ${hasErrors ? "bg-warning/5" : ""} ${isDbDuplicate ? "bg-orange-50 dark:bg-orange-950/20" : ""}`}
                >
                  {isEditing && editData ? (
                    <>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={editData.name}
                          onChange={(e) => updateField("name", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="email"
                          value={editData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="tel"
                          value={editData.mobile}
                          onChange={(e) => updateField("mobile", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background font-mono"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={editData.state}
                            onChange={(e) => updateField("state", e.target.value)}
                            placeholder="State"
                            className="w-1/2 px-2 py-1 text-sm border border-border rounded bg-background"
                          />
                          <input
                            type="text"
                            value={editData.city}
                            onChange={(e) => updateField("city", e.target.value)}
                            placeholder="City"
                            className="w-1/2 px-2 py-1 text-sm border border-border rounded bg-background"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          value={editData.course}
                          onChange={(e) => updateField("course", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-foreground font-medium">
                        {renderCellValue(lead.name, "Missing") === "Missing" ? (
                          <span className="text-destructive italic">Missing</span>
                        ) : (
                          renderCellValue(lead.name)
                        )}
                      </td>
                      <td className="px-3 py-2 text-foreground">
                        {renderCellValue(lead.email, "Missing") === "Missing" ? (
                          <span className="text-destructive italic">Missing</span>
                        ) : (
                          renderCellValue(lead.email)
                        )}
                      </td>
                      <td className="px-3 py-2 text-foreground font-mono text-xs">
                        {renderCellValue(lead.mobile, "Missing") === "Missing" ? (
                          <span className="text-destructive italic">Missing</span>
                        ) : (
                          renderCellValue(lead.mobile)
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {(() => {
                          const city = getDisplayValue(lead.city).trim();
                          const state = getDisplayValue(lead.state).trim();
                          if (city && state) return `${city}, ${state}`;
                          return city || state || "-";
                        })()}
                      </td>
                      <td className="px-3 py-2">
                        <span className="badge-info text-xs">{renderCellValue(lead.course)}</span>
                      </td>
                    </>
                  )}

                  {(showStatus || hasValidationErrors || hasDbDuplicates) && (
                    <td className="px-3 py-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {getStatusIcon(actualIndex)}
                        {showStatus && getStatusBadge(actualIndex)}
                      </div>
                      {hasErrors && (
                        <button
                          onClick={() => setExpandedRow(expandedRow === actualIndex ? null : actualIndex)}
                          className="block mx-auto mt-1 text-xs text-warning hover:underline"
                        >
                          {errors.length} error(s)
                        </button>
                      )}
                      {isDbDuplicate && !hasErrors && (
                        <span className="block mx-auto mt-1 text-xs text-warning">DB Duplicate</span>
                      )}
                    </td>
                  )}

                  {showPayloadCol && (
                    <td className="px-3 py-2">
                      {leadPayloads.has(actualIndex) ? (
                        <button
                          onClick={() => setExpandedRow(expandedRow === actualIndex ? null : actualIndex)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Eye className="h-3 w-3" />
                          View JSON
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  )}

                  {showStatus && (
                    <td className="px-3 py-2">
                      {leadResponses.has(actualIndex) ? (
                        <button
                          onClick={() => setExpandedRow(expandedRow === actualIndex ? null : actualIndex)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Eye className="h-3 w-3" />
                          {getResponseSummary(leadResponses.get(actualIndex) || "")}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  )}

                  {(showStatus || isEditable) && (
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={saveEditing} className="p-1 text-success hover:bg-success/10 rounded">
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {isEditable && onUpdateLead && (
                            <button
                              onClick={() => startEditing(actualIndex)}
                              className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                              title="Edit lead"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}

                          {leadStatuses.get(actualIndex) === "failed" && onRetry && (
                            <button
                              onClick={() => onRetry(actualIndex)}
                              className="flex items-center gap-1 text-xs text-warning hover:underline"
                            >
                              <RotateCcw className="h-3 w-3" /> Retry
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>

                {/* Expanded row for validation errors */}
                {hasErrors && expandedRow === actualIndex && (
                  <tr className="bg-warning/10">
                    <td colSpan={colSpan} className="px-3 py-3">
                      <p className="font-medium text-warning mb-2 text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Validation Errors:
                      </p>
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                        {errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>

                      {leadPayloads.has(actualIndex) && (
                        <>
                          <p className="font-medium text-muted-foreground mt-4 mb-2 text-xs">Mapped Payload (JSON):</p>
                          <pre className="bg-background p-3 rounded-lg overflow-x-auto font-mono text-xs text-foreground whitespace-pre-wrap">
                            {formatResponse(leadPayloads.get(actualIndex) || "")}
                          </pre>
                        </>
                      )}
                    </td>
                  </tr>
                )}

                {/* Expanded row for payload/response */}
                {!hasErrors &&
                  expandedRow === actualIndex &&
                  (leadPayloads.has(actualIndex) || (showStatus && leadResponses.has(actualIndex))) && (
                    <tr className="bg-muted/20">
                      <td colSpan={colSpan} className="px-3 py-3 space-y-4">
                        {leadPayloads.has(actualIndex) && (
                          <div>
                            <p className="font-medium text-muted-foreground mb-2 text-xs">Mapped Payload (JSON):</p>
                            <pre className="bg-background p-3 rounded-lg overflow-x-auto font-mono text-xs text-foreground whitespace-pre-wrap">
                              {formatResponse(leadPayloads.get(actualIndex) || "")}
                            </pre>
                          </div>
                        )}

                        {showStatus && leadResponses.has(actualIndex) && (
                          <div>
                            <p className="font-medium text-muted-foreground mb-2 text-xs">API Response:</p>
                            <pre className="bg-background p-3 rounded-lg overflow-x-auto font-mono text-xs text-foreground whitespace-pre-wrap">
                              {formatResponse(leadResponses.get(actualIndex) || "")}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
