import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Send, FileText, Star, Layers, Info, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PresetManager } from './PresetManager';
import { MultiPushReport } from './MultiPushReport';

interface MultiPushViewProps {
  universities: any[];
}

interface CsvLead {
  name: string;
  email: string;
  mobile: string;
  state?: string;
  city?: string;
  [key: string]: string | undefined;
}

export interface PushResult {
  rowIndex: number;
  lead: CsvLead;
  universityId: string;
  universityName: string;
  status: 'pending' | 'success' | 'duplicate' | 'fail';
  response?: string;
}

const REQUIRED_HEADERS = ['name', 'email', 'mobile'];
const OPTIONAL_HEADERS = ['state', 'city', 'address'];

function parseCsv(text: string): CsvLead[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rawHeaders = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  // Normalize common aliases so multi-push only ever sees: name / email / mobile (+ optional)
  const aliasMap: Record<string, string> = {
    firstname: 'name', first_name: 'name', fullname: 'name', full_name: 'name', student_name: 'name', candidate_name: 'name',
    email_id: 'email', email_address: 'email', mail: 'email',
    phone: 'mobile', phone_number: 'mobile', mobile_number: 'mobile', contact: 'mobile', 'phone.number': 'mobile',
    state_name: 'state', city_name: 'city',
  };
  const headers = rawHeaders.map((h) => aliasMap[h] || h);

  const out: CsvLead[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const row: any = {};
    headers.forEach((h, idx) => {
      if (!row[h]) row[h] = cells[idx] || '';
    });
    // Preserve original raw header values too (e.g. lastname, phone.code) so process-lead can read them
    rawHeaders.forEach((h, idx) => {
      if (!(h in row)) row[h] = cells[idx] || '';
    });
    if (row.name || row.email || row.mobile) out.push(row);
  }
  return out;
}

export function MultiPushView({ universities }: MultiPushViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [leads, setLeads] = useState<CsvLead[]>([]);
  const [fileName, setFileName] = useState('');
  const [selectedUniIds, setSelectedUniIds] = useState<string[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [defaultsMap, setDefaultsMap] = useState<Record<string, Record<string, string>>>({});
  const [isPushing, setIsPushing] = useState(false);
  const [results, setResults] = useState<PushResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [inputMode, setInputMode] = useState<'csv' | 'quick'>('csv');
  const [quickLead, setQuickLead] = useState({ name: '', email: '', mobile: '' });
  const [throughput, setThroughput] = useState<{ done: number; elapsedMs: number }>({ done: 0, elapsedMs: 0 });
  // Optional UI batching: only repaint results after every N completions (5/10/25/50).
  // 0 = live (default - unchanged behaviour). Higher = fewer React re-renders on huge pushes.
  const [uiBatchEnabled, setUiBatchEnabled] = useState<boolean>(() => localStorage.getItem('multipush_ui_batch_on') === '1');
  const [uiBatchSize, setUiBatchSize] = useState<number>(() => {
    const n = Number(localStorage.getItem('multipush_ui_batch_size'));
    return [5, 10, 25, 50].includes(n) ? n : 25;
  });


  // Fetch presets + defaults (from universities.default_values) on mount
  useEffect(() => {
    (async () => {
      const [presetRes, uniRes] = await Promise.all([
        supabase.from('multi_push_presets').select('*').order('is_default', { ascending: false }),
        supabase.from('universities').select('id, default_values'),
      ]);
      setPresets(presetRes.data || []);
      const map: Record<string, Record<string, string>> = {};
      (uniRes.data || []).forEach((u: any) => {
        if (u.default_values && typeof u.default_values === 'object') {
          map[u.id] = u.default_values;
        }
      });
      setDefaultsMap(map);

      // Auto-select default preset
      const def = (presetRes.data || []).find((p: any) => p.is_default);
      if (def && def.university_ids?.length) setSelectedUniIds(def.university_ids);
    })();
  }, []);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String(ev.target?.result || '');
        const parsed = parseCsv(text);
        if (!parsed.length) {
          toast({ title: 'Empty CSV', description: 'No valid rows found', variant: 'destructive' });
          return;
        }
        const missing = REQUIRED_HEADERS.filter((h) => !(h in parsed[0]));
        if (missing.length) {
          toast({
            title: 'Missing required columns',
            description: `Need: ${missing.join(', ')}`,
            variant: 'destructive',
          });
          return;
        }
        setLeads(parsed);
        setFileName(file.name);
        setResults([]);
        setProgress(0);
        toast({ title: 'CSV loaded', description: `${parsed.length} leads ready` });
      };
      reader.readAsText(file);
    },
    [toast],
  );

  const toggleUni = useCallback((id: string) => {
    setSelectedUniIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const applyPreset = useCallback((preset: any) => {
    setSelectedUniIds(preset.university_ids || []);
    toast({ title: 'Preset applied', description: preset.name });
  }, [toast]);

  const selectedUniversities = useMemo(
    () => universities.filter((u) => selectedUniIds.includes(u.id)),
    [universities, selectedUniIds],
  );

  const totalPushes = leads.length * selectedUniversities.length;

  const handlePush = useCallback(async () => {
    if (!leads.length || !selectedUniversities.length) {
      toast({ title: 'Nothing to push', description: 'Need leads + at least one university', variant: 'destructive' });
      return;
    }

    setIsPushing(true);
    setProgress(0);
    setThroughput({ done: 0, elapsedMs: 0 });
    const startedAt = performance.now();

    // 1. Create one batch per university - in parallel (was sequential).
    const { data: { user } } = await supabase.auth.getUser();
    const batchByUni: Record<string, string> = {};
    const batchInserts = await Promise.all(
      selectedUniversities.map((uni) =>
        supabase
          .from('upload_batches')
          .insert({
            file_name: `MultiPush: ${fileName}`,
            total_leads: leads.length,
            university_id: uni.id,
            status: 'processing',
            user_id: user?.id || null,
          })
          .select()
          .single()
          .then((r) => ({ uniId: uni.id, batchId: r.data?.id })),
      ),
    );
    batchInserts.forEach(({ uniId, batchId }) => {
      if (batchId) batchByUni[uniId] = batchId;
    });

    // 2. Build the full task matrix (lead × uni) and prepare server-side batch payloads.
    //    BIG perf win: each HTTP call now carries up to CHUNK_SIZE tasks and is processed
    //    server-side with internal concurrency, collapsing N roundtrips into N/CHUNK_SIZE.
    type Task = { rowIndex: number; lead: CsvLead; uni: any; payload: any };
    const tasks: Task[] = [];
    for (let i = 0; i < leads.length; i++) {
      for (const uni of selectedUniversities) {
        const cm = uni.column_mapping || {};
        const customColumnMapping: Record<string, string> = {};
        (uni.customColumns || []).forEach((c: any) => {
          customColumnMapping[c.columnKey] = c.columnKey;
        });
        const lead = leads[i];
        tasks.push({
          rowIndex: i,
          lead,
          uni,
          payload: {
            batchId: batchByUni[uni.id],
            universityId: uni.id,
            sourceLabel: uni.source || '',
            leadData: {
              name: lead.name || '',
              email: lead.email || '',
              mobile: lead.mobile || '',
              address: lead.address || '',
              state: lead.state || '',
              city: lead.city || '',
              leadSource: uni.source || '',
              leadMedium: uni.medium || '',
              leadCampaign: uni.campaign || '',
              ...lead, // pass-through any extra CSV columns
            },
            apiConfig: {
              apiUrl: uni.api_url,
              secretKey: uni.secret_key,
              collegeId: uni.college_id,
              source: uni.source,
              medium: uni.medium,
              campaign: uni.campaign,
              apiType: uni.api_type || 'generic',
              columnMapping: cm,
              customColumnMapping,
              payloadWrapper: uni.payload_wrapper,
              authType: uni.auth_type,
              authHeaderKey: uni.auth_header_key,
              authHeaderValue: uni.auth_header_value,
              customHeaders: uni.custom_headers,
              apiTimeoutSeconds: uni.api_timeout_seconds,
              universityDefaults: defaultsMap[uni.id] || {},
            },
          },
        });
      }
    }

    const total = tasks.length;
    const collected: PushResult[] = new Array(total);
    let done = 0;

    // Batched UI updates: avoid React re-render storms when many chunks finish at once.
    // If uiBatchEnabled, only flush when `done` has advanced by uiBatchSize (or on final).
    let pendingFlush = false;
    let lastFlushedDone = 0;
    const flushNow = () => {
      setProgress(Math.round((done / total) * 100));
      setResults(collected.filter(Boolean));
      setThroughput({ done, elapsedMs: performance.now() - startedAt });
      lastFlushedDone = done;
    };
    const scheduleFlush = () => {
      if (uiBatchEnabled && uiBatchSize > 0) {
        // Only flush when enough new results have accumulated, or job is complete.
        if (done - lastFlushedDone < uiBatchSize && done < total) return;
        if (pendingFlush) return;
        pendingFlush = true;
        requestAnimationFrame(() => {
          pendingFlush = false;
          flushNow();
        });
        return;
      }
      if (pendingFlush) return;
      pendingFlush = true;
      requestAnimationFrame(() => {
        pendingFlush = false;
        flushNow();
      });
    };

    // Strict sequential mode across the full leads × universities matrix.
    // Each partner request finishes before the next one begins.
    let taskCursor = 0;
    const workerCount = Math.min(1, tasks.length);
    const taskWorker = async () => {
      while (true) {
        const idx = taskCursor++;
        if (idx >= tasks.length) return;
        const task = tasks[idx];
        try {
          const { data, error } = await supabase.functions.invoke('process-lead', {
            body: { tasks: [task.payload], concurrency: 1 },
          });
          if (error) throw error;
          const r = Array.isArray(data?.results) ? data.results[0] || {} : {};
          const statusStr = String(r?.status || '').toLowerCase();
          collected[idx] = {
            rowIndex: task.rowIndex,
            lead: task.lead,
            universityId: task.uni.id,
            universityName: task.uni.name,
            status:
              statusStr === 'success'
                ? 'success'
                : statusStr === 'duplicate'
                ? 'duplicate'
                : 'fail',
            response: r?.response || '',
          };
        } catch (err: any) {
          collected[idx] = {
            rowIndex: task.rowIndex,
            lead: task.lead,
            universityId: task.uni.id,
            universityName: task.uni.name,
            status: 'fail',
            response: String(err?.message || err),
          };
        }
        done++;
        scheduleFlush();
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => taskWorker()));


    // Final flush (guaranteed, in case last RAF didn't fire).
    setProgress(100);
    setResults(collected.filter(Boolean));
    setThroughput({ done, elapsedMs: performance.now() - startedAt });

    // 3. Mark batches complete - in parallel.
    await Promise.all(
      Object.values(batchByUni).map((bid) =>
        supabase.from('upload_batches').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', bid),
      ),
    );

    setIsPushing(false);
    const elapsedSec = ((performance.now() - startedAt) / 1000).toFixed(1);
    toast({
      title: 'Multi-Push complete',
      description: `${collected.filter((r) => r.status === 'success').length}/${collected.length} succeeded in ${elapsedSec}s`,
    });
  }, [leads, selectedUniversities, defaultsMap, fileName, totalPushes, toast, uiBatchEnabled, uiBatchSize]);


  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/lead-push')} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lead Push
      </Button>

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5">
          <Layers className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Multi-Push</h1>
          <p className="text-muted-foreground text-sm">
            Push one CSV of leads to multiple universities at once with pre-configured defaults.
          </p>
        </div>
      </div>

      {/* Step 1: Input - CSV or Quick Lead */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> Step 1 - Add Leads
          </CardTitle>
          <CardDescription>
            Only <code className="text-xs bg-muted px-1 rounded">name, email, mobile</code> are required.
            Everything else (course, specialization, etc.) is pulled from each university's saved defaults.
            Each university maps <code className="text-xs bg-muted px-1 rounded">name</code> to its own API field automatically
            (firstname/fullname/etc. as configured in that university's Payload).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'csv' | 'quick')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="csv"><FileText className="h-3.5 w-3.5 mr-1.5" /> Upload CSV</TabsTrigger>
              <TabsTrigger value="quick"><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Quick Lead</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="mt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Input type="file" accept=".csv" onChange={handleFile} className="max-w-md" />
                {fileName && (
                  <Badge variant="secondary" className="gap-1">
                    <FileText className="h-3 w-3" /> {fileName} · {leads.length} rows
                  </Badge>
                )}
              </div>
            </TabsContent>

            <TabsContent value="quick" className="mt-4">
              <div className="grid sm:grid-cols-3 gap-3 max-w-2xl">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input
                    value={quickLead.name}
                    onChange={(e) => setQuickLead((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email *</Label>
                  <Input
                    type="email"
                    value={quickLead.email}
                    onChange={(e) => setQuickLead((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mobile *</Label>
                  <Input
                    value={quickLead.mobile}
                    onChange={(e) => setQuickLead((p) => ({ ...p, mobile: e.target.value }))}
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const { name, email, mobile } = quickLead;
                    if (!name || !email || !mobile) {
                      toast({ title: 'Fill all 3 fields', description: 'Name, email & mobile are required', variant: 'destructive' });
                      return;
                    }
                    setLeads([{ name: name.trim(), email: email.trim(), mobile: mobile.trim() }]);
                    setFileName(`QuickLead: ${name.trim()}`);
                    setResults([]);
                    setProgress(0);
                    toast({ title: 'Quick lead ready', description: 'Now select universities & push' });
                  }}
                >
                  Use this lead
                </Button>
                {fileName.startsWith('QuickLead:') && (
                  <Badge variant="secondary" className="gap-1">
                    <UserPlus className="h-3 w-3" /> {fileName.replace('QuickLead: ', '')}
                  </Badge>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Step 2: Select universities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" /> Step 2 - Select Universities ({selectedUniIds.length} selected)
          </CardTitle>
          <CardDescription>Pick universities individually or apply a saved preset.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PresetManager
            presets={presets}
            universities={universities}
            selectedIds={selectedUniIds}
            onApply={applyPreset}
            onChange={async () => {
              const { data } = await supabase
                .from('multi_push_presets')
                .select('*')
                .order('is_default', { ascending: false });
              setPresets(data || []);
            }}
          />

          <Separator />

          <ScrollArea className="h-64 border rounded-md p-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {universities.map((u) => {
                const dCount = Object.values(defaultsMap[u.id] || {}).filter(Boolean).length;
                return (
                  <div key={u.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedUniIds.includes(u.id)}
                      onCheckedChange={() => toggleUni(u.id)}
                      id={`uni-${u.id}`}
                    />
                    <Label htmlFor={`uni-${u.id}`} className="text-sm cursor-pointer flex-1 truncate">
                      {u.name}
                    </Label>
                    {dCount > 0 ? (
                      <Badge variant="secondary" className="text-[10px] h-5">{dCount} default{dCount > 1 ? 's' : ''}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">no defaults</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex items-start gap-2 p-3 rounded-md bg-muted/40 border text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Default values (course, specialization, campus, etc.) are now configured directly inside each university (Add/Edit University → "Default / Fallback Values"). Multi-Push reads them automatically.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Push */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" /> Step 3 - Push
          </CardTitle>
          <CardDescription>
            Will execute <strong>{totalPushes}</strong> API calls ({leads.length} leads × {selectedUniversities.length}{' '}
            universities).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                Partner API wave size
              </Label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary">1 lead</Badge>
                <span>Sequential: waits for each response before sending the next lead</span>
              </div>
            </div>

            {/* Optional UI batching - reduces re-renders on huge pushes. Does NOT change push speed. */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-2">
                <Checkbox
                  id="ui-batch-toggle"
                  checked={uiBatchEnabled}
                  disabled={isPushing}
                  onCheckedChange={(v) => {
                    const on = !!v;
                    setUiBatchEnabled(on);
                    localStorage.setItem('multipush_ui_batch_on', on ? '1' : '0');
                  }}
                />
                <label htmlFor="ui-batch-toggle" className="cursor-pointer select-none">
                  Batch status updates
                </label>
                <span className="text-muted-foreground font-normal">(smoother UI on big pushes, same throughput)</span>
              </Label>
              <div className="flex gap-1">
                {[5, 10, 25, 50].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={uiBatchEnabled && uiBatchSize === n ? 'default' : 'outline'}
                    disabled={isPushing || !uiBatchEnabled}
                    onClick={() => {
                      setUiBatchSize(n);
                      localStorage.setItem('multipush_ui_batch_size', String(n));
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    every {n}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handlePush} disabled={isPushing || !totalPushes} size="lg">
              <Send className="h-4 w-4 mr-2" />
              {isPushing ? `Pushing… ${progress}%` : `Push to ${selectedUniversities.length} universities`}
            </Button>
          </div>
          {isPushing && (
            <>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{throughput.done} / {totalPushes} done</span>
                <span>
                  {throughput.elapsedMs > 500
                    ? `${(throughput.done / (throughput.elapsedMs / 1000)).toFixed(1)} pushes/sec · ETA ${
                        throughput.done > 0
                          ? Math.max(0, Math.round(((totalPushes - throughput.done) * (throughput.elapsedMs / throughput.done)) / 1000))
                          : '-'
                      }s`
                    : 'warming up…'}
                </span>
              </div>
            </>
          )}
        </CardContent>

      </Card>

      {/* Step 5: Report */}
      {results.length > 0 && <MultiPushReport results={results} universities={selectedUniversities} totalLeads={leads.length} />}
    </div>
  );
}

export default memo(MultiPushView);
