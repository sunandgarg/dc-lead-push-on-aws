import { useState, useEffect, memo, useMemo, useCallback, useRef } from "react";
import { Activity, CheckCircle2, XCircle, Loader2, RefreshCw, User, Pause, Play, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { DataRetentionNotice } from "@/components/ui/DataRetentionNotice";

interface BatchInfo {
  id: string;
  university_id: string;
  file_name: string;
  total_leads: number;
  success_count: number;
  fail_count: number;
  duplicate_count: number;
  status: string;
  is_paused: boolean;
  is_cancelled: boolean;
  created_at: string;
  user_id: string;
  user_email?: string;
  university_name?: string;
}

const stringifyBatchValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringifyBatchValue).filter(Boolean).join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferredKey = ["name", "contact_name", "value", "label", "displayName", "fieldName"].find((key) => key in record);
    if (preferredKey) return stringifyBatchValue(record[preferredKey]);
    return Object.values(record).map(stringifyBatchValue).filter(Boolean).join(", ");
  }
  return String(value).trim();
};

type TabKey = "active" | "failed" | "success";

function QueueMonitorInner() {
  const { isAdmin, loading: adminAuthLoading } = useAdminAuth();
  const { user } = useAuth();
  const { toast } = useToast();
  const [batches, setBatches] = useState<BatchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchBatches = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        if (!isAdmin && !user?.id) {
          setBatches([]);
          return;
        }

        let query = supabase
          .from("upload_batches")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!isAdmin && user?.id) {
          query = query.eq("user_id", user.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        const uniIds = [...new Set((data || []).map((b) => b.university_id).filter(Boolean))];
        let uniMap = new Map<string, string>();
        if (uniIds.length > 0) {
          const { data: universities } = await supabase.from("universities").select("id, name").in("id", uniIds);
          uniMap = new Map((universities || []).map((u) => [u.id, u.name]));
        }

        let userMap = new Map<string, string>();
        if (isAdmin) {
          const userIds = [...new Set((data || []).map((b) => b.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
            userMap = new Map((profiles || []).map((p) => [p.id, p.email || "Unknown"]));
          }
        }

        setBatches(
          (data || []).map((b) => ({
            ...b,
            status: b.status || "pending",
            is_paused: b.is_paused || false,
            is_cancelled: b.is_cancelled || false,
            university_name: uniMap.get(b.university_id) || "Unknown",
            user_email: userMap.get(b.user_id) || undefined,
          })),
        );
      } catch (e) {
        console.error("Failed to fetch batches:", e);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isAdmin, user?.id],
  );

  useEffect(() => {
    if (adminAuthLoading) return;
    fetchBatches();
  }, [adminAuthLoading, fetchBatches]);

  // Queue data is intentionally manual-refresh only. Automatic polling here
  // caused network/state updates while a CSV push was running and made users
  // think the whole upload page had reloaded. The refresh button below updates
  // this card only.

  const { activeBatches, failedBatches, successBatches } = useMemo(() => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return {
      activeBatches: batches.filter(
        (b) =>
          (b.status === "processing" || b.status === "pending" || b.status === "paused" || b.is_paused) &&
          b.created_at > twentyFourHoursAgo &&
          !b.is_cancelled,
      ),
      failedBatches: batches.filter((b) => (b.status === "completed" && (b.fail_count + (b.duplicate_count || 0) > 0)) || b.status === "cancelled"),
      successBatches: batches.filter((b) => b.status === "completed" && (b.fail_count + (b.duplicate_count || 0) === 0) && b.success_count > 0),
    };
  }, [batches]);

  const tabs: { key: TabKey; label: string; count: number; icon: typeof Activity }[] = [
    { key: "active", label: "Active", count: activeBatches.length, icon: Loader2 },
    { key: "failed", label: "Failed", count: failedBatches.length, icon: XCircle },
    { key: "success", label: "Success", count: successBatches.length, icon: CheckCircle2 },
  ];

  const currentList = activeTab === "active" ? activeBatches : activeTab === "failed" ? failedBatches : successBatches;

  const getProgress = (b: BatchInfo) =>
    b.total_leads === 0 ? 0 : Math.round(((b.success_count + b.fail_count + ((b as any).duplicate_count || 0)) / b.total_leads) * 100);

  const updateBatch = useCallback(
    async (batchId: string, updates: Record<string, unknown>, successTitle: string) => {
      setProcessingId(batchId);
      try {
        const { error } = await supabase.from("upload_batches").update(updates).eq("id", batchId);
        if (error) throw error;
        toast({ title: successTitle });
        fetchBatches(true);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to update task",
          variant: "destructive",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [fetchBatches, toast],
  );

  const handlePause = useCallback(
    (batchId: string) => {
      updateBatch(batchId, { is_paused: true, status: "paused" }, "Task paused");
    },
    [updateBatch],
  );

  const handleResume = useCallback(
    (batchId: string) => {
      updateBatch(batchId, { is_paused: false, status: "processing" }, "Task resumed");
    },
    [updateBatch],
  );

  const handleStop = useCallback(
    (batchId: string) => {
      updateBatch(
        batchId,
        { status: "cancelled", is_cancelled: true, is_paused: false, completed_at: new Date().toISOString() },
        "Task stopped",
      );
    },
    [updateBatch],
  );

  const handleDelete = useCallback(
    async (batch: BatchInfo) => {
      if (!window.confirm(`Delete task "${stringifyBatchValue(batch.file_name) || "Untitled"}"? This removes it from the queue monitor.`)) {
        return;
      }

      setProcessingId(batch.id);
      try {
        if (!batch.is_cancelled && batch.status !== "completed" && batch.status !== "cancelled") {
          await supabase
            .from("upload_batches")
            .update({ status: "cancelled", is_cancelled: true, is_paused: false, completed_at: new Date().toISOString() })
            .eq("id", batch.id);
        }

        const { error } = await supabase.from("upload_batches").delete().eq("id", batch.id);
        if (error) throw error;
        toast({ title: "Task deleted" });
        fetchBatches(true);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error?.message || "Failed to delete task",
          variant: "destructive",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [fetchBatches, toast],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Queue Monitor
            {isAdmin && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Admin
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchBatches()}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Tab buttons */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-md">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 rounded transition-colors",
                activeTab === t.key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon
                className={cn(
                  "h-3 w-3",
                  t.key === "active" && activeTab === t.key && activeBatches.length > 0 && "animate-spin",
                )}
              />
              {t.label}
              {t.count > 0 && (
                <span
                  className={cn(
                    "text-[10px] min-w-[16px] h-4 px-1 rounded-full inline-flex items-center justify-center",
                    t.key === "active" && "bg-blue-500/15 text-blue-600",
                    t.key === "failed" && "bg-destructive/15 text-destructive",
                    t.key === "success" && "bg-green-500/15 text-green-600",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Batch list */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <p className="text-center py-6 text-xs text-muted-foreground">
            {activeTab === "active"
              ? "No active queues"
              : activeTab === "failed"
                ? "No failures"
                : "No completed batches"}
          </p>
        ) : (
          <div className="space-y-2">
            {currentList.map((batch) => {
              const progress = getProgress(batch);
              const isActive = batch.status === "processing" || batch.status === "pending";
              const canControl = activeTab === "active" || batch.status === "processing" || batch.status === "pending" || batch.status === "paused";
              const isWorking = processingId === batch.id;
              return (
                <div
                  key={batch.id}
                  className={cn("p-3 border rounded-lg", isActive && "border-blue-200 dark:border-blue-900")}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium truncate">{stringifyBatchValue(batch.file_name)}</span>
                    {batch.is_paused ? (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        Paused
                      </Badge>
                    ) : batch.status === "processing" ? (
                      <Badge className="text-[10px] px-1.5 bg-blue-500/15 text-blue-600 border-blue-200">
                        Processing
                      </Badge>
                    ) : batch.status === "completed" && batch.fail_count + (batch.duplicate_count || 0) > 0 && batch.success_count > 0 ? (
                      <Badge className="text-[10px] px-1.5 bg-amber-500/15 text-amber-600 border-amber-200">
                        Partial
                      </Badge>
                    ) : batch.status === "completed" && batch.fail_count + (batch.duplicate_count || 0) === 0 ? (
                      <Badge className="text-[10px] px-1.5 bg-green-500/15 text-green-600 border-green-200">Done</Badge>
                    ) : batch.status === "completed" ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5">
                        Failed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5">
                        Pending
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span>
                      {stringifyBatchValue(batch.university_name)} · {formatDistanceToNow(new Date(batch.created_at), { addSuffix: true })}
                    </span>
                    <span>
                      {batch.success_count + batch.fail_count + (batch.duplicate_count || 0)}/{batch.total_leads}
                    </span>
                  </div>

                  <Progress value={progress} className="h-1.5" />

                  <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                    <span className="text-green-600">{batch.success_count} ok</span>
                    {batch.duplicate_count > 0 && <span className="text-amber-600">{batch.duplicate_count} dup</span>}
                    {batch.fail_count > 0 && <span className="text-destructive">{batch.fail_count} fail</span>}
                    {isActive && (
                      <span className="text-muted-foreground">
                        {Math.max(batch.total_leads - batch.success_count - batch.fail_count - (batch.duplicate_count || 0), 0)} left
                      </span>
                    )}
                    {isAdmin && batch.user_email && (
                      <span className="ml-auto flex items-center gap-0.5 text-muted-foreground">
                        <User className="h-3 w-3" />
                        {stringifyBatchValue(batch.user_email)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    {canControl && (
                      batch.is_paused ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isWorking}
                          onClick={() => handleResume(batch.id)}
                        >
                          {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Resume
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isWorking}
                          onClick={() => handlePause(batch.id)}
                        >
                          {isWorking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                          Pause
                        </Button>
                      )
                    )}
                    {canControl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        disabled={isWorking}
                        onClick={() => handleStop(batch.id)}
                      >
                        <XCircle className="h-3 w-3" />
                        Stop
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      disabled={isWorking}
                      onClick={() => handleDelete(batch)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DataRetentionNotice className="mt-2" />
      </CardContent>
    </Card>
  );
}

export const QueueMonitor = memo(QueueMonitorInner);
export default QueueMonitor;
