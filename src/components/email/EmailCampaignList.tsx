import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Eye, BarChart3, Copy, CalendarIcon, Upload, Users, Send, ChevronLeft, ChevronRight, ClipboardCopy } from 'lucide-react';
import { format } from 'date-fns';

import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailCampaign {
  id: string;
  name: string;
  template_id: string | null;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  subject: string | null;
  content: string | null;
  schedule_type: string;
  scheduled_at: string | null;
  status: string;
  audience_type: string | null;
  total_count: number;
  unique_audience_count: number;
  provider_campaign_id: string | null;
  provider_status: string | null;
  provider_message_id: string | null;
  created_at: string;
}

const MERGE_TAGS = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{phone}}', '{{company}}', '{{city}}'];
const PAGE_SIZE = 10;

export function EmailCampaignList() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientFilter, setRecipientFilter] = useState('all');
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    name: '', template_id: '', from_name: '', from_email: '', reply_to: '', subject: '', content: '',
    schedule_type: 'immediate', scheduled_at: null as Date | null, audience_type: 'csv', test_email: '',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [csvTotal, setCsvTotal] = useState(0);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns((data || []) as EmailCampaign[]);
    setLoading(false);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from('email_templates').select('id, name, subject, content').eq('status', 'published').eq('is_active', true);
    setTemplates(data || []);
  }, []);

  useEffect(() => { fetchCampaigns(); fetchTemplates(); }, [fetchCampaigns, fetchTemplates]);

  const filtered = campaigns.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.provider_campaign_id?.includes(search)) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onTemplateSelect = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    setForm(p => ({ ...p, template_id: id, subject: tpl?.subject || p.subject, content: tpl?.content || p.content }));
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split('\n').map(r => r.split(',').map(c => c.trim()));
      setCsvPreview(rows.slice(0, 6));
      setCsvTotal(rows.length - 1);
    };
    reader.readAsText(file);
  };

  const handleSendTest = async () => {
    if (!form.test_email) { toast({ title: 'Enter test email', variant: 'destructive' }); return; }
    toast({ title: 'Test email sent', description: `Test sent to ${form.test_email}` });
  };

  const handleLaunch = async () => {
    if (!form.name.trim()) { toast({ title: 'Campaign name required', variant: 'destructive' }); return; }
    if (!form.from_email.trim()) { toast({ title: 'From email required', variant: 'destructive' }); return; }
    if (!form.subject.trim()) { toast({ title: 'Subject required', variant: 'destructive' }); return; }

    // Parse CSV recipients
    let recipientList: any[] = [];
    if (form.audience_type === 'csv' && csvFile) {
      const text = await csvFile.text();
      const rows = text.split('\n').map(r => r.split(',').map(c => c.trim()));
      const headers = rows[0].map(h => h.toLowerCase());
      recipientList = rows.slice(1).filter(r => r.length >= headers.length).map(r => {
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return { email: obj.email || '', first_name: obj.first_name || '', last_name: obj.last_name || '', phone: obj.phone || '' };
      }).filter(r => r.email);
    }

    const { data: campaign, error } = await supabase.from('email_campaigns').insert({
      name: form.name,
      template_id: form.template_id || null,
      from_name: form.from_name,
      from_email: form.from_email,
      reply_to: form.reply_to || null,
      subject: form.subject,
      content: form.content,
      schedule_type: form.schedule_type,
      scheduled_at: form.schedule_type === 'scheduled' && form.scheduled_at ? form.scheduled_at.toISOString() : null,
      status: form.schedule_type === 'immediate' ? 'pending' : 'draft',
      audience_type: form.audience_type,
      total_count: recipientList.length || csvTotal,
      unique_audience_count: recipientList.length || csvTotal,
    }).select().single();

    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }

    if (recipientList.length > 0 && campaign) {
      // Chunk inserts to avoid payload size limits
      const CHUNK_SIZE = 500;
      const rows = recipientList.map(r => ({ campaign_id: campaign.id, email: r.email, first_name: r.first_name, last_name: r.last_name, phone: r.phone }));
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE);
        const { error: insertErr } = await supabase.from('email_recipients').insert(chunk);
        if (insertErr) console.error(`Chunk ${i / CHUNK_SIZE} insert error:`, insertErr);
      }
    }

    toast({ title: 'Campaign created', description: form.schedule_type === 'immediate' ? 'Campaign launched!' : 'Campaign scheduled!' });
    setShowAdd(false);
    setForm({ name: '', template_id: '', from_name: '', from_email: '', reply_to: '', subject: '', content: '', schedule_type: 'immediate', scheduled_at: null, audience_type: 'csv', test_email: '' });
    setCsvFile(null); setCsvPreview([]); setCsvTotal(0);
    fetchCampaigns();
  };

  const openAnalytics = async (c: EmailCampaign) => {
    setSelectedCampaign(c);
    const { data: events } = await supabase.from('email_events').select('*').eq('campaign_id', c.id);
    setAnalyticsData(events || []);
    const { data: recs } = await supabase.from('email_recipients').select('*').eq('campaign_id', c.id);
    setRecipients(recs || []);
    setShowAnalytics(true);
  };

  const handleDuplicate = async (c: EmailCampaign) => {
    await supabase.from('email_campaigns').insert({
      name: `${c.name} (Copy)`, template_id: c.template_id, from_name: c.from_name, from_email: c.from_email,
      reply_to: c.reply_to, subject: c.subject, content: c.content, schedule_type: 'immediate', status: 'draft',
      audience_type: c.audience_type, total_count: 0, unique_audience_count: 0,
    });
    toast({ title: 'Duplicated', description: 'Campaign duplicated as draft' });
    fetchCampaigns();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  const insertMergeTag = (tag: string) => setForm(p => ({ ...p, content: p.content + tag }));

  // Analytics aggregation - single pass
  const analyticsSummary = (() => {
    let delivered = 0, opened = 0, clicked = 0, bounced = 0, unsubscribed = 0, spam = 0;
    const uniqueOpenEmails = new Set<string>();
    const uniqueClickEmails = new Set<string>();
    for (const e of analyticsData) {
      switch (e.event_type) {
        case 'delivered': delivered++; break;
        case 'open': opened++; if (e.recipient_email) uniqueOpenEmails.add(e.recipient_email); break;
        case 'click': clicked++; if (e.recipient_email) uniqueClickEmails.add(e.recipient_email); break;
        case 'bounce': bounced++; break;
        case 'unsubscribe': unsubscribed++; break;
        case 'spam_report': spam++; break;
      }
    }
    return { sent: analyticsData.length, delivered, opened, clicked, bounced, unsubscribed, spam, uniqueOpens: uniqueOpenEmails.size, uniqueClicks: uniqueClickEmails.size };
  })();

  const openRate = analyticsSummary.delivered > 0 ? ((analyticsSummary.uniqueOpens / analyticsSummary.delivered) * 100).toFixed(1) : '0';
  const clickRate = analyticsSummary.delivered > 0 ? ((analyticsSummary.uniqueClicks / analyticsSummary.delivered) * 100).toFixed(1) : '0';

  const filteredRecipients = recipients.filter(r => {
    if (recipientFilter === 'all') return true;
    const emailEvents = analyticsData.filter(e => e.recipient_email === r.email);
    const hasEvent = (type: string) => emailEvents.some(e => e.event_type === type);
    if (recipientFilter === 'opened') return hasEvent('open');
    if (recipientFilter === 'not_opened') return !hasEvent('open');
    if (recipientFilter === 'clicked') return hasEvent('click');
    if (recipientFilter === 'bounced') return hasEvent('bounce');
    if (recipientFilter === 'unsubscribed') return hasEvent('unsubscribe');
    return true;
  });

  const exportRecipientsCsv = () => {
    const headers = ['Email', 'Name', 'Status', 'Opened', 'Clicked', 'Bounced', 'Unsubscribed'];
    const rows = filteredRecipients.map(r => {
      const evts = analyticsData.filter(e => e.recipient_email === r.email);
      const has = (t: string) => evts.some(e => e.event_type === t) ? 'Yes' : 'No';
      return [r.email, `${r.first_name || ''} ${r.last_name || ''}`.trim(), r.send_status, has('open'), has('click'), has('bounce'), has('unsubscribe')];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `campaign-recipients-${selectedCampaign?.id}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Email Campaign List</h3>
          <p className="text-sm text-muted-foreground">Total Campaigns: {campaigns.length}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2"><Plus className="h-4 w-4" /> Add Campaign</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or Campaign ID..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sending">Sending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Created On</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider Status</TableHead>
                <TableHead>Provider Msg ID</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : paged.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No campaigns found. Create one to get started.</TableCell></TableRow>
              ) : paged.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell>{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm">{format(new Date(c.created_at), 'MMM dd, yyyy hh:mm a')}</TableCell>
                  <TableCell className="text-sm">{c.scheduled_at ? format(new Date(c.scheduled_at), 'MMM dd, yyyy hh:mm a') : 'Immediate'}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === 'completed' ? 'default' : c.status === 'pending' ? 'secondary' : c.status === 'failed' ? 'destructive' : 'outline'}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.provider_status === 'Accepted' ? 'default' : c.provider_status === 'Failed' ? 'destructive' : 'outline'}>
                      {c.provider_status || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.provider_message_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs truncate max-w-[100px]">{c.provider_message_id}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(c.provider_message_id!)}><ClipboardCopy className="h-3 w-3" /></Button>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{c.total_count.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" title="View Details" onClick={() => { setSelectedCampaign(c); setShowDetails(true); }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Preview Email" onClick={() => { setSelectedCampaign(c); setShowPreview(true); }}><Send className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Analytics" onClick={() => openAnalytics(c)}><BarChart3 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Duplicate" onClick={() => handleDuplicate(c)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Add Campaign Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Campaign</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Section 1: Campaign Setup */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Campaign Setup</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><Label>Campaign Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="My Campaign" /></div>
                <div>
                  <Label>Select Template *</Label>
                  <Select value={form.template_id} onValueChange={onTemplateSelect}>
                    <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                    <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>From Name *</Label><Input value={form.from_name} onChange={e => setForm(p => ({ ...p, from_name: e.target.value }))} placeholder="Your Name" /></div>
                <div><Label>From Email *</Label><Input type="email" value={form.from_email} onChange={e => setForm(p => ({ ...p, from_email: e.target.value }))} placeholder="you@example.com" /></div>
                <div><Label>Reply-to Email</Label><Input type="email" value={form.reply_to} onChange={e => setForm(p => ({ ...p, reply_to: e.target.value }))} placeholder="reply@example.com" /></div>
                <div><Label>Subject Line *</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject" /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="schedule" checked={form.schedule_type === 'immediate'} onChange={() => setForm(p => ({ ...p, schedule_type: 'immediate' }))} />
                  <span className="text-sm">Send Now</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="schedule" checked={form.schedule_type === 'scheduled'} onChange={() => setForm(p => ({ ...p, schedule_type: 'scheduled' }))} />
                  <span className="text-sm">Schedule for Later</span>
                </label>
              </div>
              {form.schedule_type === 'scheduled' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {form.scheduled_at ? format(form.scheduled_at, 'MMM dd, yyyy hh:mm a') : 'Pick date & time'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.scheduled_at || undefined} onSelect={(d) => d && setForm(p => ({ ...p, scheduled_at: d }))} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Section 2: Email Content */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Email Content</h4>
              <div className="flex gap-1 flex-wrap">
                {MERGE_TAGS.map(tag => (
                  <Button key={tag} variant="outline" size="sm" className="text-xs h-7 text-green-600 border-green-300 hover:bg-green-50" onClick={() => insertMergeTag(tag)}>
                    {tag}
                  </Button>
                ))}
              </div>
              <Textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={10} placeholder="Enter HTML email content..." className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground text-right">{(form.content || '').split(/\s+/).filter(Boolean).length} words</p>
            </div>

            {/* Section 3: Send Test */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Send Test</h4>
              <div className="flex gap-2">
                <Input value={form.test_email} onChange={e => setForm(p => ({ ...p, test_email: e.target.value }))} placeholder="test@example.com (comma-separated)" className="flex-1" />
                <Button variant="outline" onClick={handleSendTest} className="gap-2"><Send className="h-4 w-4" /> Send</Button>
              </div>
            </div>

            {/* Section 4: Audience */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Audience</h4>
              <Tabs value={form.audience_type} onValueChange={v => setForm(p => ({ ...p, audience_type: v }))}>
                <TabsList>
                  <TabsTrigger value="csv" className="gap-2"><Upload className="h-4 w-4" /> Upload CSV</TabsTrigger>
                  <TabsTrigger value="crm_filter" className="gap-2"><Users className="h-4 w-4" /> CRM Contacts</TabsTrigger>
                </TabsList>
                <TabsContent value="csv" className="mt-4 space-y-3">
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" id="csv-upload" />
                    <label htmlFor="csv-upload" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p>Click to upload CSV or drag and drop</p>
                    </label>
                  </div>
                  {csvPreview.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Preview (Total records: {csvTotal})</p>
                      <div className="overflow-x-auto border rounded-md">
                        <table className="w-full text-xs">
                          <thead><tr className="bg-muted">{csvPreview[0]?.map((h, i) => <th key={i} className="p-2 text-left">{h}</th>)}</tr></thead>
                          <tbody>{csvPreview.slice(1).map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j} className="p-2 border-t">{c}</td>)}</tr>)}</tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="crm_filter" className="mt-4">
                  <p className="text-sm text-muted-foreground">Filter CRM contacts by Tags, Lead Status, City, Source, or Segment to select your audience.</p>
                </TabsContent>
              </Tabs>
            </div>

            {/* Final Message */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">Final Message | Total Count: <strong>{csvTotal || 0}</strong></p>
              <Button onClick={handleLaunch} className="gap-2">
                {form.schedule_type === 'immediate' ? 'Launch Campaign' : 'Schedule Campaign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Campaign Details</DialogTitle></DialogHeader>
          {selectedCampaign && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{selectedCampaign.name}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge>{selectedCampaign.status}</Badge></div>
                <div><span className="text-muted-foreground">From:</span> {selectedCampaign.from_name} &lt;{selectedCampaign.from_email}&gt;</div>
                <div><span className="text-muted-foreground">Subject:</span> {selectedCampaign.subject}</div>
                <div><span className="text-muted-foreground">Created:</span> {format(new Date(selectedCampaign.created_at), 'MMM dd, yyyy hh:mm a')}</div>
                <div><span className="text-muted-foreground">Total:</span> {selectedCampaign.total_count.toLocaleString()}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          {selectedCampaign && (
            <div className="border rounded-md p-4 bg-white" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedCampaign.content || '<p>No content</p>') }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Analytics Modal */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Campaign Analytics - {selectedCampaign?.name}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Sent', value: selectedCampaign?.total_count || 0 },
                { label: 'Delivered', value: analyticsSummary.delivered },
                { label: `Open Rate`, value: `${openRate}%` },
                { label: `Click Rate`, value: `${clickRate}%` },
                { label: 'Bounced', value: analyticsSummary.bounced },
                { label: 'Unsubscribed', value: analyticsSummary.unsubscribed },
                { label: 'Unique Opens', value: analyticsSummary.uniqueOpens },
                { label: 'Unique Clicks', value: analyticsSummary.uniqueClicks },
              ].map((kpi, i) => (
                <Card key={i}><CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
                </CardContent></Card>
              ))}
            </div>

            {/* Recipient Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Recipient Activity</h4>
                <div className="flex gap-2">
                  <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                    <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="opened">Opened</SelectItem>
                      <SelectItem value="not_opened">Not Opened</SelectItem>
                      <SelectItem value="clicked">Clicked</SelectItem>
                      <SelectItem value="bounced">Bounced</SelectItem>
                      <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={exportRecipientsCsv}>Export CSV</Button>
                </div>
              </div>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Email</TableHead><TableHead>Name</TableHead><TableHead>Status</TableHead>
                    <TableHead>Opened?</TableHead><TableHead>Clicked?</TableHead><TableHead>Bounced?</TableHead><TableHead>Unsub?</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredRecipients.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No recipients found</TableCell></TableRow>
                    ) : filteredRecipients.slice(0, 50).map(r => {
                      const evts = analyticsData.filter(e => e.recipient_email === r.email);
                      const has = (t: string) => evts.some(e => e.event_type === t);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs">{r.email}</TableCell>
                          <TableCell className="text-xs">{`${r.first_name || ''} ${r.last_name || ''}`.trim() || '-'}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{r.send_status}</Badge></TableCell>
                          <TableCell>{has('open') ? '✅' : '❌'}</TableCell>
                          <TableCell>{has('click') ? '✅' : '❌'}</TableCell>
                          <TableCell>{has('bounce') ? '✅' : '❌'}</TableCell>
                          <TableCell>{has('unsubscribe') ? '✅' : '❌'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
