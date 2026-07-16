import { useRef, useCallback } from 'react';
import { Download, Upload, FileJson } from 'lucide-react';
import { PayloadField, columnMappingToPayloadFields } from './PayloadFieldsEditor';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface StateCity {
  state: string;
  city: string;
}

interface CourseSpecialization {
  course: string;
  specialization: string;
}

interface CustomColumn {
  columnKey: string;
  columnName: string;
  isRequired: boolean;
  sortOrder: number;
  values: { value: string; parentValue?: string }[];
  apiFieldName?: string;
}

// The canonical export shape for a single university.
// Index signature allows ANY extra column to flow through losslessly on export/import.
export interface UniversityExportData {
  [key: string]: any;
  name: string;
  apiUrl: string;
  collegeId: string;
  secretKey: string;
  secret_key?: string; // snake_case alias for portability
  source: string;
  medium: string;
  campaign: string;
  leadsPerMinute: number;
  apiTimeoutSeconds?: number;
  defaultPushConcurrency?: number;
  apiType: string;
  columnMapping: Record<string, string>;
  payloadFields: PayloadField[];
  programs: string[];
  stateCities: StateCity[];
  courseSpecializations: CourseSpecialization[];
  customColumns: CustomColumn[];
  utmLink?: string;
  publisherPanelUrl?: string;
  publisherId?: string;
  authType?: string;
  authHeaderKey?: string;
  authHeaderValue?: string;
  payloadWrapper?: string;
  customHeaders?: Record<string, string>;
  defaultValues?: Record<string, any>;
  status?: string;
  daily_lead_limit?: number | null;
}

// Wrapped export format (single)
export interface UniversityExport {
  version: string;
  exportedAt: string;
  university: UniversityExportData;
}

// Wrapped export format (bulk)
export interface BulkUniversityExport {
  version: string;
  exportedAt: string;
  count: number;
  universities: UniversityExportData[];
}

/** Convert a DB-shaped university object to the canonical export shape */
export function universityToExportData(uni: any): UniversityExportData {
  const payloadFields = columnMappingToPayloadFields(uni.column_mapping || {});
  const secret = uni.secret_key || '';
  // Full pass-through: export EVERY column from the DB row so re-import is lossless.
  // We keep the canonical camelCase aliases too, so downstream code keeps working.
  const raw = { ...(uni || {}) };
  return {
    ...raw, // every db column (snake_case + any custom field) preserved verbatim
    name: uni.name || '',
    apiUrl: uni.api_url || '',
    collegeId: uni.college_id || '',
    secretKey: secret,
    secret_key: secret,
    source: uni.source || 'dekhocampus',
    medium: uni.medium || 'dekhocampus',
    campaign: uni.campaign || 'API',
    leadsPerMinute: uni.leads_per_minute || 90,
    apiTimeoutSeconds: uni.api_timeout_seconds ?? 30,
    defaultPushConcurrency: uni.default_push_concurrency ?? 2,
    apiType: uni.api_type || 'nopaperforms',
    columnMapping: uni.column_mapping || {},
    payloadFields,
    programs: uni.programs || [],
    stateCities: uni.stateCities || [],
    courseSpecializations: uni.courseSpecializations || [],
    customColumns: uni.customColumns || [],
    utmLink: uni.utm_link || '',
    publisherPanelUrl: uni.publisher_panel_url || '',
    publisherId: uni.publisher_id || '',
    authType: uni.auth_type || 'secret_key',
    authHeaderKey: uni.auth_header_key || 'Authorization',
    authHeaderValue: uni.auth_header_value || '',
    payloadWrapper: uni.payload_wrapper || 'object',
    customHeaders: uni.custom_headers || {},
    defaultValues: uni.default_values || {},
    status: uni.status || 'live',
    daily_lead_limit: uni.daily_lead_limit ?? null,
  };
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Normalise any imported JSON into a UniversityExportData.
 * Handles: wrapped { university: ... }, flat { name, apiUrl, ... }, or flat { name, api_url, ... }
 */
export function normalizeImportedData(raw: any): UniversityExportData {
  // If wrapped
  const obj = raw?.university ?? raw;
  if (!obj || typeof obj !== 'object') throw new Error('Invalid configuration file');

  const name = obj.name;
  if (!name) throw new Error('Missing university name in config');

  // Lossless: forward EVERY field from the import payload, then overlay normalized aliases on top.
  return {
    ...obj,
    name,
    apiUrl: obj.apiUrl ?? obj.api_url ?? '',
    collegeId: obj.collegeId ?? obj.college_id ?? '',
    secretKey: obj.secretKey ?? obj.secret_key ?? '',
    source: obj.source ?? 'dekhocampus',
    medium: obj.medium ?? 'dekhocampus',
    campaign: obj.campaign ?? 'API',
    leadsPerMinute: obj.leadsPerMinute ?? obj.leads_per_minute ?? 90,
    apiTimeoutSeconds: obj.apiTimeoutSeconds ?? obj.api_timeout_seconds ?? 30,
    defaultPushConcurrency: obj.defaultPushConcurrency ?? obj.default_push_concurrency ?? 2,
    apiType: obj.apiType ?? obj.api_type ?? 'nopaperforms',
    columnMapping: obj.columnMapping ?? obj.column_mapping ?? {},
    payloadFields: obj.payloadFields ?? [],
    programs: obj.programs ?? [],
    stateCities: obj.stateCities ?? [],
    courseSpecializations: obj.courseSpecializations ?? [],
    customColumns: obj.customColumns ?? [],
    utmLink: obj.utmLink ?? obj.utm_link ?? '',
    publisherPanelUrl: obj.publisherPanelUrl ?? obj.publisher_panel_url ?? '',
    publisherId: obj.publisherId ?? obj.publisher_id ?? '',
    authType: obj.authType ?? obj.auth_type ?? 'secret_key',
    authHeaderKey: obj.authHeaderKey ?? obj.auth_header_key ?? 'Authorization',
    authHeaderValue: obj.authHeaderValue ?? obj.auth_header_value ?? '',
    payloadWrapper: obj.payloadWrapper ?? obj.payload_wrapper ?? 'object',
    customHeaders: obj.customHeaders ?? obj.custom_headers ?? {},
    defaultValues: obj.defaultValues ?? obj.default_values ?? {},
    status: obj.status ?? 'live',
    daily_lead_limit: obj.daily_lead_limit ?? obj.dailyLeadLimit ?? null,
  };
}

/**
 * Normalise bulk import – accepts array or { universities: [...] }
 */
export function normalizeBulkImport(raw: any): UniversityExportData[] {
  const arr = Array.isArray(raw) ? raw : (raw?.universities ?? null);
  if (!Array.isArray(arr)) throw new Error('Invalid bulk config file – expected an array');
  return arr.map(normalizeImportedData);
}

// ── Single university export/import props ──

interface UniversityImportExportProps {
  university?: any; // DB-shaped object
  onImport?: (data: UniversityExport) => void;
  mode: 'export' | 'import' | 'both';
}

export function UniversityImportExport({ university, onImport, mode }: UniversityImportExportProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = () => {
    if (!university) return;
    const exportData: UniversityExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      university: universityToExportData(university),
    };
    const safeName = university.name?.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'university';
    downloadJSON(exportData, `${safeName}_config.json`);
    toast({ title: 'Exported', description: `Configuration for ${university.name} downloaded (including secrets)` });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const normalised = normalizeImportedData(raw);
        onImport({ version: raw.version || '1.0', exportedAt: raw.exportedAt || new Date().toISOString(), university: normalised });
        toast({ title: 'Imported', description: `Configuration for "${normalised.name}" loaded` });
      } catch (error: any) {
        console.error('Import error:', error);
        toast({ title: 'Import Failed', description: error.message || 'Invalid JSON file or format', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      {(mode === 'export' || mode === 'both') && university && (
        <button
          type="button"
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Export university configuration as JSON (includes secrets)"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      )}

      {(mode === 'import' || mode === 'both') && onImport && (
        <>
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Import university configuration from JSON"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </>
      )}
    </div>
  );
}

// ── Import Config Zone (used in Add University modal) ──

export function ImportConfigZone({ onImport }: { onImport: (data: UniversityExport) => void }) {
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const normalised = normalizeImportedData(raw);
        onImport({ version: raw.version || '1.0', exportedAt: raw.exportedAt || new Date().toISOString(), university: normalised });
        toast({ title: 'Config Loaded', description: `"${normalised.name}" configuration applied to form` });
      } catch (error: any) {
        console.error('Import error:', error);
        toast({ title: 'Import Failed', description: error.message || 'Invalid JSON file or format', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
      onClick={() => importRef.current?.click()}
    >
      <FileJson className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-foreground">Import from Configuration</p>
      <p className="text-xs text-muted-foreground mt-1">
        Click to upload a previously exported university configuration JSON file
      </p>
      <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
    </div>
  );
}

// ── Bulk Export/Import (used in Universities list view) ──

interface BulkImportExportProps {
  universities: any[];
  onBulkImport?: (configs: UniversityExportData[]) => void;
}

export function BulkImportExport({ universities, onBulkImport }: BulkImportExportProps) {
  const importRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExportAll = useCallback(() => {
    if (!universities.length) return;
    const exportData: BulkUniversityExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      count: universities.length,
      universities: universities.map(universityToExportData),
    };
    downloadJSON(exportData, `all_universities_${new Date().toISOString().split('T')[0]}.json`);
    toast({ title: 'Bulk Export Complete', description: `${universities.length} university configs exported (including secrets)` });
  }, [universities, toast]);

  const handleBulkImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onBulkImport) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        // Handle single or bulk
        if (raw?.university && !raw?.universities) {
          const single = normalizeImportedData(raw);
          onBulkImport([single]);
          toast({ title: 'Imported', description: `1 university config imported` });
        } else {
          const configs = normalizeBulkImport(raw);
          onBulkImport(configs);
          toast({ title: 'Bulk Import Complete', description: `${configs.length} university configs imported` });
        }
      } catch (error: any) {
        console.error('Bulk import error:', error);
        toast({ title: 'Import Failed', description: error.message || 'Invalid JSON file', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onBulkImport, toast]);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportAll} className="gap-2">
        <Download className="h-4 w-4" />
        Export All ({universities.length})
      </Button>
      {onBulkImport && (
        <>
          <Button variant="outline" size="sm" onClick={() => importRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" />
            Import Bulk
          </Button>
          <input ref={importRef} type="file" accept=".json" onChange={handleBulkImport} className="hidden" />
        </>
      )}
    </div>
  );
}

export type { UniversityExportData as UniversityExportDataType };
