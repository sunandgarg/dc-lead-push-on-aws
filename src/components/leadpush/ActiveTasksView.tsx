import { memo, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Pause, Play, XCircle, Activity, User, Clock, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface BatchTask {
  id: string;
  university_id: string;
  file_name: string;
  total_leads: number;
  success_count: number;
  fail_count: number;
  status: string;
  is_paused: boolean;
  is_cancelled: boolean;
  created_at: string;
  completed_at: string | null;
  user_id: string;
  user_email?: string;
  university_name?: string;
  leads_per_minute?: number;
}

// Caches to avoid repeated lookups
const uniCache = new Map<string, string>();
const userCache = new Map<string, string>();

function ActiveTasksViewInner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('upload_batches')
        .select('*')
        .in('status', ['processing', 'pending', 'paused', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Batch fetch university names (use cache)
      const uniIds = [...new Set((data || []).map(b => b.university_id).filter(Boolean))];
      const uncachedUniIds = uniIds.filter(id => !uniCache.has(id));
      if (uncachedUniIds.length > 0) {
        const { data: unis } = await supabase.from('universities').select('id, name').in('id', uncachedUniIds);
        (unis || []).forEach(u => uniCache.set(u.id, u.name));
      }

      // Batch fetch user emails (use cache)
      const userIds = [...new Set((data || []).map(b => b.user_id).filter(Boolean))];
      const uncachedUserIds = userIds.filter(id => !userCache.has(id));
      if (uncachedUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', uncachedUserIds);
        (profiles || []).forEach(p => userCache.set(p.id, p.email || 'Unknown'));
      }

      setTasks((data || []).map(b => ({
        ...b,
        is_paused: b.is_paused || false,
        is_cancelled: b.is_cancelled || false,
        university_name: uniCache.get(b.university_id) || 'Unknown',
        user_email: userCache.get(b.user_id) || undefined,
      })));
      setHasLoaded(true);
    } catch (e) {
      console.error('Failed to fetch tasks:', e);
      toast({ title: 'Error', description: 'Failed to load tasks', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handlePause = useCallback(async (batchId: string) => {
    await supabase.from('upload_batches').update({ is_paused: true, status: 'paused' }).eq('id', batchId);
    toast({ title: 'Paused', description: 'Batch paused successfully' });
    fetchTasks();
  }, [toast, fetchTasks]);

  const handleResume = useCallback(async (batchId: string) => {
    await supabase.from('upload_batches').update({ is_paused: false, status: 'processing' }).eq('id', batchId);
    supabase.functions.invoke('process-queue', { body: { batchId } }).catch(() => {});
    toast({ title: 'Resumed', description: 'Batch resumed' });
    fetchTasks();
  }, [toast, fetchTasks]);

  const handleStop = useCallback(async (batchId: string) => {
    await supabase.from('upload_batches').update({ status: 'cancelled', is_cancelled: true, completed_at: new Date().toISOString() }).eq('id', batchId);
    toast({ title: 'Stopped', description: 'Batch cancelled' });
    fetchTasks();
  }, [toast, fetchTasks]);

  const { activeTasks, scheduledTasks } = useMemo(() => ({
    activeTasks: tasks.filter(t => ['processing', 'pending', 'paused'].includes(t.status)),
    scheduledTasks: tasks.filter(t => t.status === 'scheduled'),
  }), [tasks]);

  const getProgress = (t: BatchTask) => t.total_leads === 0 ? 0 : Math.round(((t.success_count + t.fail_count + ((t as any).duplicate_count || 0)) / t.total_leads) * 100);

  const renderTask = (task: BatchTask) => {
    const progress = getProgress(task);
    const isActive = ['processing', 'pending'].includes(task.status) && !task.is_paused;
    const dupCount = (task as any).duplicate_count || 0;
    const processed = task.success_count + task.fail_count + dupCount;
    const remaining = Math.max(task.total_leads - processed, 0);

    return (
      <div key={task.id} className={cn("p-4 border rounded-lg", isActive && "border-blue-200 dark:border-blue-900 bg-blue-500/5")}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium truncate">{task.file_name}</span>
              {task.is_paused ? (
                <Badge variant="outline" className="text-xs">Paused</Badge>
              ) : task.status === 'scheduled' ? (
                <Badge className="text-xs bg-purple-500/15 text-purple-600 border-purple-200">
                  Scheduled {(task as any).scheduled_at ? `· ${new Date((task as any).scheduled_at).toLocaleString()}` : ''}
                </Badge>
              ) : task.status === 'processing' ? (
                <Badge className="text-xs bg-blue-500/15 text-blue-600 border-blue-200">Processing</Badge>
              ) : task.status === 'completed' ? (
                <Badge className="text-xs bg-green-500/15 text-green-600 border-green-200">Done</Badge>
              ) : task.status === 'cancelled' ? (
                <Badge variant="destructive" className="text-xs">Cancelled</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Pending</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{task.university_name}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
              {task.user_email && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{task.user_email}</span>
                </>
              )}
            </div>
          </div>
          
          {(task.status === 'processing' || task.status === 'pending' || task.status === 'scheduled' || task.is_paused) && (
            <div className="flex items-center gap-1">
              {task.is_paused ? (
                <Button variant="ghost" size="sm" onClick={() => handleResume(task.id)} title="Resume">
                  <Play className="h-4 w-4 text-green-600" />
                </Button>
              ) : task.status !== 'scheduled' ? (
                <Button variant="ghost" size="sm" onClick={() => handlePause(task.id)} title="Pause">
                  <Pause className="h-4 w-4 text-amber-600" />
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={() => handleStop(task.id)} title="Stop">
                <XCircle className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>

          <div className="flex items-center gap-3 text-xs mb-2">
            <span className="text-green-600">{task.success_count} ok</span>
            {dupCount > 0 && <span className="text-amber-600">{dupCount} dup</span>}
            {task.fail_count > 0 && <span className="text-destructive">{task.fail_count} fail</span>}
            <span className="text-muted-foreground">{remaining} remaining</span>
            <span className="ml-auto text-muted-foreground">{processed}/{task.total_leads}</span>
          </div>

        <Progress value={progress} className="h-1.5" />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/lead-push')} className="mb-4 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Lead Push
      </Button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Active Tasks
          </h1>
          <p className="text-muted-foreground">View all running tasks across all users. Manual refresh only.</p>
        </div>
        <Button variant="outline" onClick={fetchTasks} disabled={loading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {!hasLoaded ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Click Refresh to load all active tasks</p>
            <Button onClick={fetchTasks} disabled={loading} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Load Tasks
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Active ({activeTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No active tasks</p>
              ) : activeTasks.map(renderTask)}
            </CardContent>
          </Card>

          {scheduledTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-purple-500" />
                  Scheduled ({scheduledTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {scheduledTasks.map(renderTask)}
              </CardContent>
            </Card>
          )}

        </div>
      )}
    </div>
  );
}

export const ActiveTasksView = memo(ActiveTasksViewInner);
export default ActiveTasksView;
