import { memo, useMemo } from "react";
import { Layers, Info } from "lucide-react";
import { PayloadField } from "./PayloadFieldsEditor";
import { CustomColumn } from "./CustomColumnsSection";

interface Props {
  payloadFields: PayloadField[];
  customColumns?: CustomColumn[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

/**
 * Multi-Push Default Values editor.
 *
 * Instead of hard-coding fields like "course/specialization/campus", this pulls the
 * actual fields the user configured in the API Payload Configuration above
 * (only `lead_data` source-type fields need defaults - static/dynamic already have values).
 * Custom columns are also offered.
 *
 * The keys saved here are the `sourceKey` of the payload field (or custom column key),
 * which matches what `process-lead` reads from `apiConfig.universityDefaults`.
 */
export const MultiPushDefaultsEditor = memo(function MultiPushDefaultsEditor({
  payloadFields,
  customColumns = [],
  values,
  onChange,
}: Props) {
  const fieldOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { key: string; label: string; hint?: string }[] = [];

    // Pull ALL payload fields configured for this university so user can override any of them for Multi-Push
    payloadFields.forEach((f) => {
      const key = f.sourceKey || f.fieldName;
      if (!key || seen.has(key)) return;
      seen.add(key);
      const sourceLabel =
        f.sourceType === "static"
          ? "Static"
          : f.sourceType === "dynamic"
          ? "Dynamic"
          : "From Lead Data";
      opts.push({
        key,
        label: f.displayName || f.fieldName || key,
        hint: `→ API field: ${f.fieldName || key} (${sourceLabel})`,
      });
    });

    // Pull custom columns too
    customColumns.forEach((c) => {
      if (!c.columnKey || seen.has(c.columnKey)) return;
      seen.add(c.columnKey);
      opts.push({
        key: c.columnKey,
        label: c.columnName || c.columnKey,
        hint: "→ Custom column",
      });
    });

    return opts;
  }, [payloadFields, customColumns]);

  const update = (key: string, val: string) => {
    onChange({ ...values, [key]: val });
  };

  return (
    <section>
      <h3 className="font-medium text-foreground mb-2 flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        Multi-Push Default Values
      </h3>
      <p className="text-sm text-muted-foreground mb-3">
        Set fallback values used <strong>only by Multi-Push</strong> when the uploaded CSV doesn't include
        these fields. Fields below come from your API Payload Configuration above - change them there to
        add/remove rows here.
      </p>

      {fieldOptions.length === 0 ? (
        <div className="flex items-start gap-2 p-3 rounded-md bg-muted/40 border text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            No payload fields configured yet. Add fields in <strong>API Payload Configuration</strong> above
            (with source type "From Lead Data") and they will appear here.
          </span>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {fieldOptions.map((opt) => (
            <div key={opt.key}>
              <label className="block text-sm font-medium text-foreground mb-1">
                {opt.label}
                {opt.hint && (
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">{opt.hint}</span>
                )}
              </label>
              <input
                type="text"
                value={values[opt.key] || ""}
                onChange={(e) => update(opt.key, e.target.value)}
                className="input-field"
                placeholder={`Default ${opt.label.toLowerCase()} for Multi-Push`}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
});
