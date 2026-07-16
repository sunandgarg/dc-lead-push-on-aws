import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { Search, Calendar, FileText, CheckCircle2, XCircle, Clock, RefreshCw, Filter, Building2, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { DataRetentionNotice } from "@/components/ui/DataRetentionNotice";

interface UploadBatch {
  id: string;
  university_id: string;
  file_name: string;
  total_leads: number;
  success_count: number;
  fail_count: number;
  duplicate_count: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface University {
  id: string;
  name: string;
}

interface UploadHistoryTabProps {
  universities: University[];
}

interface BatchLeadSummary {
  total: number;
  success: number;
  fail: number;
  duplicate: number;
  pending: number;
}

// Module-level cache
let batchCache: { data: UploadBatch[]; filters: string; timestamp: number } | null = null;
const CACHE_TTL = 30000;
// Cache for batch reports to avoid re-fetching
const reportCache = new Map<string, BatchLeadSummary>();

export function UploadHistoryTab({ universities }: UploadHistoryTabProps) {
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const [batchReport, setBatchReport] = useState<BatchLeadSummary | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const cacheKey = `${selectedUniversity}|${dateFrom}|${dateTo}|${statusFilter}`;

  const fetchBatches = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && batchCache && batchCache.filters === cacheKey && Date.now() - batchCache.timestamp < CACHE_TTL) {
        setBatches(batchCache.data);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        let query = supabase
          .from("upload_batches")
          .select("id, university_id, file_name, total_leads, success_count, fail_count, duplicate_count, status, created_at, completed_at")
          .order("created_at", { ascending: false });

        if (selectedUniversity) query = query.eq("university_id", selectedUniversity);
        if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00`);
        if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59`);
        if (statusFilter) query = query.eq("status", statusFilter);

        const { data, error } = await query.limit(100);
        if (error) throw error;

        const result = data || [];
        setBatches(result);
        batchCache = { data: result, filters: cacheKey, timestamp: Date.now() };
      } catch (error) {
        console.error("Error fetching batches:", error);
      } finally {
        setLoading(false);
      }
    },
    [cacheKey],
  );

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // Build report directly from batch-level aggregate counts (no leads table query needed)
  const fetchBatchReport = useCallback(async (batchId: string) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null);
      setBatchReport(null);
      return;
    }
    setExpandedBatch(batchId);

    const batch = batches.find(b => b.id === batchId);
    if (!batch) {
      setBatchReport(null);
      return;
    }

    const success = batch.success_count || 0;
    const fail = batch.fail_count || 0;
    const duplicate = batch.duplicate_count || 0;
    const total = batch.total_leads || 0;
    const pending = Math.max(total - success - fail - duplicate, 0);

    setBatchReport({ total, success, fail, duplicate, pending });
  }, [expandedBatch, batches]);

  // O(1) lookup map
  const uniNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of universities) map.set(u.id, u.name);
    return map;
  }, [universities]);

  const getUniversityName = (id: string) => uniNameMap.get(id) || "Unknown";

  const getStatusBadge = (batch: UploadBatch) => {
    const processed = batch.success_count + batch.fail_count + (batch.duplicate_count || 0);
    if (batch.status === "cancelled") {
      return <span className="badge-destructive flex items-center gap-1"><XCircle className="h-3 w-3" /> Cancelled</span>;
    }
    if (batch.status === "completed" || processed >= batch.total_leads) {
      if (batch.fail_count === 0 && (batch.duplicate_count || 0) === 0) {
        return <span className="badge-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Completed</span>;
      }
      return <span className="badge-warning flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Partial</span>;
    }
    if (batch.status === "processing") {
      return <span className="badge-info flex items-center gap-1"><Clock className="h-3 w-3" /> Processing</span>;
    }
    return <span className="badge-info flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</span>;
  };

  const filteredBatches = useMemo(() => {
    if (!searchTerm) return batches;
    const term = searchTerm.toLowerCase();
    return batches.filter((batch) => {
      const uniName = getUniversityName(batch.university_id).toLowerCase();
      const fileName = batch.file_name?.toLowerCase() || "";
      return uniName.includes(term) || fileName.includes(term);
    });
  }, [batches, searchTerm, uniNameMap]);

  const clearFilters = () => {
    setSelectedUniversity("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setStatusFilter("");
  };

  const totalUploads = filteredBatches.length;
  const totalLeads = filteredBatches.reduce((sum, b) => sum + b.total_leads, 0);
  const totalSuccess = filteredBatches.reduce((sum, b) => sum + b.success_count, 0);
  const totalDuplicate = filteredBatches.reduce((sum, b) => sum + (b.duplicate_count || 0), 0);
  const totalFailed = filteredBatches.reduce((sum, b) => sum + b.fail_count, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Upload History</h2>
          <p className="text-muted-foreground">View past uploads by university and date</p>
        </div>
        <button onClick={() => { reportCache.clear(); fetchBatches(true); }} className="flex items-center gap-2 text-primary hover:underline">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <DataRetentionNotice variant="banner" className="mb-6" />

      {/* Filters */}
      <div className="card-elevated p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">Filters</span>
          {(selectedUniversity || dateFrom || dateTo || searchTerm || statusFilter) && (
            <button onClick={clearFilters} className="text-sm text-destructive hover:underline ml-auto">Clear All</button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">University</label>
            <select value={selectedUniversity} onChange={(e) => setSelectedUniversity(e.target.value)} className="input-field">
              <option value="">All Universities</option>
              {universities.map((uni) => <option key={uni.id} value={uni.id}>{uni.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="">All Status</option>
            <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10" placeholder="File or university..." />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-5 mb-6">
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Total Uploads</p>
          <p className="font-display text-2xl font-bold text-primary">{totalUploads}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="font-display text-2xl font-bold text-foreground">{totalLeads.toLocaleString()}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Successful</p>
          <p className="font-display text-2xl font-bold text-success">{totalSuccess.toLocaleString()}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Duplicate</p>
          <p className="font-display text-2xl font-bold text-amber-500">{totalDuplicate.toLocaleString()}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="font-display text-2xl font-bold text-destructive">{totalFailed.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card-elevated p-12 text-center">
          <div className="animate-pulse text-primary">Loading history...</div>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No upload history found</p>
          {(selectedUniversity || dateFrom || dateTo) && (
            <button onClick={clearFilters} className="mt-4 text-sm text-primary hover:underline">Clear filters</button>
          )}
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">University</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">File Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Success</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Duplicate</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Failed</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBatches.map((batch) => (
                  <Fragment key={batch.id}>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{getUniversityName(batch.university_id)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{batch.file_name || "Untitled"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{format(new Date(batch.created_at), "dd MMM yyyy, HH:mm")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-foreground">{batch.total_leads}</td>
                      <td className="px-4 py-3 text-center font-mono text-success">{batch.success_count}</td>
                      <td className="px-4 py-3 text-center font-mono text-amber-500">{batch.duplicate_count || 0}</td>
                      <td className="px-4 py-3 text-center font-mono text-destructive">{batch.fail_count}</td>
                      <td className="px-4 py-3 text-center">{getStatusBadge(batch)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => fetchBatchReport(batch.id)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {expandedBatch === batch.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      </td>
                    </tr>
                    {expandedBatch === batch.id && (
                      <tr>
                        <td colSpan={9} className="px-4 py-3 bg-muted/20">
                          {reportLoading ? (
                            <p className="text-sm text-muted-foreground animate-pulse">Loading report...</p>
                          ) : batchReport ? (
                            <div className="grid grid-cols-5 gap-4">
                              <div className="text-center p-2 rounded bg-background border">
                                <p className="text-xs text-muted-foreground">Total</p>
                                <p className="font-bold text-foreground">{batchReport.total}</p>
                              </div>
                              <div className="text-center p-2 rounded bg-background border">
                                <p className="text-xs text-muted-foreground">Success</p>
                                <p className="font-bold text-success">{batchReport.success}</p>
                              </div>
                              <div className="text-center p-2 rounded bg-background border">
                                <p className="text-xs text-muted-foreground">Failed</p>
                                <p className="font-bold text-destructive">{batchReport.fail}</p>
                              </div>
                              <div className="text-center p-2 rounded bg-background border">
                                <p className="text-xs text-muted-foreground">Duplicate</p>
                                <p className="font-bold text-amber-500">{batchReport.duplicate}</p>
                              </div>
                              <div className="text-center p-2 rounded bg-background border">
                                <p className="text-xs text-muted-foreground">Pending</p>
                                <p className="font-bold text-muted-foreground">{batchReport.pending}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No data available</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
