import { useState, Fragment, useMemo } from 'react';
import { Download, RefreshCw, ChevronDown, ChevronRight, Search, Filter, Calendar, X } from 'lucide-react';

interface University {
  id: string;
  name: string;
}

interface Lead {
  name: string;
  email: string;
  mobile: string;
  state: string;
  city: string;
  course: string;
  specialization: string;
}

interface ApiLog {
  id: string;
  university_id: string;
  universityName?: string;
  user_id?: string;
  webhook_id?: string;
  batch_id?: string;
  email: string;
  mobile: string;
  created_at: string;
  status: string;
  response: string;
  lead_data: Lead | null;
  source?: string;
  medium?: string;
  campaign?: string;
}

interface Batch {
  id: string;
  file_name: string;
  created_at: string;
  total_leads: number;
  success_count: number;
  fail_count: number;
}

interface LogsTabProps {
  universities: University[];
  logs: ApiLog[];
  batches?: Batch[];
  onRefresh?: () => void;
}

export function LogsTab({ universities, logs, batches = [], onRefresh }: LogsTabProps) {
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [mediumFilter, setMediumFilter] = useState<string>('');
  const [campaignFilter, setCampaignFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'flat' | 'batches'>('batches');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique values for filters
  const uniqueSources = useMemo(() => [...new Set(logs.map(l => l.source).filter(Boolean))], [logs]);
  const uniqueMediums = useMemo(() => [...new Set(logs.map(l => l.medium).filter(Boolean))], [logs]);
  const uniqueCampaigns = useMemo(() => [...new Set(logs.map(l => l.campaign).filter(Boolean))], [logs]);

  // Filter batches by university
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      if (!selectedUniversity) return true;
      const batchLogs = logs.filter(l => l.batch_id === batch.id);
      return batchLogs.some(l => l.university_id === selectedUniversity);
    });
  }, [batches, logs, selectedUniversity]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesUniversity = !selectedUniversity || log.university_id === selectedUniversity;
      const matchesStatus = !statusFilter || log.status === statusFilter;
      const matchesSearch = !searchTerm || 
        log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.mobile?.includes(searchTerm);
      const matchesSource = !sourceFilter || log.source === sourceFilter;
      const matchesMedium = !mediumFilter || log.medium === mediumFilter;
      const matchesCampaign = !campaignFilter || log.campaign === campaignFilter;
      const matchesBatch = !selectedBatch || log.batch_id === selectedBatch;
      
      // Date filtering
      let matchesDate = true;
      if (dateFrom) {
        const logDate = new Date(log.created_at);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && logDate >= fromDate;
      }
      if (dateTo) {
        const logDate = new Date(log.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && logDate <= toDate;
      }
      
      return matchesUniversity && matchesStatus && matchesSearch && 
             matchesSource && matchesMedium && matchesCampaign && matchesDate && matchesBatch;
    });
  }, [logs, selectedUniversity, statusFilter, searchTerm, sourceFilter, mediumFilter, campaignFilter, dateFrom, dateTo, selectedBatch]);

  // Group logs by batch for batch view
  const logsByBatch = useMemo(() => {
    const grouped: Record<string, ApiLog[]> = {};
    filteredLogs.forEach(log => {
      const batchId = log.batch_id || 'no-batch';
      if (!grouped[batchId]) grouped[batchId] = [];
      grouped[batchId].push(log);
    });
    return grouped;
  }, [filteredLogs]);

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const toggleBatchExpand = (batchId: string) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchId)) {
      newExpanded.delete(batchId);
    } else {
      newExpanded.add(batchId);
    }
    setExpandedBatches(newExpanded);
  };

  const clearFilters = () => {
    setSelectedUniversity('');
    setStatusFilter('');
    setSearchTerm('');
    setSourceFilter('');
    setMediumFilter('');
    setCampaignFilter('');
    setDateFrom('');
    setDateTo('');
    setSelectedBatch('');
  };

  const activeFilterCount = [
    selectedUniversity, statusFilter, sourceFilter, mediumFilter, campaignFilter, dateFrom, dateTo, selectedBatch
  ].filter(Boolean).length;

  const exportToCSV = () => {
    const headers = ['Timestamp', 'University', 'Email', 'Mobile', 'Status', 'Source', 'Medium', 'Campaign', 'Response'];
    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toLocaleString(),
      log.universityName || '',
      log.email,
      log.mobile,
      log.status,
      log.source || '',
      log.medium || '',
      log.campaign || '',
      (log.response || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Success':
        return <span className="badge-success">{status}</span>;
      case 'Fail':
      case 'Failed':
        return <span className="badge-error">{status}</span>;
      case 'Duplicate':
        return <span className="badge-warning">{status}</span>;
      default:
        return <span className="badge-warning">{status}</span>;
    }
  };

  // Extract a short, human-readable detail from a response body
  // (e.g. upGrad leadIdentifier, or the duplicate reason from any vendor)
  const extractResponseDetail = (resp?: string): string | null => {
    if (!resp) return null;
    try {
      const j = JSON.parse(resp);
      if (j.leadIdentifier) return `leadIdentifier: ${j.leadIdentifier}`;
      if (j.lead_identifier) return `lead_identifier: ${j.lead_identifier}`;
      if (j.leadId) return `leadId: ${j.leadId}`;
      const msg = String(j.message || j.Message || j.error || j.error_message || '').trim();
      if (msg) return msg.slice(0, 140);
    } catch {
      // not JSON - show first line snippet
      const line = resp.split('\n')[0].trim();
      if (line) return line.slice(0, 140);
    }
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">API Logs</h2>
          <p className="text-muted-foreground">Monitor lead submission history and responses</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button 
            onClick={exportToCSV}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setViewMode('batches')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'batches' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Group by Batch
        </button>
        <button
          onClick={() => setViewMode('flat')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'flat' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          Flat View
        </button>
      </div>

      {/* Filters */}
      <div className="card-elevated p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Primary Filters Row */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by email or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={selectedUniversity}
              onChange={(e) => setSelectedUniversity(e.target.value)}
              className="input-field sm:w-64"
            >
              <option value="">All Universities</option>
              {universities.map(uni => (
                <option key={uni.id} value={uni.id}>{uni.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field sm:w-40"
            >
              <option value="">All Status</option>
              <option value="Success">Success</option>
              <option value="Fail">Failed</option>
              <option value="Duplicate">Duplicate</option>
              <option value="Pending">Pending</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground hover:bg-muted'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-border">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Source</label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Sources</option>
                    {uniqueSources.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Medium</label>
                  <select
                    value={mediumFilter}
                    onChange={(e) => setMediumFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Mediums</option>
                    {uniqueMediums.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Campaign</label>
                  <select
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Campaigns</option>
                    {uniqueCampaigns.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Batch</label>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All Batches</option>
                    {filteredBatches.map(b => (
                      <option key={b.id} value={b.id}>{b.file_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    From Date
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    To Date
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 flex items-center gap-2 text-sm text-destructive hover:underline"
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {(() => {
        const successCount = filteredLogs.filter(l => l.status === 'Success').length;
        const failCount = filteredLogs.filter(l => l.status === 'Fail').length;
        const successRate = filteredLogs.length > 0 ? Math.round((successCount / filteredLogs.length) * 100) : 0;
        return (
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="font-display text-2xl font-bold text-foreground">{filteredLogs.length}</p>
            </div>
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">Success</p>
              <p className="font-display text-2xl font-bold text-success">{successCount}</p>
            </div>
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="font-display text-2xl font-bold text-destructive">{failCount}</p>
            </div>
            <div className="card-elevated p-4">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="font-display text-2xl font-bold text-primary">{successRate}%</p>
            </div>
          </div>
        );
      })()}

      {/* Logs Display */}
      {viewMode === 'batches' ? (
        // Batch View
        <div className="space-y-4">
          {Object.entries(logsByBatch).length > 0 ? (
            Object.entries(logsByBatch).map(([batchId, batchLogs]) => {
              const batch = batches.find(b => b.id === batchId);
              const successCount = batchLogs.filter(l => l.status === 'Success').length;
              const failCount = batchLogs.filter(l => l.status === 'Fail').length;
              const isExpanded = expandedBatches.has(batchId);

              return (
                <div key={batchId} className="card-elevated overflow-hidden">
                  {/* Batch Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleBatchExpand(batchId)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <h3 className="font-medium text-foreground">
                          {batch?.file_name || 'Single Lead / Unknown Batch'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {batch ? new Date(batch.created_at).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{batchLogs.length} leads</span>
                      <span className="badge-success">{successCount} success</span>
                      {failCount > 0 && <span className="badge-error">{failCount} failed</span>}
                    </div>
                  </div>

                  {/* Batch Logs */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      <table className="w-full text-sm">
                        <thead className="table-header">
                          <tr>
                            <th className="px-4 py-3 text-left w-8"></th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Mobile</th>
                            <th className="px-4 py-3 text-left">Source</th>
                            <th className="px-4 py-3 text-left">Timestamp</th>
                            <th className="px-4 py-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {batchLogs.map((log) => (
                            <Fragment key={log.id}>
                              <tr 
                                className="bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => toggleExpand(log.id)}
                              >
                                <td className="px-4 py-3">
                                  {expandedLogs.has(log.id) ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </td>
                                <td className="px-4 py-3 text-foreground">{log.email}</td>
                                <td className="px-4 py-3 font-mono text-muted-foreground">{log.mobile}</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">{log.source || '-'}</td>
                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3">
                                  {getStatusBadge(log.status)}
                                  {extractResponseDetail(log.response) && (
                                    <div className="text-[11px] text-muted-foreground mt-1 font-mono truncate max-w-[260px]" title={extractResponseDetail(log.response) || ''}>
                                      {extractResponseDetail(log.response)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                              {expandedLogs.has(log.id) && (
                                <tr className="bg-muted/30">
                                  <td colSpan={6} className="px-6 py-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                      <div>
                                        <h4 className="text-sm font-medium text-foreground mb-2">Lead Data</h4>
                                        {log.lead_data && (
                                          <dl className="space-y-1 text-xs">
                                            <div className="flex gap-2">
                                              <dt className="text-muted-foreground">Name:</dt>
                                              <dd className="text-foreground">{log.lead_data.name}</dd>
                                            </div>
                                            <div className="flex gap-2">
                                              <dt className="text-muted-foreground">Course:</dt>
                                              <dd className="text-foreground">{log.lead_data.course}</dd>
                                            </div>
                                            <div className="flex gap-2">
                                              <dt className="text-muted-foreground">Location:</dt>
                                              <dd className="text-foreground">{log.lead_data.city}, {log.lead_data.state}</dd>
                                            </div>
                                          </dl>
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-foreground mb-2">API Response</h4>
                                        <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto font-mono text-muted-foreground max-h-32 overflow-y-auto">
                                          {log.response}
                                        </pre>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="card-elevated p-12 text-center">
              <p className="text-muted-foreground">
                {logs.length === 0 
                  ? 'No logs yet. Upload some leads to see API responses here.'
                  : 'No logs match your filters.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Flat View
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-3 text-left w-8"></th>
                  <th className="px-4 py-3 text-left">User ID</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Mobile</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <Fragment key={log.id}>
                      <tr 
                        className="bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(log.id)}
                      >
                        <td className="px-4 py-3">
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.user_id}</td>
                        <td className="px-4 py-3 text-foreground">{log.email}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">{log.mobile}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{log.source || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(log.status)}
                          {extractResponseDetail(log.response) && (
                            <div className="text-[11px] text-muted-foreground mt-1 font-mono truncate max-w-[260px]" title={extractResponseDetail(log.response) || ''}>
                              {extractResponseDetail(log.response)}
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedLogs.has(log.id) && (
                        <tr className="bg-muted/30">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <h4 className="text-sm font-medium text-foreground mb-2">Lead Data</h4>
                                {log.lead_data && (
                                  <dl className="space-y-1 text-xs">
                                    <div className="flex gap-2">
                                      <dt className="text-muted-foreground">Name:</dt>
                                      <dd className="text-foreground">{log.lead_data.name}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="text-muted-foreground">Course:</dt>
                                      <dd className="text-foreground">{log.lead_data.course}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                      <dt className="text-muted-foreground">Location:</dt>
                                      <dd className="text-foreground">{log.lead_data.city}, {log.lead_data.state}</dd>
                                    </div>
                                  </dl>
                                )}
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-foreground mb-2">API Response</h4>
                                <pre className="text-xs bg-background p-3 rounded-lg overflow-x-auto font-mono text-muted-foreground max-h-32 overflow-y-auto">
                                  {log.response}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      {logs.length === 0 
                        ? 'No logs yet. Upload some leads to see API responses here.'
                        : 'No logs match your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
