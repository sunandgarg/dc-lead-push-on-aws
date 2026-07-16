import { memo, useState, useCallback } from "react";
import { Download, Upload, Database, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function DbImportExportInner() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mode, setMode] = useState<"upsert" | "insert" | "replace">("upsert");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string>("");

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("db-import-export", {
        body: { action: "export" },
      });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `db-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const tableCount = data?.table_count ?? Object.keys(data?.tables || {}).length;
      const totalRows = data?.total_rows ?? Object.values(data?.tables || {}).reduce(
        (s: number, r: any) => s + (Array.isArray(r) ? r.length : 0),
        0,
      );
      const errCount = Object.keys(data?.errors || {}).length;
      toast({
        title: "Export Complete",
        description: `${tableCount} tables, ${totalRows} rows${errCount ? `, ${errCount} table errors` : ""}`,
      });
      if (errCount) console.warn("Export table errors:", data.errors);
    } catch (e: any) {
      toast({ title: "Export Failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }, [toast]);

  const handleImport = useCallback(async () => {
    if (!file) {
      toast({ title: "No file", description: "Choose a JSON export file first", variant: "destructive" });
      return;
    }
    setImporting(true);
    setProgress("");
    try {
      const text = await file.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr: any) {
        throw new Error(`Invalid JSON file: ${parseErr.message}`);
      }
      const tables: Record<string, any[]> = json?.tables && typeof json.tables === "object"
        ? json.tables
        : (json && typeof json === "object" && !Array.isArray(json) ? json : {});

      const tableNames = Object.keys(tables).filter((t) => Array.isArray(tables[t]));
      if (tableNames.length === 0) {
        throw new Error("No tables found in file. Expected { tables: { tableName: [...] } }");
      }

      const allResults: Record<string, any> = {};
      let okCount = 0;
      let failCount = 0;
      let partialCount = 0;

      // Send each table separately (and chunked) so big exports don't hit payload limits
      for (let i = 0; i < tableNames.length; i++) {
        const t = tableNames[i];
        const rows = tables[t] || [];
        setProgress(`Importing ${i + 1}/${tableNames.length}: ${t} (${rows.length})`);

        if (rows.length === 0) {
          allResults[t] = { inserted: 0 };
          okCount++;
          continue;
        }

        const ROWS_PER_CALL = 2000;
        let tableInserted = 0;
        let tableErr: string | undefined;
        for (let j = 0; j < rows.length; j += ROWS_PER_CALL) {
          const slice = rows.slice(j, j + ROWS_PER_CALL);
          const { data, error } = await supabase.functions.invoke("db-import-export", {
            body: { action: "import", mode, data: { tables: { [t]: slice } } },
          });
          if (error) {
            tableErr = error.message || String(error);
            console.error(`Import error on ${t}:`, error);
            break;
          }
          const r = data?.results?.[t];
          if (r?.error) { tableErr = r.error; break; }
          tableInserted += r?.inserted ?? slice.length;
          if (r?.partial_error) tableErr = r.partial_error;
        }
        if (tableErr && tableInserted === 0) {
          allResults[t] = { error: tableErr };
          failCount++;
        } else if (tableErr) {
          allResults[t] = { inserted: tableInserted, partial_error: tableErr };
          partialCount++;
        } else {
          allResults[t] = { inserted: tableInserted };
          okCount++;
        }
      }

      toast({
        title: failCount ? "Import Done (with errors)" : "Import Done",
        description: `${okCount} OK, ${failCount} failed${partialCount ? `, ${partialCount} partial` : ""}`,
        variant: failCount ? "destructive" : "default",
      });
      console.log("Import results:", allResults);
    } catch (e: any) {
      toast({ title: "Import Failed", description: e.message || String(e), variant: "destructive" });
    } finally {
      setImporting(false);
      setProgress("");
    }
  }, [file, mode, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5 text-primary" />
          Full Database Import / Export
        </CardTitle>
        <CardDescription>
          Export ALL tables (every column included) as a single JSON, or restore from a previous export.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg">
          <p className="font-medium mb-2 flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Everything
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Downloads a JSON file containing every row and every column from all tables.
          </p>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" /> Export Full Database
              </>
            )}
          </Button>
        </div>

        <div className="p-4 border rounded-lg space-y-3">
          <p className="font-medium flex items-center gap-2">
            <Upload className="h-4 w-4" /> Import From Export
          </p>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
          <div>
            <label className="text-sm font-medium mb-1 block">Mode</label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger className="w-full md:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upsert">Upsert (insert or update by id)</SelectItem>
                <SelectItem value="insert">Insert only (skip on conflict)</SelectItem>
                <SelectItem value="replace">Replace (delete all then insert)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "replace" && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
              <AlertTriangle className="h-4 w-4" /> Replace mode will DELETE all rows in each imported table first.
            </div>
          )}
          <Button onClick={handleImport} disabled={importing || !file}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Import
              </>
            )}
          </Button>
          {importing && progress && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">{progress}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const DbImportExport = memo(DbImportExportInner);
export default DbImportExport;
