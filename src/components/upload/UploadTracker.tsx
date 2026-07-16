// Upload Tracker - Complete view of all uploads with details and error logs

import { useState, useEffect, useMemo } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pause, 
  Play, 
  RotateCcw,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateSlug } from '@/lib/datastore/slug-utils';
import { format } from 'date-fns';

interface UploadBatch {
  id: string;
  slug: string;
  universityId: string;
  universityName: string;
  universitySlug: string;
  fileName: string;
  totalLeads: number;
  successCount: number;
  failCount: number;
  processedCount: number;
  status: string;
  isPaused: boolean;
  isCancelled: boolean;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface UploadLead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  status: string;
  apiResponse?: string;
  retryCount: number;
  processedAt?: string;
}

interface University {
  id: string;
  name: string;
  slug: string;
}

const normalizeLeadStatus = (status?: string | null) => {
  const value = (status || '').toLowerCase();
  if (value === 'success') return 'success';
  if (value === 'duplicate') return 'duplicate';
  if (value === 'fail' || value === 'failed') return 'failed';
  if (value === 'cancelled') return 'cancelled';
  return 'pending';
};

interface UploadTrackerProps {
  universities: University[];
  onViewBatch?: (batchId: string) => void;
}

export function UploadTracker({ universities, onViewBatch }: UploadTrackerProps) {
  const { toast } = useToast();
  
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [universityFilter, setUniversityFilter] = useState<string>('all');
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [batchLeads, setBatchLeads] = useState<Map<string, UploadLead[]>>(new Map());
  const [loadingLeads, setLoadingLeads] = useState<Set<string>>(new Set());

  // Create university map for quick lookup
  const universityMap = useMemo(() => {
    const map = new Map<string, University>();
    universities.forEach(u => {
      map.set(u.id, { ...u, slug: u.slug || generateSlug(u.name) });
    });
    return map;
  }, [universities]);

  // Fetch batches
  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('upload_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const enrichedBatches: UploadBatch[] = (data || []).map(batch => {
        const uni = universityMap.get(batch.university_id);
        return {
          id: batch.id,
          slug: `${uni?.slug || 'unknown'}/upload-${batch.id.slice(0, 8)}`,
          universityId: batch.university_id,
          universityName: uni?.name || 'Unknown',
          universitySlug: uni?.slug || 'unknown',
          fileName: batch.file_name,
          totalLeads: batch.total_leads,
          successCount: batch.success_count,
          failCount: batch.fail_count,
          processedCount: batch.processed_count || (batch.success_count + batch.fail_count + ((batch as any).duplicate_count || 0)),
          status: batch.status || 'pending',
          isPaused: batch.is_paused || false,
          isCancelled: batch.is_cancelled || false,
          createdAt: batch.created_at,
          completedAt: batch.completed_at || undefined,
          errorMessage: batch.error_message || undefined,
        };
      });

      setBatches(enrichedBatches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({ title: 'Error', description: 'Failed to fetch upload history', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch leads for a batch
  const fetchBatchLeads = async (batchId: string) => {
    if (batchLeads.has(batchId)) return;

    setLoadingLeads(prev => new Set(prev).add(batchId));
    
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, name, email, mobile, status, api_response, retry_count, processed_at')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const leads: UploadLead[] = (data || []).map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        mobile: lead.mobile,
        status: normalizeLeadStatus(lead.status),
        apiResponse: lead.api_response || undefined,
        retryCount: lead.retry_count || 0,
        processedAt: lead.processed_at || undefined,
      }));

      setBatchLeads(prev => new Map(prev).set(batchId, leads));
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(prev => {
        const next = new Set(prev);
        next.delete(batchId);
        return next;
      });
    }
  };

  // Toggle batch expansion
  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
        fetchBatchLeads(batchId);
      }
      return next;
    });
  };

  // Pause/Resume batch
  const handlePauseResume = async (batch: UploadBatch) => {
    try {
      const newPausedState = !batch.isPaused;
      const { error } = await supabase
        .from('upload_batches')
        .update({ 
          is_paused: newPausedState,
          status: newPausedState ? 'paused' : 'processing'
        })
        .eq('id', batch.id);

      if (error) throw error;
      
      toast({ 
        title: newPausedState ? 'Batch Paused' : 'Batch Resumed',
        description: `Processing has been ${newPausedState ? 'paused' : 'resumed'}`,
      });
      
      fetchBatches();
    } catch {
      toast({ title: 'Error', description: 'Failed to update batch', variant: 'destructive' });
    }
  };

  // Retry failed leads
  const handleRetryFailed = async (batchId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'pending', retry_count: 0 })
        .eq('batch_id', batchId)
        .in('status', ['Fail', 'fail', 'failed']);

      if (error) throw error;

      toast({ title: 'Success', description: 'Failed leads queued for retry' });
      
      // Refresh batch leads
      setBatchLeads(prev => {
        const next = new Map(prev);
        next.delete(batchId);
        return next;
      });
      fetchBatchLeads(batchId);
      fetchBatches();
    } catch {
      toast({ title: 'Error', description: 'Failed to retry leads', variant: 'destructive' });
    }
  };

  // Export failed leads
  const exportFailedLeads = (batchId: string) => {
    const leads = batchLeads.get(batchId);
    if (!leads) return;

    const failedLeads = leads.filter(l => normalizeLeadStatus(l.status) === 'failed');
    if (failedLeads.length === 0) {
      toast({ title: 'No failed leads', description: 'No failed leads to export' });
      return;
    }

    const csvContent = [
      'Name,Email,Mobile,Status,Error',
      ...failedLeads.map(l => 
        `"${l.name}","${l.email}","${l.mobile}","${l.status}","${l.apiResponse || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_leads_${batchId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      if (statusFilter !== 'all' && batch.status !== statusFilter) return false;
      if (universityFilter !== 'all' && batch.universityId !== universityFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          batch.fileName.toLowerCase().includes(search) ||
          batch.universityName.toLowerCase().includes(search) ||
          batch.slug.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [batches, statusFilter, universityFilter, searchTerm]);

  // Fetch batches on mount only - no real-time subscription to prevent constant refetches
  // Real-time updates were causing API calls every second during processing
  useEffect(() => {
    if (universities.length > 0) {
      fetchBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universities.length]); // Only refetch when universities array changes

  const getStatusBadge = (batch: UploadBatch) => {
    if (batch.isCancelled) {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive"><XCircle className="h-3 w-3" /> Cancelled</span>;
    }
    if (batch.isPaused) {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600"><Pause className="h-3 w-3" /> Paused</span>;
    }
    
    switch (batch.status) {
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600"><CheckCircle2 className="h-3 w-3" /> Completed</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600"><Clock className="h-3 w-3 animate-spin" /> Processing</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive"><AlertTriangle className="h-3 w-3" /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"><Clock className="h-3 w-3" /> Pending</span>;
    }
  };

  const getProgressPercent = (batch: UploadBatch) => {
    if (batch.totalLeads === 0) return 0;
    return Math.round((batch.processedCount / batch.totalLeads) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by filename, university, or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={universityFilter}
            onChange={(e) => setUniversityFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Universities</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Uploads</p>
          <p className="text-2xl font-bold text-foreground">{batches.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Processing</p>
          <p className="text-2xl font-bold text-blue-600">{batches.filter(b => b.status === 'processing').length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-green-600">{batches.filter(b => b.status === 'completed').length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold text-foreground">{batches.reduce((sum, b) => sum + b.totalLeads, 0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">
            {batches.reduce((sum, b) => sum + b.processedCount, 0) > 0 
              ? Math.round((batches.reduce((sum, b) => sum + b.successCount, 0) / batches.reduce((sum, b) => sum + b.processedCount, 0)) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Batches List */}
      {filteredBatches.length === 0 ? (
        <div className="text-center py-12">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No uploads found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBatches.map(batch => (
            <div key={batch.id} className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Batch Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleBatch(batch.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground truncate">{batch.fileName}</p>
                      {getStatusBadge(batch)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{batch.universityName}</span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{batch.slug}</span>
                      <span>{format(new Date(batch.createdAt), 'MMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {expandedBatches.has(batch.id) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progress: {batch.processedCount} / {batch.totalLeads}</span>
                    <span>{getProgressPercent(batch)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${getProgressPercent(batch)}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-green-600">{batch.successCount} primary</span>
                    {(batch as any).duplicateCount > 0 && <span className="text-amber-600">{(batch as any).duplicateCount} duplicate</span>}
                    <span className="text-destructive">{batch.failCount} failed</span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedBatches.has(batch.id) && (
                <div className="border-t border-border p-4 bg-muted/30">
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {!batch.isCancelled && batch.status !== 'completed' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePauseResume(batch); }}
                        className="btn-secondary text-sm"
                      >
                        {batch.isPaused ? <><Play className="h-4 w-4 mr-1" /> Resume</> : <><Pause className="h-4 w-4 mr-1" /> Pause</>}
                      </button>
                    )}
                    
                    {batch.failCount > 0 && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRetryFailed(batch.id); }}
                          className="btn-secondary text-sm"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" /> Retry Failed
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); exportFailedLeads(batch.id); }}
                          className="btn-secondary text-sm"
                        >
                          <Download className="h-4 w-4 mr-1" /> Export Failed
                        </button>
                      </>
                    )}
                    
                    {onViewBatch && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onViewBatch(batch.id); }}
                        className="btn-secondary text-sm"
                      >
                        <Eye className="h-4 w-4 mr-1" /> View Details
                      </button>
                    )}
                  </div>

                  {/* Leads Table */}
                  {loadingLeads.has(batch.id) ? (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : batchLeads.has(batch.id) ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left p-2 font-medium text-muted-foreground">Name</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Email</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Mobile</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Status</th>
                            <th className="text-left p-2 font-medium text-muted-foreground">Response</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchLeads.get(batch.id)!.slice(0, 50).map(lead => (
                            <tr key={lead.id} className="border-b border-border/50">
                              <td className="p-2">{lead.name}</td>
                              <td className="p-2 text-muted-foreground">{lead.email}</td>
                              <td className="p-2 text-muted-foreground">{lead.mobile}</td>
                              <td className="p-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                  normalizeLeadStatus(lead.status) === 'success' ? 'bg-green-500/10 text-green-600' :
                                  normalizeLeadStatus(lead.status) === 'duplicate' ? 'bg-amber-500/10 text-amber-600' :
                                  normalizeLeadStatus(lead.status) === 'failed' ? 'bg-destructive/10 text-destructive' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {normalizeLeadStatus(lead.status) === 'success' ? 'Primary' :
                                   normalizeLeadStatus(lead.status) === 'duplicate' ? 'Duplicate' :
                                   normalizeLeadStatus(lead.status)}
                                </span>
                              </td>
                              <td className="p-2 max-w-xs truncate text-xs text-muted-foreground">
                                {lead.apiResponse || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {batchLeads.get(batch.id)!.length > 50 && (
                        <p className="text-center text-sm text-muted-foreground py-2">
                          Showing 50 of {batchLeads.get(batch.id)!.length} leads
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
