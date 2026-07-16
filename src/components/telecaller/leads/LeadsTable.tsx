import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Phone, Mail, MessageCircle, Columns, GripVertical, Download } from 'lucide-react';
import { AddNewLeadModal } from './AddNewLeadModal';
import { WhatsAppQuickAction } from './WhatsAppQuickAction';
import { useToast } from '@/hooks/use-toast';

interface LeadRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  stream: string;
  entity: string;
  state: string;
  counselor: string;
  status: 'Untouched' | 'Follow-up' | 'Interested' | 'Application' | 'Enrolled' | 'Not Interested';
  createdAt: string;
  lastContacted: string | null;
  score: number;
}

const MOCK_LEADS: LeadRecord[] = [
  { id: 'L-001', name: 'Arjun Mehta', email: 'arjun@gmail.com', phone: '9876001001', source: 'Facebook Ads', stream: 'Engineering', entity: 'IIT Delhi', state: 'Maharashtra', counselor: 'Sneha Singh', status: 'Untouched', createdAt: '2026-03-08', lastContacted: null, score: 45 },
  { id: 'L-002', name: 'Pooja Verma', email: 'pooja@gmail.com', phone: '9876001002', source: 'Google Ads', stream: 'Medical', entity: 'BITS Pilani', state: 'Delhi', counselor: 'Vikram Reddy', status: 'Follow-up', createdAt: '2026-03-07', lastContacted: '2026-03-08', score: 72 },
  { id: 'L-003', name: 'Karan Nair', email: 'karan@gmail.com', phone: '9876001003', source: 'Walk-in', stream: 'Management', entity: 'VIT Vellore', state: 'Karnataka', counselor: 'Neha Gupta', status: 'Interested', createdAt: '2026-03-06', lastContacted: '2026-03-07', score: 85 },
  { id: 'L-004', name: 'Divya Sharma', email: 'divya@gmail.com', phone: '9876001004', source: 'Website', stream: 'Arts', entity: 'SRM Chennai', state: 'Tamil Nadu', counselor: 'Ravi Joshi', status: 'Application', createdAt: '2026-03-05', lastContacted: '2026-03-08', score: 90 },
  { id: 'L-005', name: 'Rohit Kumar', email: 'rohit@gmail.com', phone: '9876001005', source: 'Referral', stream: 'Commerce', entity: 'Manipal University', state: 'Uttar Pradesh', counselor: 'Ananya Desai', status: 'Enrolled', createdAt: '2026-03-04', lastContacted: '2026-03-06', score: 95 },
  { id: 'L-006', name: 'Meera Jain', email: 'meera@gmail.com', phone: '9876001006', source: 'Custom Campaign', stream: 'Law', entity: 'Amity University', state: 'Rajasthan', counselor: 'Sneha Singh', status: 'Untouched', createdAt: '2026-03-08', lastContacted: null, score: 30 },
  { id: 'L-007', name: 'Suresh Iyer', email: 'suresh@gmail.com', phone: '9876001007', source: 'Facebook Ads', stream: 'Science', entity: 'NIT Trichy', state: 'Kerala', counselor: 'Vikram Reddy', status: 'Not Interested', createdAt: '2026-03-03', lastContacted: '2026-03-05', score: 15 },
  { id: 'L-008', name: 'Anita Rao', email: 'anita@gmail.com', phone: '9876001008', source: 'WhatsApp', stream: 'Design', entity: 'IIT Delhi', state: 'Telangana', counselor: 'Neha Gupta', status: 'Untouched', createdAt: '2026-03-08', lastContacted: null, score: 55 },
];

const ALL_COLUMNS = [
  { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
  { key: 'source', label: 'Source' }, { key: 'stream', label: 'Stream' }, { key: 'entity', label: 'Entity' },
  { key: 'state', label: 'State' }, { key: 'counselor', label: 'Counselor' }, { key: 'status', label: 'Status' },
  { key: 'score', label: 'Score' }, { key: 'createdAt', label: 'Created' },
];

const KANBAN_STAGES = ['Untouched', 'Follow-up', 'Interested', 'Application', 'Enrolled', 'Not Interested'] as const;

const STATUS_COLORS: Record<string, string> = {
  'Untouched': 'bg-red-100 text-red-700 border-red-200',
  'Follow-up': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Interested': 'bg-blue-100 text-blue-700 border-blue-200',
  'Application': 'bg-purple-100 text-purple-700 border-purple-200',
  'Enrolled': 'bg-green-100 text-green-700 border-green-200',
  'Not Interested': 'bg-gray-100 text-gray-500 border-gray-200',
};

export function LeadsTable() {
  const [leads, setLeads] = useState<LeadRecord[]>(MOCK_LEADS);
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedLeadForWA, setSelectedLeadForWA] = useState<LeadRecord | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const { toast } = useToast();

  // Column visibility with localStorage persistence
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem('lead_visible_columns');
    return saved ? JSON.parse(saved) : ALL_COLUMNS.map(c => c.key);
  });

  useEffect(() => {
    localStorage.setItem('lead_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const filtered = leads.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.phone.includes(search) ||
    l.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddLead = (data: any) => {
    const newLead: LeadRecord = {
      id: `L-${String(leads.length + 1).padStart(3, '0')}`,
      name: data.name, email: data.email, phone: data.phone,
      source: data.leadSource, stream: data.preferredStream,
      entity: data.targetEntity, state: data.state,
      counselor: data.assignCounselor, status: 'Untouched',
      createdAt: new Date().toISOString().split('T')[0],
      lastContacted: null, score: Math.floor(Math.random() * 50) + 20,
    };
    setLeads(prev => [newLead, ...prev]);
  };

  const openWhatsApp = (lead: LeadRecord) => {
    setSelectedLeadForWA(lead);
    setWaModalOpen(true);
  };

  const getCellValue = (lead: LeadRecord, key: string) => {
    switch (key) {
      case 'status': return <Badge className={`text-xs ${STATUS_COLORS[lead.status]}`}>{lead.status}</Badge>;
      case 'score': return <span className={`font-semibold ${lead.score >= 70 ? 'text-green-600' : lead.score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{lead.score}</span>;
      default: return (lead as any)[key] || '-';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">All Leads</CardTitle>
              <Badge variant="secondary" className="bg-primary/10 text-primary">{leads.length} Total</Badge>
              <Badge variant="secondary" className="bg-red-100 text-red-700">{leads.filter(l => l.status === 'Untouched').length} Untouched</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Columns className="h-4 w-4 mr-1" />Edit Columns</Button></DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {ALL_COLUMNS.map(col => (
                    <DropdownMenuCheckboxItem key={col.key} checked={visibleColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)}>
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setView('table')}>Table</Button>
              <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>Kanban</Button>
              <Button size="sm" onClick={() => setAddModalOpen(true)}><UserPlus className="h-4 w-4 mr-1" />Add Lead</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {view === 'table' ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead, idx) => (
                    <TableRow key={lead.id} className={`hover:bg-muted/30 ${lead.status === 'Untouched' ? 'border-l-4 border-l-red-400 bg-red-50/30' : ''}`}>
                      <TableCell className="text-muted-foreground text-sm">{idx + 1}</TableCell>
                      {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                        <TableCell key={col.key} className="text-sm">{getCellValue(lead, col.key)}</TableCell>
                      ))}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => openWhatsApp(lead)} title="WhatsApp">
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Email">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={() => window.location.href = `tel:${lead.phone}`} title="Call">
                            <Phone className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4 overflow-x-auto">
              <div className="flex gap-4 min-w-max">
                {KANBAN_STAGES.map(stage => {
                  const stageLeads = filtered.filter(l => l.status === stage);
                  return (
                    <div key={stage} className="w-72 flex-shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">{stage}</h3>
                        <Badge variant="secondary" className="text-xs">{stageLeads.length}</Badge>
                      </div>
                      <div className="space-y-2">
                        {stageLeads.map(lead => (
                          <Card key={lead.id} className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${lead.status === 'Untouched' ? 'border-l-4 border-l-red-400' : ''}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-sm">{lead.name}</p>
                              <span className={`text-xs font-bold ${lead.score >= 70 ? 'text-green-600' : 'text-yellow-600'}`}>{lead.score}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{lead.entity}</p>
                            <p className="text-xs text-muted-foreground">{lead.source} • {lead.stream}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openWhatsApp(lead)}><MessageCircle className="h-3 w-3 text-green-600" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6"><Mail className="h-3 w-3 text-blue-600" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.location.href = `tel:${lead.phone}`}><Phone className="h-3 w-3" /></Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AddNewLeadModal open={addModalOpen} onOpenChange={setAddModalOpen} onSave={handleAddLead} />
      {selectedLeadForWA && (
        <WhatsAppQuickAction open={waModalOpen} onOpenChange={setWaModalOpen} lead={selectedLeadForWA} />
      )}
    </div>
  );
}
