import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Play, Pause, X, RefreshCw, Filter, List, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Batch {
  id: string;
  university_id: string;
  file_name: string;
  total_leads: number;
  success_count: number;
  fail_count: number;
  processed_count: number;
  status: string;
  is_paused: boolean;
  is_cancelled: boolean;
  created_at: string;
  universityName?: string;
}

interface University {
  id: string;
  name: string;
}

interface QueueManagerProps {
  universities: University[];
  onViewBatch?: (batchId: string) => void;
}

export function QueueManager({ universities, onViewBatch }: QueueManagerProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUniversityId, setFilterUniversityId] = useState<string>('all');
  const [showFilter, setShowFilter] = useState(false);
  const { toast } = useToast();

  const fetchBatches = useCallback(async () => {
    try {
      let query = supabase
        .from('upload_batches')
        .select('*')
        .in('status', ['processing', 'pending', 'paused'])
        .order('created_at', { ascending: false });

      if (filterUniversityId !== 'all') {
        query = query.eq('university_id', filterUniversityId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const enriched = (data || []).map(batch => ({
        ...batch,
        is_paused: batch.is_paused ?? false,
        is_cancelled: batch.is_cancelled ?? false,
        processed_count: batch.processed_count ?? (batch.success_count + batch.fail_count),
        universityName: universities.find(u => u.id === batch.university_id)?.name || 'Unknown',
      }));

      setBatches(enriched);
    } catch (error) {
      console.error('Error fetching batches:', error);
    } finally {
      setLoading(false);
    }
  }, [filterUniversityId, universities]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upload_batches',
        },
        () => {
          fetchBatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBatches]);

  const handlePauseResume = async (batch: Batch) => {
    try {
      const newPausedState = !batch.is_paused;
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
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update batch', variant: 'destructive' });
    }
  };

  const handleCancel = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to cancel this batch? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('upload_batches')
        .update({ 
          is_cancelled: true,
          status: 'cancelled'
        })
        .eq('id', batchId);

      if (error) throw error;
      toast({ title: 'Batch Cancelled', description: 'Processing has been cancelled' });
      fetchBatches();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to cancel batch', variant: 'destructive' });
    }
  };

  const getProgressPercent = (batch: Batch) => {
    if (batch.total_leads === 0) return 0;
    return Math.round(((batch.success_count + batch.fail_count) / batch.total_leads) * 100);
  };

  const getStatusBadge = (batch: Batch) => {
    if (batch.is_cancelled) return <span className="badge-error">Cancelled</span>;
    if (batch.is_paused) return <span className="badge-warning">Paused</span>;
    if (batch.status === 'completed') return <span className="badge-success">Completed</span>;
    return <span className="badge-info">Processing</span>;
  };

  if (loading) {
    return (
      <div className="card-elevated p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <List className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold text-foreground">Active Queue</h3>
          {batches.length > 0 && (
            <span className="badge-info">{batches.length} active</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button
            onClick={fetchBatches}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent text-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFilter && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <label className="block text-sm font-medium text-foreground mb-2">Filter by University</label>
          <select
            value={filterUniversityId}
            onChange={(e) => setFilterUniversityId(e.target.value)}
            className="input-field"
          >
            <option value="all">All Universities</option>
            {universities.map(uni => (
              <option key={uni.id} value={uni.id}>{uni.name}</option>
            ))}
          </select>
        </div>
      )}

      {batches.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No active batches in queue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map(batch => (
            <div key={batch.id} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{batch.file_name}</p>
                  <p className="text-sm text-muted-foreground">{batch.universityName}</p>
                </div>
                {getStatusBadge(batch)}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{batch.success_count + batch.fail_count} / {batch.total_leads}</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${getProgressPercent(batch)}%` }} 
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="badge-success">{batch.success_count} success</span>
                <span className="badge-error">{batch.fail_count} failed</span>
              </div>

              {!batch.is_cancelled && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => handlePauseResume(batch)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm"
                  >
                    {batch.is_paused ? (
                      <>
                        <Play className="h-4 w-4" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleCancel(batch.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  {onViewBatch && (
                    <button
                      onClick={() => onViewBatch(batch.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent text-sm ml-auto"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
