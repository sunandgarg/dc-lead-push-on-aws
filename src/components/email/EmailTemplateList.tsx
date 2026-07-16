import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Pencil, Trash2, Copy } from 'lucide-react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  category: string | null;
  subject: string | null;
  content: string | null;
  is_active: boolean;
  status: string;
  created_at: string;
}

const MERGE_TAGS = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{phone}}', '{{company}}', '{{city}}'];
const CATEGORIES = ['General', 'Marketing', 'Transactional', 'Onboarding', 'Newsletter', 'Promotional'];

export function EmailTemplateList() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: '', subject: '', content: '', is_active: true, status: 'draft' });
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
    if (!error) setTemplates((data || []) as EmailTemplate[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', category: '', subject: '', content: '', is_active: true, status: 'draft' });
    setShowModal(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditingId(t.id);
    setForm({ name: t.name, category: t.category || '', subject: t.subject || '', content: t.content || '', is_active: t.is_active, status: t.status });
    setShowModal(true);
  };

  const handleSave = async (publishStatus?: string) => {
    if (!form.name.trim()) { toast({ title: 'Error', description: 'Template name is required', variant: 'destructive' }); return; }
    const status = publishStatus || form.status;
    const payload = { name: form.name, category: form.category || null, subject: form.subject || null, content: form.content || null, is_active: form.is_active, status };

    if (editingId) {
      const { error } = await supabase.from('email_templates').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Updated', description: 'Template updated successfully' });
    } else {
      const { error } = await supabase.from('email_templates').insert(payload);
      if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Created', description: 'Template created successfully' });
    }
    setShowModal(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await supabase.from('email_templates').delete().eq('id', id);
    toast({ title: 'Deleted', description: 'Template deleted' });
    fetchTemplates();
  };

  const handleDuplicate = async (t: EmailTemplate) => {
    await supabase.from('email_templates').insert({ name: `${t.name} (Copy)`, category: t.category, subject: t.subject, content: t.content, is_active: false, status: 'draft' });
    toast({ title: 'Duplicated', description: 'Template duplicated as draft' });
    fetchTemplates();
  };

  const toggleActive = async (t: EmailTemplate) => {
    await supabase.from('email_templates').update({ is_active: !t.is_active }).eq('id', t.id);
    fetchTemplates();
  };

  const insertMergeTag = (tag: string) => {
    setForm(prev => ({ ...prev, content: prev.content + tag }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Email Templates</h3>
          <p className="text-sm text-muted-foreground">Total Templates: {templates.length}</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Template</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Is Active</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No templates found. Create one to get started.</TableCell></TableRow>
              ) : filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>
                    <Badge variant={t.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActive(t)}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.status === 'published' ? 'outline' : 'secondary'}>
                      {t.status === 'published' ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Preview" onClick={() => { setPreviewHtml(t.content || '<p>No content</p>'); setShowPreview(true); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicate(t)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Template' : 'Add Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Enter template name" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject line" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Template Content *</Label>
                <div className="flex gap-1 flex-wrap">
                  {MERGE_TAGS.map(tag => (
                    <Button key={tag} variant="outline" size="sm" className="text-xs h-6 text-green-600 border-green-300 hover:bg-green-50" onClick={() => insertMergeTag(tag)}>
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={12} placeholder="Enter HTML email content..." className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground mt-1">{(form.content || '').split(/\s+/).filter(Boolean).length} words</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => handleSave('draft')}>Save as Draft</Button>
              <Button onClick={() => handleSave('published')}>Publish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          <div className="border rounded-md p-4 bg-white" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
