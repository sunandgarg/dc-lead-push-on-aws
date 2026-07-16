import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Power,
  PowerOff,
  Code2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase, supabaseProjectUrl } from '@/integrations/supabase/client';

interface LandingPage {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  routing_mode: 'universities' | 'preset';
  university_ids: string[];
  preset_id: string | null;
  default_values: Record<string, string>;
  is_active: boolean;
  submissions_count: number;
  last_submission_at: string | null;
  created_at: string;
}

interface Props {
  universities: any[];
}

const RECEIVE_URL = `${supabaseProjectUrl}/functions/v1/receive-lead`;

export function LandingPagesView({ universities }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pages, setPages] = useState<LandingPage[]>([]);
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LandingPage | null>(null);
  const [snippetFor, setSnippetFor] = useState<LandingPage | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [pRes, prRes] = await Promise.all([
      supabase.from('landing_pages').select('*').order('created_at', { ascending: false }),
      supabase.from('multi_push_presets').select('id, name, university_ids'),
    ]);
    setPages((pRes.data as any) || []);
    setPresets(prRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const copyText = (text: string, label = 'Copied') => {
    navigator.clipboard.writeText(text);
    toast({ title: label });
  };

  const toggleActive = async (lp: LandingPage) => {
    await supabase.from('landing_pages').update({ is_active: !lp.is_active }).eq('id', lp.id);
    reload();
  };

  const deletePage = async (lp: LandingPage) => {
    if (!confirm(`Delete landing page "${lp.name}"? Its API key will stop working.`)) return;
    await supabase.from('landing_pages').delete().eq('id', lp.id);
    reload();
  };

  const rotateKey = async (lp: LandingPage) => {
    if (!confirm('Rotate API key? The old key will stop working immediately.')) return;
    const newKey = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await supabase.from('landing_pages').update({ api_key: newKey }).eq('id', lp.id);
    reload();
    toast({ title: 'Key rotated', description: 'Update your landing page with the new key.' });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/lead-push')} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Lead Push
      </Button>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5">
            <Globe className="h-6 w-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Landing Pages</h1>
            <p className="text-muted-foreground text-sm">
              Give each landing page its own API key. Leads POSTed here are auto-pushed to the universities you map.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> New Landing Page
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoint</CardTitle>
          <CardDescription>All landing pages POST to the same URL - the API key identifies them.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1.5 rounded flex-1 break-all">{RECEIVE_URL}</code>
            <Button size="sm" variant="outline" onClick={() => copyText(RECEIVE_URL)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No landing pages yet. Create one to get an API key.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pages.map((lp) => {
            const uniCount =
              lp.routing_mode === 'preset'
                ? (presets.find((p) => p.id === lp.preset_id)?.university_ids?.length ?? 0)
                : (lp.university_ids?.length ?? 0);
            return (
              <Card key={lp.id} className={lp.is_active ? '' : 'opacity-60'}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{lp.name}</h3>
                        <Badge variant={lp.is_active ? 'default' : 'secondary'}>
                          {lp.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {lp.routing_mode === 'preset' ? 'Preset' : 'Direct'} · {uniCount} universities
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {lp.submissions_count} submissions
                        </Badge>
                      </div>
                      {lp.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lp.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setSnippetFor(lp)}>
                        <Code2 className="h-3.5 w-3.5 mr-1" /> Snippet
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(lp)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(lp)}>
                        {lp.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rotateKey(lp)} title="Rotate key">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => deletePage(lp)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground shrink-0">API Key</Label>
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono truncate">
                      {showKey[lp.id] ? lp.api_key : '•'.repeat(Math.min(lp.api_key.length, 32))}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowKey((p) => ({ ...p, [lp.id]: !p[lp.id] }))}
                    >
                      {showKey[lp.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => copyText(lp.api_key, 'API key copied')}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <LandingPageDialog
        open={createOpen || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        editing={editing}
        universities={universities}
        presets={presets}
        onSaved={() => {
          setCreateOpen(false);
          setEditing(null);
          reload();
        }}
      />

      {snippetFor && (
        <SnippetDialog landingPage={snippetFor} onClose={() => setSnippetFor(null)} />
      )}
    </div>
  );
}

// ============== Create/Edit dialog ==============
function LandingPageDialog({
  open,
  onOpenChange,
  editing,
  universities,
  presets,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: LandingPage | null;
  universities: any[];
  presets: any[];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'universities' | 'preset'>('universities');
  const [uniIds, setUniIds] = useState<string[]>([]);
  const [presetId, setPresetId] = useState<string>('');
  const [defaultsJson, setDefaultsJson] = useState('{}');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setDescription(editing.description || '');
      setMode(editing.routing_mode);
      setUniIds(editing.university_ids || []);
      setPresetId(editing.preset_id || '');
      setDefaultsJson(JSON.stringify(editing.default_values || {}, null, 2));
    } else {
      setName('');
      setDescription('');
      setMode('universities');
      setUniIds([]);
      setPresetId('');
      setDefaultsJson('{\n  "course": "",\n  "specialization": ""\n}');
    }
  }, [editing, open]);

  const save = async () => {
    if (!name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (mode === 'universities' && uniIds.length === 0) {
      toast({ title: 'Pick at least one university', variant: 'destructive' });
      return;
    }
    if (mode === 'preset' && !presetId) {
      toast({ title: 'Pick a preset', variant: 'destructive' });
      return;
    }
    let defaults: Record<string, string> = {};
    try {
      const parsed = JSON.parse(defaultsJson || '{}');
      Object.entries(parsed).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim()) defaults[k] = String(v);
      });
    } catch {
      toast({ title: 'Default values must be valid JSON', variant: 'destructive' });
      return;
    }

    setSaving(true);
    const row = {
      name: name.trim(),
      description: description.trim() || null,
      routing_mode: mode,
      university_ids: mode === 'universities' ? uniIds : [],
      preset_id: mode === 'preset' ? presetId : null,
      default_values: defaults,
    };
    const { error } = editing
      ? await supabase.from('landing_pages').update(row).eq('id', editing.id)
      : await supabase.from('landing_pages').insert(row);
    setSaving(false);
    if (error) {
      toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? 'Landing page updated' : 'Landing page created' });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Landing Page' : 'New Landing Page'}</DialogTitle>
          <DialogDescription>Configure which universities receive leads from this landing page.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MBA Landing Page – Q1 2026" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this landing page"
              rows={2}
            />
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Routing</Label>
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="mt-2">
              <TabsList>
                <TabsTrigger value="universities">Pick Universities</TabsTrigger>
                <TabsTrigger value="preset">Use Multi-Push Preset</TabsTrigger>
              </TabsList>

              <TabsContent value="universities" className="mt-3">
                <ScrollArea className="h-56 border rounded-md p-3">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {universities.map((u) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`lp-uni-${u.id}`}
                          checked={uniIds.includes(u.id)}
                          onCheckedChange={() =>
                            setUniIds((prev) =>
                              prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id],
                            )
                          }
                        />
                        <Label htmlFor={`lp-uni-${u.id}`} className="text-sm cursor-pointer truncate flex-1">
                          {u.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground mt-2">{uniIds.length} selected</p>
              </TabsContent>

              <TabsContent value="preset" className="mt-3">
                <Select value={presetId} onValueChange={setPresetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.university_ids?.length || 0} universities)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Change the preset (in Multi-Push) and all landing pages using it update automatically.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Default Values (JSON)</Label>
            <Textarea
              value={defaultsJson}
              onChange={(e) => setDefaultsJson(e.target.value)}
              rows={5}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Fields here are used as fallbacks if the landing page form doesn't send them. Example:{' '}
              <code>{'{ "course": "MBA", "specialization": "Marketing" }'}</code>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============== Snippet dialog ==============
function SnippetDialog({ landingPage, onClose }: { landingPage: LandingPage; onClose: () => void }) {
  const { toast } = useToast();
  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast({ title: 'Copied' });
  };

  const curlSnippet = useMemo(
    () => `curl -X POST '${RECEIVE_URL}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${landingPage.api_key}' \\
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "mobile": "9876543210"
  }'`,
    [landingPage],
  );

  const fetchSnippet = useMemo(
    () => `// Paste this into your landing page form submit handler
const response = await fetch('${RECEIVE_URL}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${landingPage.api_key}',
  },
  body: JSON.stringify({
    name: formData.name,
    email: formData.email,
    mobile: formData.mobile,
    // Optional: course, specialization, city, state, source, medium, campaign
  }),
});
const result = await response.json();
console.log(result);`,
    [landingPage],
  );

  const htmlSnippet = useMemo(
    () => `<!-- Drop-in HTML form -->
<form id="lead-form">
  <input name="name" placeholder="Name" required />
  <input name="email" type="email" placeholder="Email" required />
  <input name="mobile" placeholder="Mobile" required />
  <button type="submit">Submit</button>
</form>
<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await fetch('${RECEIVE_URL}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${landingPage.api_key}',
    },
    body: JSON.stringify(Object.fromEntries(fd)),
  });
  const data = await res.json();
  if (data.success) alert('Thank you!');
  else alert('Submission failed: ' + (data.error || 'unknown'));
});
</script>`,
    [landingPage],
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Integration Snippet - {landingPage.name}</DialogTitle>
          <DialogDescription>Copy and paste into your landing page.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="html">
          <TabsList>
            <TabsTrigger value="html">HTML Form</TabsTrigger>
            <TabsTrigger value="fetch">JavaScript (fetch)</TabsTrigger>
            <TabsTrigger value="curl">cURL (test)</TabsTrigger>
          </TabsList>

          {[
            { v: 'html', code: htmlSnippet },
            { v: 'fetch', code: fetchSnippet },
            { v: 'curl', code: curlSnippet },
          ].map(({ v, code }) => (
            <TabsContent key={v} value={v} className="mt-3">
              <div className="relative">
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[55vh] whitespace-pre-wrap break-all">
                  {code}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copy(code)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="text-xs text-muted-foreground space-y-1 mt-2">
          <p>
            <strong>Response:</strong> The endpoint waits for all university pushes and returns{' '}
            <code>{'{ success, pushed_to, success_count, duplicate_count, fail_count, results[] }'}</code>.
          </p>
          <p>Optional fields you can send: <code>course, specialization, city, state, source, medium, campaign</code> and any custom fields configured on your universities.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default memo(LandingPagesView);
