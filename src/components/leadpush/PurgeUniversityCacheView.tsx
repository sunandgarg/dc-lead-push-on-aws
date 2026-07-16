import { memo, useState, useCallback, useMemo } from "react";
import { Trash2, AlertTriangle, Loader2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const TIME_OPTIONS = [
  { label: "All (0 days)", days: 0 },
  { label: "Older than 1 day", days: 1 },
  { label: "Older than 2 days", days: 2 },
  { label: "Older than 30 days", days: 30 },
];

const TARGET_TABLES = [
  { key: "api_logs", label: "API Logs" },
  { key: "leads", label: "Leads" },
  { key: "upload_batches", label: "Upload Batches" },
] as const;

interface Props {
  universities: any[];
}

function PurgeUniversityCacheViewInner({ universities }: Props) {
  const { toast } = useToast();
  const [selectedUni, setSelectedUni] = useState<string>("__all__");
  const [purging, setPurging] = useState<string | null>(null);
  const [confirmDays, setConfirmDays] = useState<number | null>(null);

  const universityName = useMemo(() => {
    if (selectedUni === "__all__") return "ALL universities";
    const u = universities.find((x) => x.id === selectedUni);
    return u?.name || "Unknown";
  }, [selectedUni, universities]);

  const handlePurge = useCallback(
    async (days: number) => {
      setPurging("running");
      try {
        const { data, error } = await supabase.functions.invoke("purge-university-cache", {
          body: { university_id: selectedUni, days },
        });
        if (error) throw error;
        const results = data?.results || {};
        toast({
          title: "Cache Purged",
          description: `${universityName} - ${days > 0 ? `older than ${days} day(s)` : "ALL"}: ${Object.entries(results)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")}`,
        });
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Purge failed", variant: "destructive" });
      } finally {
        setPurging(null);
        setConfirmDays(null);
      }
    },
    [selectedUni, universityName, toast],
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-destructive/10">
          <Database className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Purge University Cache</h1>
          <p className="text-sm text-muted-foreground">
            Delete cached lead push data (API logs, leads, batches) for a specific university or all.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trash2 className="h-5 w-5 text-destructive" />
            Select University & Time Range
          </CardTitle>
          <CardDescription>
            This permanently deletes records from API Logs, Leads, and Upload Batches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">University</label>
            <Select value={selectedUni} onValueChange={setSelectedUni}>
              <SelectTrigger>
                <SelectValue placeholder="Select university" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Universities</SelectItem>
                {universities.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {confirmDays !== null ? (
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Confirm: Delete {confirmDays > 0 ? `data older than ${confirmDays} day(s)` : "ALL data"} for{" "}
                  <strong>{universityName}</strong>?
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={() => handlePurge(confirmDays)} disabled={!!purging}>
                  {purging ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" /> Purging...
                    </>
                  ) : (
                    "Yes, Delete"
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirmDays(null)} disabled={!!purging}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-2 block">Time Range</label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((opt) => (
                  <Button
                    key={opt.days}
                    variant="outline"
                    size="sm"
                    disabled={!!purging}
                    onClick={() => setConfirmDays(opt.days)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide self-center">Will purge:</span>
              {TARGET_TABLES.map((t) => (
                <Badge key={t.key} variant="outline" className="text-xs">
                  {t.label}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide self-center">✓ Preserved (never purged):</span>
              <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400">Lead Push Daily Stats</Badge>
              <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400">Cumulative Stats</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(PurgeUniversityCacheViewInner);
