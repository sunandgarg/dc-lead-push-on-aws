import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Copy, Plus, Eye, EyeOff, Key, Loader2, Check, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApiKeyRow {
  id: string;
  name: string;
  api_key: string;
  university_id: string;
  university_name: string;
  is_active: boolean;
  request_count: number;
  last_used_at: string | null;
  created_at: string;
  allowed_ips: string[] | null;
}

const ACCEPTED_FIELDS = [
  { name: 'university_id', type: 'string (UUID)', required: true, notes: 'ID of the target university' },
  { name: 'api_key', type: 'string', required: true, notes: 'Your generated API key' },
  { name: 'name', type: 'string', required: true, notes: '' },
  { name: 'email', type: 'string', required: true, notes: '' },
  { name: 'mobile', type: 'string', required: true, notes: '' },
  { name: 'course', type: 'string', required: false, notes: 'Falls back to university defaults' },
  { name: 'specialization', type: 'string', required: false, notes: 'Falls back to university defaults' },
  { name: 'city', type: 'string', required: false, notes: '' },
  { name: 'state', type: 'string', required: false, notes: '' },
  { name: 'source', type: 'string', required: false, notes: 'Defaults to university source' },
  { name: 'medium', type: 'string', required: false, notes: 'Defaults to university medium' },
  { name: 'campaign', type: 'string', required: false, notes: 'Defaults to university campaign' },
];

export function ApiConnectionsPage() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedUniId, setSelectedUniId] = useState('');
  const [newIps, setNewIps] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState('');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const endpointUrl = `https://${projectId}.supabase.co/functions/v1/receive-lead`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, uniRes] = await Promise.all([
        supabase.from('university_api_keys').select('*, universities(name)').order('created_at', { ascending: false }),
        supabase.from('universities').select('id, name').order('name'),
      ]);

      if (keysRes.data) {
        setKeys(keysRes.data.map((k: any) => ({
          id: k.id,
          name: k.name || k.universities?.name || 'Unnamed',
          api_key: k.api_key,
          university_id: k.university_id,
          university_name: k.universities?.name || 'Unknown',
          is_active: k.is_active,
          request_count: k.request_count || 0,
          last_used_at: k.last_used_at,
          created_at: k.created_at,
          allowed_ips: k.allowed_ips,
        })));
      }
      if (uniRes.data) setUniversities(uniRes.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: 'Copied!', description: `${label} copied to clipboard` });
    setTimeout(() => setCopied(''), 2000);
  };

  const handleGenerate = async () => {
    if (!newName.trim()) { toast({ title: 'Error', description: 'Enter a key name', variant: 'destructive' }); return; }
    if (!selectedUniId) { toast({ title: 'Error', description: 'Select a university', variant: 'destructive' }); return; }
    setGenerating(true);
    try {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
      let key = 'lms_';
      for (let i = 0; i < 24; i++) key += chars[Math.floor(Math.random() * chars.length)];

      const { error } = await supabase.from('university_api_keys').insert({
        name: newName,
        api_key: key,
        university_id: selectedUniId,
        is_active: true,
        allowed_ips: newIps ? newIps.split(',').map(ip => ip.trim()) : null,
      });

      if (error) throw error;
      setGeneratedKey(key);
      toast({ title: 'API Key Generated', description: `Key for "${newName}" created` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const toggleKeyStatus = async (id: string, current: boolean) => {
    await supabase.from('university_api_keys').update({ is_active: !current }).eq('id', id);
    fetchData();
  };

  const deleteKey = async (id: string) => {
    if (!confirm('Delete this API key?')) return;
    await supabase.from('university_api_keys').delete().eq('id', id);
    fetchData();
    toast({ title: 'API Key Deleted' });
  };

  const toggleReveal = (id: string) => setRevealedKeys(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const samplePayload = `{
  "university_id": "YOUR_UNIVERSITY_ID",
  "api_key": "YOUR_KEY_HERE",
  "name": "Rahul Sharma",
  "email": "rahul@gmail.com",
  "mobile": "9876543210",
  "course": "B.Tech",
  "city": "Delhi",
  "source": "API",
  "campaign": "My Campaign"
}`;

  const sampleCurl = `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ university_id: "YOUR_UNI_ID", api_key: "YOUR_KEY", name: "Test", email: "test@test.com", mobile: "9876543210" })}'`;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">API Connections</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button onClick={() => { setShowModal(true); setGeneratedKey(''); setNewName(''); setNewIps(''); setSelectedUniId(''); }}>
            <Plus className="h-4 w-4 mr-2" /> Generate API Key
          </Button>
        </div>
      </div>

      {/* Endpoint Info */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Key className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-lg">Receive Leads via API</h2>
        </div>
        <p className="text-sm text-muted-foreground">Share this endpoint with external platforms (LeadSquared, Sulekha, IndiaMART, etc.) to send leads directly into your system.</p>

        <div>
          <Label className="text-xs text-muted-foreground">Webhook URL</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-mono break-all">{endpointUrl}</code>
            <Button variant="outline" size="icon" onClick={() => copyToClipboard(endpointUrl, 'URL')}>
              {copied === 'URL' ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Sample POST Payload</Label>
            <pre className="mt-1 bg-background border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto">{samplePayload}</pre>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">cURL Command</Label>
            <div className="relative mt-1">
              <pre className="bg-background border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto pr-12">{sampleCurl}</pre>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => copyToClipboard(sampleCurl, 'cURL')}>
                {copied === 'cURL' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Keys Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="font-display font-semibold">API Keys</h3></div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Name</TableHead>
                <TableHead>University</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requests</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No API keys. Generate one to start receiving leads.</TableCell></TableRow>
              ) : keys.map(k => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="text-sm">{k.university_name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {revealedKeys.has(k.id) ? k.api_key : '••••••••••••••••'}
                  </TableCell>
                  <TableCell>
                    <span className={k.is_active ? 'badge-success' : 'badge-warning'} onClick={() => toggleKeyStatus(k.id, k.is_active)} style={{ cursor: 'pointer' }}>
                      {k.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="font-display font-medium">{k.request_count}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleReveal(k.id)}>
                        {revealedKeys.has(k.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(k.api_key, 'Key')}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteKey(k.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Accepted Fields */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="font-display font-semibold">Accepted Incoming Fields</h3></div>
        <Table>
          <TableHeader>
            <TableRow className="table-header">
              <TableHead>Field Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ACCEPTED_FIELDS.map(f => (
              <TableRow key={f.name}>
                <TableCell className="font-mono text-sm">{f.name}</TableCell>
                <TableCell className="text-sm">{f.type}</TableCell>
                <TableCell>{f.required ? <span className="badge-error">Yes</span> : <span className="badge-info">No</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Generate Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Generate New API Key</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Key Name</Label>
              <Input placeholder="e.g. LeadSquared Integration" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div>
              <Label>University</Label>
              <Select value={selectedUniId} onValueChange={setSelectedUniId}>
                <SelectTrigger><SelectValue placeholder="Select University" /></SelectTrigger>
                <SelectContent>
                  {universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Allowed IPs (optional, comma-separated)</Label>
              <Input placeholder="e.g. 192.168.1.1, 10.0.0.1" value={newIps} onChange={e => setNewIps(e.target.value)} />
            </div>
            {generatedKey && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-sm font-medium text-success mb-2">✓ Key Generated Successfully</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border border-border break-all">{generatedKey}</code>
                  <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedKey, 'New Key')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Save this key - it won't be shown again in full.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            {!generatedKey ? (
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                Generate Key
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowModal(false)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
