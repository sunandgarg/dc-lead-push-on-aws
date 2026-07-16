import { useState, useEffect, useCallback, forwardRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RotateCcw, Clock, Settings, Play, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface University {
  id: string;
  name: string;
  auto_retry_enabled?: boolean;
  auto_retry_delay_minutes?: number;
  auto_retry_max_attempts?: number;
}

interface FailedLead {
  id: string;
  name: string;
  email: string;
  mobile: string;
  batch_id: string;
  retry_count: number;
  api_response: string;
  created_at: string;
}

interface RetryManagerProps {
  universities: University[];
}

export const RetryManager = forwardRef<HTMLDivElement, RetryManagerProps>(
  function RetryManager({ universities }, ref) {
    const [failedLeads, setFailedLeads] = useState<FailedLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [retrying, setRetrying] = useState<Set<string>>(new Set());
    const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
    const [showSettings, setShowSettings] = useState(false);
    const [retrySettings, setRetrySettings] = useState({
      enabled: false,
      delayMinutes: 30,
      maxAttempts: 3,
    });
    const { toast } = useToast();

    const fetchFailedLeads = useCallback(async () => {
      try {
        let query = supabase
          .from('leads')
          .select('id, name, email, mobile, batch_id, retry_count, api_response, created_at, university_id')
          .in('status', ['Fail', 'failed'])
          .lt('retry_count', 3)
          .order('created_at', { ascending: false })
          .limit(100);

        if (selectedUniversity !== 'all') {
          query = query.eq('university_id', selectedUniversity);
        }

        const { data, error } = await query;
        if (error) throw error;
        setFailedLeads(data || []);
      } catch (error) {
        console.error('Error fetching failed leads:', error);
      } finally {
        setLoading(false);
      }
    }, [selectedUniversity]);

    useEffect(() => {
      fetchFailedLeads();
    }, [fetchFailedLeads]);

    useEffect(() => {
      if (selectedUniversity !== 'all') {
        const uni = universities.find(u => u.id === selectedUniversity);
        if (uni) {
          setRetrySettings({
            enabled: uni.auto_retry_enabled || false,
            delayMinutes: uni.auto_retry_delay_minutes || 30,
            maxAttempts: uni.auto_retry_max_attempts || 3,
          });
        }
      }
    }, [selectedUniversity, universities]);

    const handleRetryLead = async (leadId: string) => {
      setRetrying(prev => new Set(prev).add(leadId));
      
      try {
        const { error } = await supabase
          .from('leads')
          .update({ 
            status: 'pending',
            api_response: null,
          })
          .eq('id', leadId);

        if (error) throw error;
        
        toast({ title: 'Lead Queued', description: 'Lead has been queued for retry' });
        fetchFailedLeads();
      } catch (error) {
        console.error('Error retrying lead:', error);
        toast({ title: 'Error', description: 'Failed to queue lead for retry', variant: 'destructive' });
      } finally {
        setRetrying(prev => {
          const next = new Set(prev);
          next.delete(leadId);
          return next;
        });
      }
    };

    const handleRetryAll = async () => {
      if (failedLeads.length === 0) return;
      
      const confirmMessage = `Retry all ${failedLeads.length} failed leads?`;
      if (!window.confirm(confirmMessage)) return;

      setRetrying(new Set(failedLeads.map(l => l.id)));
      
      try {
        const leadIds = failedLeads.map(l => l.id);
        const { error } = await supabase
          .from('leads')
          .update({ 
            status: 'pending',
            api_response: null,
          })
          .in('id', leadIds);

        if (error) throw error;
        
        toast({ title: 'Leads Queued', description: `${failedLeads.length} leads queued for retry` });
        fetchFailedLeads();
      } catch (error) {
        console.error('Error retrying leads:', error);
        toast({ title: 'Error', description: 'Failed to queue leads for retry', variant: 'destructive' });
      } finally {
        setRetrying(new Set());
      }
    };

    const saveRetrySettings = async () => {
      if (selectedUniversity === 'all') {
        toast({ title: 'Error', description: 'Please select a university first', variant: 'destructive' });
        return;
      }

      try {
        const { error } = await supabase
          .from('universities')
          .update({
            auto_retry_enabled: retrySettings.enabled,
            auto_retry_delay_minutes: retrySettings.delayMinutes,
            auto_retry_max_attempts: retrySettings.maxAttempts,
          })
          .eq('id', selectedUniversity);

        if (error) throw error;
        toast({ title: 'Settings Saved', description: 'Auto-retry settings updated' });
        setShowSettings(false);
      } catch (error) {
        console.error('Error saving settings:', error);
        toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
      }
    };

    if (loading) {
      return (
        <div ref={ref} className="card-elevated p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      );
    }

    return (
      <div ref={ref} className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">Failed Leads Retry</h3>
            {failedLeads.length > 0 && (
              <span className="badge-error">{failedLeads.length} failed</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showSettings ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              <Settings className="h-4 w-4" />
            </button>
            {failedLeads.length > 0 && (
              <button
                onClick={handleRetryAll}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
              >
                <Play className="h-4 w-4" />
                Retry All
              </button>
            )}
          </div>
        </div>

        {/* University Filter */}
        <div className="mb-4">
          <select
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="input-field"
          >
            <option value="all">All Universities</option>
            {universities.map(uni => (
              <option key={uni.id} value={uni.id}>{uni.name}</option>
            ))}
          </select>
        </div>

        {/* Settings Panel */}
        {showSettings && selectedUniversity !== 'all' && (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <h4 className="font-medium text-foreground">Auto-Retry Settings</h4>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoRetryEnabled"
                checked={retrySettings.enabled}
                onChange={(e) => setRetrySettings({ ...retrySettings, enabled: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="autoRetryEnabled" className="text-sm text-foreground">
                Enable automatic retry for failed leads
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Delay (minutes)</label>
                <input
                  type="number"
                  value={retrySettings.delayMinutes}
                  onChange={(e) => setRetrySettings({ ...retrySettings, delayMinutes: parseInt(e.target.value) || 30 })}
                  min={5}
                  max={1440}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Max Attempts</label>
                <input
                  type="number"
                  value={retrySettings.maxAttempts}
                  onChange={(e) => setRetrySettings({ ...retrySettings, maxAttempts: parseInt(e.target.value) || 3 })}
                  min={1}
                  max={10}
                  className="input-field"
                />
              </div>
            </div>

            <button
              onClick={saveRetrySettings}
              className="btn-primary"
            >
              Save Settings
            </button>
          </div>
        )}

        {/* Failed Leads List */}
        {failedLeads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RotateCcw className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No failed leads to retry</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {failedLeads.map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{lead.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{lead.email} • {lead.mobile}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Attempts: {lead.retry_count}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRetryLead(lead.id)}
                  disabled={retrying.has(lead.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm ml-3"
                >
                  {retrying.has(lead.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Retry
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);
