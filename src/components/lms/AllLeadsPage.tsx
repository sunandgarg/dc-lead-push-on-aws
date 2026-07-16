import { useState, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, Search, Eye, RefreshCw, ChevronDown, ChevronUp, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DataRetentionNotice } from "@/components/ui/DataRetentionNotice";

export interface LmsLead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  course: string;
  specialization: string;
  source: string;
  campaign: string;
  university: string;
  universityId: string;
  status: string;
  failReason: string;
  receivedAt: string;
  apiResponse: string;
  retryCount: number;
  batchId: string;
  triggerSource: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function downloadCSV(data: LmsLead[], filename: string) {
  const headers = [
    "Lead ID",
    "Name",
    "Email",
    "Mobile",
    "City",
    "Course",
    "Source",
    "Campaign",
    "University",
    "Status",
    "Fail Reason",
    "Received At",
  ];
  const rows = data.map((l) => [
    l.id.slice(0, 8),
    l.name,
    l.email,
    l.mobile,
    l.city,
    l.course,
    l.source,
    l.campaign,
    l.university,
    l.status,
    l.failReason,
    l.receivedAt,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mapStatus(s: string | null): string {
  if (!s) return "Pending";
  if (s === "Success") return "Pushed";
  if (s === "Fail" || s === "failed") return "Failed";
  if (s === "Duplicate" || s === "duplicate") return "Duplicate";
  if (s === "pending") return "Pending";
  return s;
}

// Cache for leads data
let leadsCache: { data: LmsLead[]; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

export function AllLeadsPage() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<LmsLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [universityFilter, setUniversityFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailLead, setDetailLead] = useState<LmsLead | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortCol, setSortCol] = useState<string>("receivedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchLeads = useCallback(
    async (forceRefresh = false) => {
      // Use cache if available and not expired
      if (!forceRefresh && leadsCache && Date.now() - leadsCache.timestamp < CACHE_TTL) {
        setLeads(leadsCache.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Only fetch leads that came from campaigns/external sources - NOT from CSV upload batches
        // We identify upload-pushed leads by checking if their batch came from a file upload
        // Instead, we filter by looking at batches where file_name starts with 'API_' (external)
        // or leads that have no batch_id, or leads from marketing campaigns

        // Fetch leads that are NOT from CSV upload batches
        // CSV upload batches have file_name like actual filenames (*.csv)
        // External API leads have file_name like 'API_*'
        const { data: uploadBatchIds } = await supabase
          .from("upload_batches")
          .select("id")
          .not("file_name", "like", "API_%");

        const excludeBatchIds = (uploadBatchIds || []).map((b) => b.id);

        let query = supabase
          .from("leads")
          .select("*, universities(name)")
          .order("created_at", { ascending: false })
          .limit(500);

        // Exclude leads from CSV upload batches
        if (excludeBatchIds.length > 0) {
          // Use not.in to exclude CSV upload batch leads
          query = query.not("batch_id", "in", `(${excludeBatchIds.join(",")})`);
        }

        const { data: leadsData, error } = await query;

        if (error) throw error;

        const mapped: LmsLead[] = (leadsData || []).map((l: any) => ({
          id: l.id,
          name: l.name || "",
          email: l.email || "",
          mobile: l.mobile || "",
          city: l.city || "",
          course: l.course || "",
          specialization: l.specialization || "",
          source: l.lead_source || "Manual",
          campaign: l.lead_campaign || "",
          university: l.universities?.name || "Unknown",
          universityId: l.university_id,
          status: mapStatus(l.status),
          failReason: l.status === "Fail" || l.status === "failed" ? l.api_response || "Unknown error" : "",
          receivedAt: l.created_at,
          apiResponse: l.api_response || "",
          retryCount: l.retry_count || 0,
          batchId: l.batch_id,
          triggerSource: l.lead_source || "Unknown",
        }));

        setLeads(mapped);
        leadsCache = { data: mapped, timestamp: Date.now() };
      } catch (err: any) {
        console.error("Error fetching leads:", err);
        toast({ title: "Error", description: "Failed to load leads", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filtered = useMemo(() => {
    let result = leads.filter((l) => {
      const q = search.toLowerCase();
      if (q && !l.name.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q) && !l.mobile.includes(q))
        return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (campaignFilter && !l.campaign.toLowerCase().includes(campaignFilter.toLowerCase())) return false;
      if (universityFilter !== "all" && l.university !== universityFilter) return false;
      if (cityFilter !== "all" && l.city !== cityFilter) return false;
      return true;
    });
    result.sort((a: any, b: any) => {
      const av = a[sortCol] || "";
      const bv = b[sortCol] || "";
      return sortDir === "asc" ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
    });
    return result;
  }, [leads, search, statusFilter, sourceFilter, campaignFilter, universityFilter, cityFilter, sortCol, sortDir]);

  const stats = useMemo(() => {
    let pushed = 0,
      failed = 0,
      pending = 0,
      duplicate = 0;
    for (const l of leads) {
      if (l.status === "Pushed") pushed++;
      else if (l.status === "Failed") failed++;
      else if (l.status === "Pending") pending++;
      else if (l.status === "Duplicate") duplicate++;
    }
    const total = leads.length;
    return { total, pushed, failed, pending, duplicate, rate: total ? ((pushed / total) * 100).toFixed(1) : "0" };
  }, [leads]);

  const sources = useMemo(() => [...new Set(leads.map((l) => l.source).filter(Boolean))], [leads]);
  const universities = useMemo(() => [...new Set(leads.map((l) => l.university).filter(Boolean))], [leads]);
  const cities = useMemo(() => [...new Set(leads.map((l) => l.city).filter(Boolean))], [leads]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((l) => l.id)));
  };

  const handleRetryLead = useCallback(
    async (lead: LmsLead) => {
      toast({ title: "Retrying...", description: `Retrying ${lead.name}` });
      const { error } = await supabase.from("leads").update({ status: "pending" }).eq("id", lead.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Queued", description: `${lead.name} queued for retry` });
        fetchLeads(true);
      }
    },
    [toast, fetchLeads],
  );

  const handleBulkRetry = useCallback(async () => {
    const failedIds = Array.from(selectedIds).filter((id) => leads.find((l) => l.id === id)?.status === "Failed");
    if (failedIds.length === 0) {
      toast({ title: "No failed leads", description: "Select failed leads to retry", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("leads").update({ status: "pending" }).in("id", failedIds);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Queued", description: `${failedIds.length} leads queued for retry` });
      setSelectedIds(new Set());
      fetchLeads(true);
    }
  }, [selectedIds, leads, toast, fetchLeads]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      Pushed: "badge-success",
      Failed: "badge-error",
      Pending: "badge-warning",
      New: "badge-info",
      Duplicate: "badge-warning",
    };
    return <span className={map[s] || "badge-info"}>{s}</span>;
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortCol === col ? (
      sortDir === "asc" ? (
        <ChevronUp className="h-3 w-3 inline ml-1" />
      ) : (
        <ChevronDown className="h-3 w-3 inline ml-1" />
      )
    ) : null;

  const kpiClick = (status: string) => setStatusFilter(status === statusFilter ? "all" : status);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      <DataRetentionNotice variant="banner" className="mb-2" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">All Leads</h1>
          <p className="text-xs text-muted-foreground">
            Shows leads from campaigns, external APIs, Facebook, Google - excludes CSV upload leads
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchLeads(true)} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Total", value: stats.total, filter: "all", color: "bg-primary/10 text-primary" },
          { label: "Pushed", value: stats.pushed, filter: "Pushed", color: "bg-success/10 text-success" },
          { label: "Duplicate", value: stats.duplicate, filter: "Duplicate", color: "bg-amber-500/10 text-amber-600" },
          { label: "Failed", value: stats.failed, filter: "Failed", color: "bg-destructive/10 text-destructive" },
          { label: "Pending", value: stats.pending, filter: "Pending", color: "bg-warning/10 text-warning" },
          { label: "Push Rate", value: `${stats.rate}%`, filter: "", color: "bg-primary/10 text-primary" },
        ].map((k) => (
          <button
            key={k.label}
            onClick={() => k.filter && kpiClick(k.filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${k.color} hover:opacity-80`}
          >
            {k.label}: <span className="font-bold font-display">{k.value}</span>
          </button>
        ))}
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-1" /> Filters{" "}
          {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(filtered, "all-leads.csv")}>
          <Download className="h-4 w-4 mr-1" /> All CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadCSV(
              leads.filter((l) => l.status === "Failed"),
              "failed-leads.csv",
            )
          }
        >
          <Download className="h-4 w-4 mr-1" /> Failed CSV
        </Button>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <Card className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3 animate-fade-in">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pushed">Pushed</SelectItem>
              <SelectItem value="Duplicate">Duplicate</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={universityFilter} onValueChange={setUniversityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="University" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Universities</SelectItem>
              {universities.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Campaign name..."
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
          />
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex gap-2 items-center p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fade-in">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" onClick={handleBulkRetry}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry Failed
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCSV(
                leads.filter((l) => selectedIds.has(l.id)),
                "selected-leads.csv",
              )
            }
          >
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading leads...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                    Name <SortIcon col="name" />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("source")}>
                    Source <SortIcon col="source" />
                  </TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>University</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>
                    Status <SortIcon col="status" />
                  </TableHead>
                  <TableHead>Fail Reason</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("receivedAt")}>
                    Received <SortIcon col="receivedAt" />
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                      No leads found. Leads from campaigns, external APIs, Facebook & Google will appear here.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow key={lead.id} className="group hover:bg-muted/30">
                      <TableCell>
                        <Checkbox checked={selectedIds.has(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} />
                      </TableCell>
                      <TableCell className="font-medium">{lead.name}</TableCell>
                      <TableCell className="text-sm">{lead.email}</TableCell>
                      <TableCell className="font-mono text-sm">{lead.mobile}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{lead.campaign || "-"}</TableCell>
                      <TableCell className="text-sm">{lead.city || "-"}</TableCell>
                      <TableCell className="text-sm font-medium">{lead.university}</TableCell>
                      <TableCell>{statusBadge(lead.status)}</TableCell>
                      <TableCell className="text-xs text-destructive max-w-[150px] truncate">
                        {lead.failReason ? lead.failReason.slice(0, 50) : "-"}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(lead.receivedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setDetailLead(lead)}
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {lead.status === "Failed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRetryLead(lead)}
                              title="Retry"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* Lead Detail Drawer */}
      <Sheet open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailLead && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display">{detailLead.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Email", detailLead.email],
                    ["Mobile", detailLead.mobile],
                    ["City", detailLead.city || "-"],
                    ["Course", detailLead.course || "-"],
                    ["Specialization", detailLead.specialization || "-"],
                    ["Source", detailLead.source],
                    ["Campaign", detailLead.campaign || "-"],
                    ["University", detailLead.university],
                    ["Status", detailLead.status],
                    ["Retry Count", String(detailLead.retryCount)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span className="text-muted-foreground text-xs">{k}</span>
                      <p className="font-medium">{v}</p>
                    </div>
                  ))}
                </div>
                {detailLead.failReason && (
                  <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
                    <strong>API Response:</strong>
                    <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">{detailLead.apiResponse}</pre>
                  </div>
                )}

                {detailLead.status === "Failed" && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      handleRetryLead(detailLead);
                      setDetailLead(null);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Retry This Lead
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
