// Background Processor - Handles processing even when tab is hidden

import type { UploadEntity, UploadLeadEntity, BackgroundTask } from './types';
import { supabase } from '@/integrations/supabase/client';

type ProcessorCallback = (event: ProcessorEvent) => void;

interface ProcessorEvent {
  type: 'progress' | 'lead-complete' | 'upload-complete' | 'error' | 'paused' | 'resumed';
  uploadSlug: string;
  data?: any;
}

class BackgroundProcessor {
  private activeTasks: Map<string, BackgroundTask> = new Map();
  private processingQueue: Map<string, NodeJS.Timeout | number> = new Map();
  private callbacks: Set<ProcessorCallback> = new Set();
  private isPageVisible: boolean = true;
  // Instant local control signal (per upload slug). UI/DataStore calls set this
  // synchronously so workers can short-circuit before the next DB poll.
  private localSignal: Map<string, 'pause' | 'cancel'> = new Map();
  // AbortController per upload — cancel aborts all in-flight process-lead calls.
  private abortControllers: Map<string, AbortController> = new Map();


  constructor() {
    // Track visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // Use Service Worker for true background processing if available
    this.initializeServiceWorker();
  }

  private handleVisibilityChange = () => {
    this.isPageVisible = !document.hidden;
    
    // Continue processing even when hidden
  };

  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Service worker for background sync will be added later
      } catch (error) {
        console.warn('Service Worker registration failed:', error);
      }
    }
  }

  subscribe(callback: ProcessorCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private emit(event: ProcessorEvent) {
    this.callbacks.forEach(cb => cb(event));
  }

  // Start processing an upload
  async startUpload(upload: UploadEntity, leads: UploadLeadEntity[]): Promise<void> {
    const task: BackgroundTask = {
      id: upload.slug,
      type: 'upload',
      entitySlug: upload.slug,
      status: 'running',
      progress: 0,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    this.activeTasks.set(upload.slug, task);
    await this.processLeads(upload, leads);
  }

  private async processLeads(upload: UploadEntity, leads: UploadLeadEntity[]): Promise<void> {
    // Concurrency pool: up to MAX_CONCURRENCY leads in flight at once.
    // leadsPerMinute enforces a minimum spacing between task starts so we
    // don't hammer the university API beyond its allowed rate.
    const MAX_CONCURRENCY = 1;
    const rate = upload.leadsPerMinute || 150;
    const concurrency = Math.min(MAX_CONCURRENCY, Math.max(1, rate));
    const minSpacingMs = Math.max(0, Math.floor(60000 / rate));

    let nextIndex = upload.currentLeadIndex || 0;
    let completedCount = nextIndex;
    let stopped = false;
    let lastStartAt = 0;

    // AbortController used to cancel all in-flight process-lead invocations
    // the instant the user hits Stop. Previous controller (if any) is aborted.
    this.abortControllers.get(upload.slug)?.abort();
    const abortController = new AbortController();
    this.abortControllers.set(upload.slug, abortController);
    const abortSignal = abortController.signal;

    // Cache control state and refresh at most a few times per second across
    // all workers (was: one SELECT per lead × 100 workers, which serialized the pool).
    let controlState: 'run' | 'pause' | 'cancel' = 'run';
    let controlCheckedAt = 0;
    let controlInflight: Promise<void> | null = null;
    const CONTROL_POLL_MS = 300;
    // Clear any stale local signal for a fresh run.
    this.localSignal.delete(upload.slug);
    const refreshControl = () => {
      if (controlInflight) return controlInflight;
      controlInflight = (async () => {
        try {
          // Instant local signal beats a DB poll.
          const sig = this.localSignal.get(upload.slug);
          if (sig === 'cancel') { controlState = 'cancel'; return; }
          if (sig === 'pause') { controlState = 'pause'; return; }
          const task = this.activeTasks.get(upload.slug);
          if (!task || task.status !== 'running') { controlState = 'pause'; return; }
          const { data } = await supabase
            .from('upload_batches')
            .select('is_paused, is_cancelled')
            .eq('id', upload.id)
            .maybeSingle();
          if (data?.is_cancelled) controlState = 'cancel';
          else if (data?.is_paused) controlState = 'pause';
          else controlState = 'run';
          controlCheckedAt = Date.now();
        } finally {
          controlInflight = null;
        }
      })();
      return controlInflight;
    };
    const getControl = async (): Promise<'run' | 'pause' | 'cancel'> => {
      // Instant local signal — no wait.
      const sig = this.localSignal.get(upload.slug);
      if (sig === 'cancel') return 'cancel';
      if (sig === 'pause') return 'pause';
      if (Date.now() - controlCheckedAt > CONTROL_POLL_MS) await refreshControl();
      return controlState;
    };


    // Batched progress writer — flush at most every 750ms instead of per lead.
    let lastFlushed = completedCount;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flushProgress = async () => {
      flushTimer = null;
      if (completedCount === lastFlushed) return;
      const snapshot = completedCount;
      lastFlushed = snapshot;
      try {
        await supabase
          .from('upload_batches')
          .update({ current_lead_index: snapshot, processed_count: snapshot })
          .eq('id', upload.id);
      } catch (e) { /* non-fatal */ }
    };
    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(flushProgress, 750);
    };

    const processOne = async (lead: UploadLeadEntity, index: number) => {
      try {
        // Race the lead processing against the abort signal so Stop returns
        // control to the worker immediately even if the HTTP call is stuck.
        const abortPromise = new Promise<{ aborted: true }>((resolve) => {
          if (abortSignal.aborted) return resolve({ aborted: true });
          abortSignal.addEventListener('abort', () => resolve({ aborted: true }), { once: true });
        });
        const raced = await Promise.race([
          this.processLead(upload, lead, abortSignal).then((r) => ({ aborted: false as const, result: r })),
          abortPromise,
        ]);

        if ((raced as any).aborted) {
          // Cancelled — do not persist a status for this lead; it stays pending.
          return;
        }
        const result = (raced as { aborted: false; result: { success: boolean; response: string } }).result;

        // Fire lead-row update + counter RPC in parallel; don't serialize.
        await Promise.all([
          supabase
            .from('leads')
            .update({
              status: result.success ? 'success' : 'failed',
              api_response: result.response,
              processed_at: new Date().toISOString(),
            })
            .eq('id', lead.id),
          supabase.rpc(
            result.success ? 'increment_batch_success' : 'increment_batch_fail',
            { batch_uuid: upload.id },
          ),
        ]);

        completedCount++;
        scheduleFlush();

        this.emit({
          type: 'lead-complete',
          uploadSlug: upload.slug,
          data: { index, success: result.success },
        });

        const task = this.activeTasks.get(upload.slug);
        const progress = Math.round((completedCount / leads.length) * 100);
        if (task) task.progress = progress;
        this.emit({ type: 'progress', uploadSlug: upload.slug, data: { progress } });
      } catch (error) {
        console.error('Error processing lead:', error);
        this.emit({
          type: 'error',
          uploadSlug: upload.slug,
          data: { index, error: String(error) },
        });
      }
    };

    const worker = async () => {
      while (!stopped) {
        // Rate-limit spacing between task starts (shared across workers)
        if (minSpacingMs > 0) {
          const now = Date.now();
          const slot = Math.max(now, lastStartAt + minSpacingMs);
          const wait = slot - now;
          lastStartAt = slot;
          if (wait > 0) await new Promise(r => setTimeout(r, wait));
        }

        if (stopped) return;
        const control = await getControl();
        if (control === 'cancel') { stopped = true; this.cancelUpload(upload.slug); return; }
        if (control === 'pause') { stopped = true; this.pauseUpload(upload.slug); return; }

        const i = nextIndex++;
        if (i >= leads.length) return;
        await processOne(leads[i], i);
      }
    };

    const workers = Array.from({ length: concurrency }, () => worker());
    this.processingQueue.set(upload.slug, 0 as unknown as number);

    await Promise.all(workers);
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    await flushProgress();

    if (!stopped && completedCount >= leads.length) {
      await this.completeUpload(upload);
    }
  }

  private async processLead(
    upload: UploadEntity, 
    lead: UploadLeadEntity,
    _signal?: AbortSignal,
  ): Promise<{ success: boolean; response: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('process-lead', {
        body: {
          leadId: lead.id,
          universityId: upload.universityId,
        },
      });

      if (error) {
        return { success: false, response: error.message };
      }

      return {
        success: data?.success ?? false,
        response: JSON.stringify(data?.response || data),
      };
    } catch (error) {
      return { success: false, response: String(error) };
    }
  }

  async pauseUpload(uploadSlug: string): Promise<void> {
    // Instant signal for in-process workers.
    this.localSignal.set(uploadSlug, 'pause');
    // Abort every in-flight process-lead call so all ~100 workers unblock
    // immediately. Aborted leads stay 'pending' in DB (no status persisted),
    // so resume will pick them up from currentLeadIndex.
    const abortController = this.abortControllers.get(uploadSlug);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(uploadSlug);
    }
    const task = this.activeTasks.get(uploadSlug);
    if (task) {
      task.status = 'pending';
    }

    // Clear scheduled processing
    const timeoutId = this.processingQueue.get(uploadSlug);
    if (timeoutId) {
      clearTimeout(timeoutId as unknown as NodeJS.Timeout);
      this.processingQueue.delete(uploadSlug);
    }

    this.emit({ type: 'paused', uploadSlug });
  }

  async resumeUpload(upload: UploadEntity, leads: UploadLeadEntity[]): Promise<void> {
    // Clear any stale pause/cancel signal before restarting workers.
    this.localSignal.delete(upload.slug);
    const task = this.activeTasks.get(upload.slug);
    if (task) {
      task.status = 'running';
    }

    this.emit({ type: 'resumed', uploadSlug: upload.slug });
    await this.processLeads(upload, leads);
  }

  async cancelUpload(uploadSlug: string): Promise<void> {
    // Instant signal so workers exit before the next DB poll.
    this.localSignal.set(uploadSlug, 'cancel');
    // Abort every in-flight process-lead call for this upload so the ~100
    // workers currently awaiting HTTP responses unblock immediately.
    const abortController = this.abortControllers.get(uploadSlug);
    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(uploadSlug);
    }
    const task = this.activeTasks.get(uploadSlug);
    if (task) {
      task.status = 'failed';
      task.error = 'Cancelled by user';
    }

    // Clear scheduled processing
    const timeoutId = this.processingQueue.get(uploadSlug);
    if (timeoutId) {
      clearTimeout(timeoutId as unknown as NodeJS.Timeout);
      this.processingQueue.delete(uploadSlug);
    }

    this.activeTasks.delete(uploadSlug);
  }


  private async completeUpload(upload: UploadEntity): Promise<void> {
    const task = this.activeTasks.get(upload.slug);
    if (task) {
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.progress = 100;
    }

    await supabase
      .from('upload_batches')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', upload.id);

    this.emit({ type: 'upload-complete', uploadSlug: upload.slug });
    this.activeTasks.delete(upload.slug);
    this.processingQueue.delete(upload.slug);
  }

  getActiveTask(uploadSlug: string): BackgroundTask | undefined {
    return this.activeTasks.get(uploadSlug);
  }

  getAllActiveTasks(): BackgroundTask[] {
    return Array.from(this.activeTasks.values());
  }

  isProcessing(uploadSlug: string): boolean {
    return this.activeTasks.has(uploadSlug);
  }

  cleanup() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    
    // Clear all timeouts
    this.processingQueue.forEach(timeoutId => {
      clearTimeout(timeoutId as unknown as NodeJS.Timeout);
    });
    this.processingQueue.clear();
    this.activeTasks.clear();
  }
}

export const backgroundProcessor = new BackgroundProcessor();
