import { memo, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Globe,
  Hash,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Gauge,
  Loader2,
} from "lucide-react";
import { UniversityApiPanel } from "@/components/universities/UniversityApiPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UniversityExportButton } from "./UniversityExport";
import { BulkImportExport, UniversityExportData } from "@/components/universities/UniversityImportExport";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UniversitiesViewProps {
  universities: any[];
  onAdd: () => void;
  onEdit: (uni: any) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onRefresh: () => void;
  onBulkImport?: (configs: UniversityExportData[]) => void;
}

export function UniversitiesView({ universities, onAdd, onEdit, onDelete, onBulkDelete, onRefresh, onBulkImport }: UniversitiesViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());
  const [dllUni, setDllUni] = useState<any | null>(null);
  const [dllValue, setDllValue] = useState<string>("");
  const [savingDll, setSavingDll] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const apiUniversities = useMemo(() => universities.filter((uni) => uni.api_url?.trim()), [universities]);

  const filteredUniversities = useMemo(() => {
    if (!searchTerm.trim()) return apiUniversities;
    const term = searchTerm.toLowerCase();
    return apiUniversities.filter(
      (uni) => uni.name?.toLowerCase().includes(term) || uni.api_url?.toLowerCase().includes(term),
    );
  }, [apiUniversities, searchTerm]);

  const bulkDeleteLabel = searchTerm.trim() ? "Delete Filtered" : "Delete All";
  const bulkDeleteCount = filteredUniversities.length;

  const handleBulkDelete = () => {
    if (!onBulkDelete || bulkDeleteCount === 0) return;
    const scope = searchTerm.trim() ? "filtered universities" : "universities";
    const confirmation = window.prompt(
      `This will permanently delete ${bulkDeleteCount} ${scope} and their programs, states/cities, and course/specialization data.\n\nType DELETE to confirm.`,
    );
    if (confirmation !== "DELETE") {
      toast({ title: "Cancelled", description: "Bulk delete was not confirmed." });
      return;
    }
    onBulkDelete(filteredUniversities.map((university) => university.id));
  };

  const togglePanel = (id: string) => {
    setExpandedPanels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDll = (uni: any) => {
    setDllUni(uni);
    setDllValue(uni.daily_lead_limit != null ? String(uni.daily_lead_limit) : "");
  };

  const saveDll = async () => {
    if (!dllUni) return;
    const trimmed = dllValue.trim();
    const newLimit = trimmed === "" ? null : Number(trimmed);
    if (newLimit !== null && (!Number.isFinite(newLimit) || newLimit < 0)) {
      toast({ title: "Invalid", description: "Enter a positive number or leave empty for unlimited.", variant: "destructive" });
      return;
    }
    setSavingDll(true);
    const { error } = await supabase.from("universities").update({ daily_lead_limit: newLimit }).eq("id", dllUni.id);
    setSavingDll(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: `Daily lead limit ${newLimit == null ? "cleared (unlimited)" : `set to ${newLimit}`}.` });
    setDllUni(null);
    onRefresh();
  };

  const toggleStatus = async (uni: any) => {
    const next = (uni.status === "disabled") ? "live" : "disabled";
    setTogglingId(uni.id);
    const { error } = await supabase.from("universities").update({ status: next }).eq("id", uni.id);
    setTogglingId(null);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: next === "live" ? "Live" : "Disabled", description: `${uni.name} is now ${next}.` });
    onRefresh();
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/lead-push")}
        className="mb-4 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Lead Push
      </Button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Universities</h1>
          <p className="text-muted-foreground">
            Manage university API configurations ({apiUniversities.length} configured)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkImportExport universities={apiUniversities} onBulkImport={onBulkImport} />
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={!onBulkDelete || bulkDeleteCount === 0}
            className="gap-2"
            title={searchTerm.trim() ? "Delete universities matching current search" : "Delete all configured universities"}
          >
            <Trash2 className="h-4 w-4" />
            {bulkDeleteLabel} ({bulkDeleteCount})
          </Button>
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add University
          </Button>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search universities..."
          className="pl-10"
        />
      </div>

      {filteredUniversities.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No universities found</p>
          <Button onClick={onAdd} variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First University
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredUniversities.map((uni) => {
            const isLive = uni.status !== "disabled";
            const dll = uni.daily_lead_limit;
            return (
              <Card key={uni.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Globe className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{uni.name}</h3>
                          <p className="text-sm text-muted-foreground truncate">{uni.api_url}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          <Hash className="inline h-3 w-3 mr-1" />
                          {uni.college_id}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          <BookOpen className="inline h-3 w-3 mr-1" />
                          {uni.programs?.length || 0} programs
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          {uni.leads_per_minute || 90} leads/min
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted">
                          <Gauge className="inline h-3 w-3 mr-1" />
                          DLL: {dll == null ? "Unlimited" : dll.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Live / Disabled toggle */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={togglingId === uni.id}
                        onClick={() => toggleStatus(uni)}
                        className={cn(
                          "gap-1.5 min-w-[88px] font-semibold transition-colors",
                          isLive
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                            : "bg-destructive/10 border-destructive/40 text-destructive hover:bg-destructive/20",
                        )}
                        title="Click to toggle live / disabled"
                      >
                        {togglingId === uni.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <span className={cn("h-2 w-2 rounded-full", isLive ? "bg-emerald-500" : "bg-destructive")} />
                        )}
                        {isLive ? "Live" : "Off"}
                      </Button>

                      {/* DLL limit quick edit */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDll(uni)}
                        className="gap-1.5"
                        title="Set daily lead limit"
                      >
                        <Gauge className="h-4 w-4" />
                        Limit
                      </Button>

                      <UniversityExportButton university={uni} variant="icon" />
                      <Button variant="ghost" size="sm" onClick={() => onEdit(uni)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onDelete(uni.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => togglePanel(uni.id)}>
                        {expandedPanels.has(uni.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {expandedPanels.has(uni.id) && <UniversityApiPanel universityId={uni.id} universityName={uni.name} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* DLL popup */}
      <Dialog open={!!dllUni} onOpenChange={(o) => !o && setDllUni(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Daily Lead Limit
            </DialogTitle>
            <DialogDescription>
              Cap the number of leads pushed per day to <strong>{dllUni?.name}</strong>. Leave empty for unlimited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-medium">Limit (leads / day)</label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 1000 (empty = unlimited)"
              value={dllValue}
              onChange={(e) => setDllValue(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Counter resets at midnight. Current today: <strong>{dllUni?.daily_pushed_count || 0}</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDllUni(null)} disabled={savingDll}>Cancel</Button>
            <Button onClick={saveDll} disabled={savingDll}>
              {savingDll && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(UniversitiesView);
