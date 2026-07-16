import { memo, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  ArrowLeft, Plus, Search, Download, Upload, LayoutGrid, List,
  Phone, Mail, MessageSquare, Star, ChevronDown, SlidersHorizontal, Users, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SOURCES = ['Google Ads', 'Meta Ads', 'Organic', 'Walk-in', 'Referral', 'Website', 'WhatsApp'];

const ALL_COLUMNS = [
  { key: 'name', label: 'Name', default: true },
  { key: 'mobile', label: 'Mobile', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'source', label: 'Source', default: true },
  { key: 'stage', label: 'Stage', default: true },
  { key: 'score', label: 'Score', default: true },
  { key: 'course', label: 'Course', default: false },
  { key: 'city', label: 'City', default: false },
  { key: 'counselor', label: 'Counselor', default: true },
  { key: 'createdAt', label: 'Created', default: false },
];

const stageColors: Record<string, string> = {
  'Inquiry': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Follow-up': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Application': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'Enrolled': 'bg-green-500/10 text-green-600 border-green-500/20',
  'Lost': 'bg-red-500/10 text-red-600 border-red-500/20',
};

interface LeadManagementModuleProps {
  universities?: any[];
}

export function LeadManagementModule({ universities }: LeadManagementModuleProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key)));
  const [showAddLead, setShowAddLead] = useState(false);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);

  // New lead form state
  const [newLead, setNewLead] = useState({ name: '', mobile: '', email: '', source: '', course: '', city: '' });

  // Fetch pipeline stages
  const { data: stages = [] } = useQuery({
    queryKey: ['pipeline-stages-lead-mgmt'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pipeline_stages').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const stageNames = useMemo(() => stages.map(s => s.name), [stages]);
  const stageMap = useMemo(() => Object.fromEntries(stages.map(s => [s.id, s.name])), [stages]);

  // Fetch contacts from DB
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['crm-leads-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*, pipeline_stages(name)')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Lead freshness helper (2026 SLA feature)
  const getLeadFreshness = (createdAt: string) => {
    const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000;
    if (hours < 1) return { label: 'Hot', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
    if (hours < 24) return { label: 'Fresh', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
    if (hours < 72) return { label: 'Warm', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    return { label: 'Aging', color: 'bg-muted text-muted-foreground' };
  };

  // Map contacts to lead format
  const leads = useMemo(() => contacts.map(c => ({
    id: c.id,
    name: c.name,
    email: c.email || '',
    mobile: c.mobile,
    source: c.source || 'Unknown',
    stage: (c as any).pipeline_stages?.name || 'Inquiry',
    stageId: c.stage_id,
    score: c.lead_score || 0,
    course: c.course || '',
    city: c.city || '',
    counselor: c.assigned_to ? 'Assigned' : 'Unassigned',
    createdAt: c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
    rawCreatedAt: c.created_at || '',
    freshness: getLeadFreshness(c.created_at || new Date().toISOString()),
  })), [contacts]);

  const filteredLeads = useMemo(() => leads.filter(l => {
    const matchSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || l.email.toLowerCase().includes(searchTerm.toLowerCase()) || l.mobile.includes(searchTerm);
    return matchSearch && (sourceFilter === 'all' || l.source === sourceFilter) && (stageFilter === 'all' || l.stage === stageFilter);
  }), [leads, searchTerm, sourceFilter, stageFilter]);

  // Add lead mutation
  const addLeadMutation = useMutation({
    mutationFn: async () => {
      if (!newLead.name.trim() || !newLead.mobile.trim()) throw new Error('Name and mobile required');
      const defaultStage = stages.find(s => s.name === 'Inquiry') || stages[0];
      const { error } = await supabase.from('crm_contacts').insert({
        name: newLead.name,
        mobile: newLead.mobile,
        email: newLead.email || null,
        source: newLead.source || null,
        course: newLead.course || null,
        city: newLead.city || null,
        stage_id: defaultStage?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads-management'] });
      toast({ title: 'Lead Added', description: 'New lead created successfully' });
      setShowAddLead(false);
      setNewLead({ name: '', mobile: '', email: '', source: '', course: '', city: '' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Kanban stage change
  const handleKanbanDrop = useCallback(async (leadId: string, newStageName: string) => {
    const stage = stages.find(s => s.name === newStageName);
    if (!stage) return;
    const { error } = await supabase.from('crm_contacts').update({ stage_id: stage.id }).eq('id', leadId);
    if (!error) queryClient.invalidateQueries({ queryKey: ['crm-leads-management'] });
    setDraggedLead(null);
  }, [stages, queryClient]);

  const toggleColumn = (key: string) => setVisibleColumns(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleSelectLead = (id: string) => setSelectedLeads(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSelectAll = () => setSelectedLeads(prev => prev.size === filteredLeads.length ? new Set() : new Set(filteredLeads.map(l => l.id)));
  const getScoreColor = (score: number) => score >= 70 ? 'text-green-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';

  const displayStages = stageNames.length > 0 ? stageNames : ['Inquiry', 'Follow-up', 'Application', 'Enrolled', 'Lost'];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM Hub
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-blue-500" /> Smart Lead Manager</h1>
            <p className="text-muted-foreground">Manage, score, and track all leads in one place</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowAddLead(true)} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Lead</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {displayStages.slice(0, 5).map(stage => (
          <Card key={stage}><CardContent className="p-3">
            <p className="text-xs text-muted-foreground">{stage}</p>
            <p className="text-xl font-bold">{leads.filter(l => l.stage === stage).length}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or mobile..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Sources</SelectItem>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Stages</SelectItem>{displayStages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1"><SlidersHorizontal className="h-3.5 w-3.5" /> Columns <ChevronDown className="h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {ALL_COLUMNS.map(col => <DropdownMenuCheckboxItem key={col.key} checked={visibleColumns.has(col.key)} onCheckedChange={() => toggleColumn(col.key)}>{col.label}</DropdownMenuCheckboxItem>)}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex border rounded-lg overflow-hidden">
          <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('table')}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('kanban')}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      {selectedLeads.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">{selectedLeads.size} leads selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">Assign</Button>
            <Button size="sm" variant="outline">Change Stage</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'table' ? (
        <Card><CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/30">
                <th className="p-3 w-10"><Checkbox checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0} onCheckedChange={toggleSelectAll} /></th>
                {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => <th key={col.key} className="text-left p-3 font-medium text-muted-foreground whitespace-nowrap">{col.label}</th>)}
                <th className="text-right p-3 font-medium text-muted-foreground">Quick Actions</th>
              </tr></thead>
              <tbody>
                {filteredLeads.slice(0, 50).map(lead => (
                  <tr key={lead.id} className="border-b hover:bg-muted/20">
                    <td className="p-3"><Checkbox checked={selectedLeads.has(lead.id)} onCheckedChange={() => toggleSelectLead(lead.id)} /></td>
                    {visibleColumns.has('name') && <td className="p-3"><div className="flex items-center gap-2"><span className="font-medium">{lead.name}</span><Badge className={cn("text-[10px] px-1.5 py-0", lead.freshness.color)}>{lead.freshness.label}</Badge></div></td>}
                    {visibleColumns.has('mobile') && <td className="p-3 font-mono text-xs">{lead.mobile}</td>}
                    {visibleColumns.has('email') && <td className="p-3 text-xs">{lead.email}</td>}
                    {visibleColumns.has('source') && <td className="p-3"><Badge variant="secondary" className="text-xs">{lead.source}</Badge></td>}
                    {visibleColumns.has('stage') && <td className="p-3"><Badge className={cn("text-xs", stageColors[lead.stage] || 'bg-muted text-muted-foreground')}>{lead.stage}</Badge></td>}
                    {visibleColumns.has('score') && <td className="p-3"><span className={cn("font-bold", getScoreColor(lead.score))}>{lead.score}</span></td>}
                    {visibleColumns.has('course') && <td className="p-3 text-xs">{lead.course}</td>}
                    {visibleColumns.has('city') && <td className="p-3 text-xs">{lead.city}</td>}
                    {visibleColumns.has('counselor') && <td className="p-3 text-xs">{lead.counselor}</td>}
                    {visibleColumns.has('createdAt') && <td className="p-3 text-xs">{lead.createdAt}</td>}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MessageSquare className="h-3.5 w-3.5 text-green-500" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Mail className="h-3.5 w-3.5 text-blue-500" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Phone className="h-3.5 w-3.5 text-amber-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 text-xs text-muted-foreground border-t">Showing {Math.min(50, filteredLeads.length)} of {filteredLeads.length} leads</div>
        </CardContent></Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {displayStages.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage);
            return (
              <div key={stage} className="min-w-[280px] flex-1" onDragOver={e => e.preventDefault()} onDrop={() => draggedLead && handleKanbanDrop(draggedLead, stage)}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={cn("text-xs", stageColors[stage] || 'bg-muted text-muted-foreground')}>{stage}</Badge>
                  <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
                </div>
                <div className="space-y-2 min-h-[200px] bg-muted/20 rounded-lg p-2">
                  {stageLeads.slice(0, 10).map(lead => (
                    <Card key={lead.id} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow" draggable onDragStart={() => setDraggedLead(lead.id)}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.course} • {lead.city}</p>
                          </div>
                          <span className={cn("text-xs font-bold", getScoreColor(lead.score))}>{lead.score}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6"><MessageSquare className="h-3 w-3 text-green-500" /></Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><Mail className="h-3 w-3 text-blue-500" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {stageLeads.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No leads</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={showAddLead} onOpenChange={setShowAddLead}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add New Lead</SheetTitle>
            <SheetDescription>Enter lead details to add to the pipeline</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div><Label>Full Name *</Label><Input placeholder="Enter name" value={newLead.name} onChange={e => setNewLead(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Mobile *</Label><Input placeholder="+91 9876543210" value={newLead.mobile} onChange={e => setNewLead(p => ({ ...p, mobile: e.target.value }))} /></div>
            <div><Label>Email</Label><Input placeholder="email@example.com" type="email" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Source</Label>
              <Select value={newLead.source} onValueChange={v => setNewLead(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Course</Label><Input placeholder="MBA, B.Tech, etc." value={newLead.course} onChange={e => setNewLead(p => ({ ...p, course: e.target.value }))} /></div>
            <div><Label>City</Label><Input placeholder="City name" value={newLead.city} onChange={e => setNewLead(p => ({ ...p, city: e.target.value }))} /></div>
            <Button className="w-full mt-4" onClick={() => addLeadMutation.mutate()} disabled={addLeadMutation.isPending}>
              {addLeadMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : 'Add Lead'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default memo(LeadManagementModule);
