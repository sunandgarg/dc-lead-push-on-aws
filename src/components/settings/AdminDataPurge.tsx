import { memo, useState, useCallback } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const PURGE_TARGETS = [
  { key: 'api_logs', label: 'API Logs', description: 'Request/response logs from lead pushes' },
  { key: 'leads', label: 'Leads', description: 'Lead records stored in database' },
  { key: 'upload_batches', label: 'Batch Records', description: 'Upload batch history records' },
  { key: 'automation_logs', label: 'Automation Logs', description: 'Automation rule execution logs' },
  { key: 'email_logs', label: 'Email Logs', description: 'SMTP email sending logs' },
  { key: 'email_events', label: 'Email Events', description: 'Email open/click tracking events' },
] as const;

// HARD-PROTECTED tables - cumulative analytics, never purged from any UI/function.
const PROTECTED_STATS_TABLES = ['lead_push_daily_stats', 'lead_push_cumulative_stats'] as const;

const TIME_OPTIONS = [
  { label: 'All (0 days)', days: 0 },
  { label: 'Older than 1 day', days: 1 },
  { label: 'Older than 2 days', days: 2 },
  { label: 'Older than 7 days', days: 7 },
  { label: 'Older than 30 days', days: 30 },
];

function AdminDataPurgeInner() {
  const { toast } = useToast();
  const [purging, setPurging] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ key: string; days: number } | null>(null);

  const handlePurge = useCallback(async (tableKey: string, days: number) => {
    if ((PROTECTED_STATS_TABLES as readonly string[]).includes(tableKey)) {
      toast({ title: 'Protected', description: 'Daily/cumulative stats are never purged.', variant: 'destructive' });
      return;
    }
    setPurging(tableKey);
    try {
      let query = supabase.from(tableKey as any).delete();
      
      if (days > 0) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.lt('created_at', cutoff);
      } else {
        // Delete all - need a filter, use created_at > epoch
        query = query.gte('created_at', '1970-01-01T00:00:00Z');
      }

      const { error } = await query;
      if (error) throw error;

      toast({
        title: 'Purged',
        description: `${tableKey.replace(/_/g, ' ')} ${days > 0 ? `older than ${days} day(s)` : '(all)'} deleted successfully`,
      });
    } catch (err: any) {
      console.error('Purge error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to purge data', variant: 'destructive' });
    } finally {
      setPurging(null);
      setConfirmTarget(null);
    }
  }, [toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trash2 className="h-5 w-5 text-destructive" />
          Data Purge
        </CardTitle>
        <CardDescription>
          Purge old data to free up storage. Select a table and time range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">✓ Preserved (never purged, kept cumulatively)</p>
          <div className="flex flex-wrap gap-2">
            {PROTECTED_STATS_TABLES.map(t => (
              <Badge key={t} variant="outline" className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                {t.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
        {PURGE_TARGETS.map(target => (
          <div key={target.key} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-foreground">{target.label}</p>
                <p className="text-xs text-muted-foreground">{target.description}</p>
              </div>
              {purging === target.key && (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Purging...
                </Badge>
              )}
            </div>
            
            {confirmTarget?.key === target.key ? (
              <div className="mt-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Confirm: Delete {target.label} {confirmTarget.days > 0 ? `older than ${confirmTarget.days} day(s)` : '(ALL)'}?
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handlePurge(target.key, confirmTarget.days)}
                    disabled={!!purging}
                  >
                    Yes, Delete
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmTarget(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mt-2">
                {TIME_OPTIONS.map(opt => (
                  <Button
                    key={opt.days}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={!!purging}
                    onClick={() => setConfirmTarget({ key: target.key, days: opt.days })}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export const AdminDataPurge = memo(AdminDataPurgeInner);
export default AdminDataPurge;
