import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  MoreVertical,
  Eye,
  MessageSquare,
  Zap,
  ExternalLink,
  Upload,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LeadDetailPanel } from './LeadDetailPanel';
import { BulkLeadImport } from '../leads/BulkLeadImport';
import { LeadExport } from '../leads/LeadExport';
import { LeadAssignmentSelector } from './LeadAssignmentSelector';

interface ContactsViewProps {
  universities: any[];
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  city: string | null;
  state: string | null;
  course: string | null;
  specialization: string | null;
  source: string | null;
  stage_id: string | null;
  priority: string | null;
  tags: string[] | null;
  notes: string | null;
  university_id: string | null;
  created_at: string;
  stage?: { name: string; color: string };
}

export function ContactsView({ universities }: ContactsViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [universityFilter, setUniversityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const { isAdmin } = useAdminAuth();
  const { toast } = useToast();
  const pageSize = 20;

  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    mobile: '',
    city: '',
    state: '',
    course: '',
    source: '',
    notes: '',
    university_id: '',
  });

  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchData();
  }, [page, stageFilter, universityFilter, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stages once
      const stagesRes = await supabase.from('pipeline_stages').select('*').order('sort_order');
      const stagesData = stagesRes.data || [];
      setStages(stagesData);

      // Build query with server-side filters and pagination
      let query = supabase.from('crm_contacts').select('*', { count: 'exact' });
      
      if (stageFilter !== 'all') query = query.eq('stage_id', stageFilter);
      if (universityFilter !== 'all') query = query.eq('university_id', universityFilter);
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,mobile.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      const contactsWithStages = (data || []).map(contact => ({
        ...contact,
        stage: stagesData.find(s => s.id === contact.stage_id),
      }));

      setContacts(contactsWithStages);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Server-side pagination - contacts are already filtered & paginated
  const paginatedContacts = contacts;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.mobile) {
      toast({ title: 'Error', description: 'Name and mobile are required', variant: 'destructive' });
      return;
    }

    try {
      const defaultStage = stages.find(s => s.is_default) || stages[0];
      
      const { error } = await supabase.from('crm_contacts').insert({
        name: newContact.name,
        email: newContact.email || null,
        mobile: newContact.mobile,
        city: newContact.city || null,
        state: newContact.state || null,
        course: newContact.course || null,
        source: newContact.source || null,
        notes: newContact.notes || null,
        university_id: newContact.university_id || null,
        stage_id: defaultStage?.id || null,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Contact added successfully' });
      setIsAddOpen(false);
      setNewContact({ name: '', email: '', mobile: '', city: '', state: '', course: '', source: '', notes: '', university_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({ title: 'Error', description: 'Failed to add contact', variant: 'destructive' });
    }
  };

  const updateContactStage = async (contactId: string, stageId: string) => {
    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update({ stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', contactId);

      if (error) throw error;
      fetchData();
      toast({ title: 'Success', description: 'Stage updated' });
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading contacts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={universityFilter} onValueChange={setUniversityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Universities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Universities</SelectItem>
              {universities.map(uni => (
                <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Admin Import/Export */}
          {isAdmin && (
            <Sheet open={importExportOpen} onOpenChange={setImportExportOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import/Export
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Bulk Lead Management</SheetTitle>
                </SheetHeader>
                <Tabs defaultValue="import" className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="import">Import</TabsTrigger>
                    <TabsTrigger value="export">Export</TabsTrigger>
                  </TabsList>
                  <TabsContent value="import" className="mt-4">
                    <BulkLeadImport 
                      universities={universities} 
                      stages={stages}
                      onImportComplete={() => {
                        fetchData();
                        setImportExportOpen(false);
                      }}
                    />
                  </TabsContent>
                  <TabsContent value="export" className="mt-4">
                    <LeadExport universities={universities} stages={stages} />
                  </TabsContent>
                </Tabs>
              </SheetContent>
            </Sheet>
          )}

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mobile *</Label>
                    <Input
                      value={newContact.mobile}
                      onChange={(e) => setNewContact(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="Mobile number"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newContact.email}
                      onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={newContact.city}
                      onChange={(e) => setNewContact(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={newContact.state}
                      onChange={(e) => setNewContact(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="State"
                    />
                  </div>
                </div>
                <div>
                  <Label>Course Interest</Label>
                  <Input
                    value={newContact.course}
                    onChange={(e) => setNewContact(prev => ({ ...prev, course: e.target.value }))}
                    placeholder="Course"
                  />
                </div>
                <div>
                  <Label>University</Label>
                  <Select 
                    value={newContact.university_id} 
                    onValueChange={(v) => setNewContact(prev => ({ ...prev, university_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select university" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map(uni => (
                        <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                  />
                </div>
                <Button onClick={handleAddContact} className="w-full">
                  Add Contact
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{totalCount}</p>
        </Card>
        {stages.slice(0, 3).map(stage => (
          <Card key={stage.id} className="p-4">
            <p className="text-sm text-muted-foreground">{stage.name}</p>
            <p className="text-2xl font-bold" style={{ color: stage.color }}>
              {contacts.filter(c => c.stage_id === stage.id).length}
            </p>
          </Card>
        ))}
      </div>

      {/* Contacts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-sm">Contact</th>
                  <th className="text-left p-4 font-medium text-sm">Course</th>
                  <th className="text-left p-4 font-medium text-sm">Assigned To</th>
                  <th className="text-left p-4 font-medium text-sm">Stage</th>
                  <th className="text-left p-4 font-medium text-sm">Created</th>
                  <th className="text-right p-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.mobile}
                            </span>
                            {contact.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {contact.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{contact.course || '-'}</span>
                    </td>
                    <td className="p-4">
                      <LeadAssignmentSelector
                        contactId={contact.id}
                        currentAssignee={(contact as any).assigned_to}
                        onAssigned={fetchData}
                        compact
                      />
                    </td>
                    <td className="p-4">
                      <Select 
                        value={contact.stage_id || ''} 
                        onValueChange={(v) => updateContactStage(contact.id, v)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue>
                            {contact.stage ? (
                              <Badge style={{ backgroundColor: contact.stage.color }} className="text-white">
                                {contact.stage.name}
                              </Badge>
                            ) : 'No Stage'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {stages.map(stage => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                                {stage.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedContactId(contact.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.location.href = `tel:${contact.mobile}`}>
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const whatsappUrl = `https://wa.me/${contact.mobile.replace(/\D/g, '')}`;
                            window.open(whatsappUrl, '_blank');
                          }}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={async () => {
                              if (!confirm(`Delete ${contact.name}?`)) return;
                              try {
                                // Delete related data first
                                await Promise.allSettled([
                                  supabase.from('crm_activities').delete().eq('contact_id', contact.id),
                                  supabase.from('crm_tasks').delete().eq('contact_id', contact.id),
                                  supabase.from('lead_events').delete().eq('contact_id', contact.id),
                                ]);
                                const { error } = await supabase.from('crm_contacts').delete().eq('id', contact.id);
                                if (error) throw error;
                                toast({ title: 'Deleted', description: 'Contact removed' });
                                fetchData();
                              } catch (err) {
                                console.error(err);
                                toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
                              }
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount}
              </span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {paginatedContacts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No contacts found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Detail Panel */}
      {selectedContactId && (
        <LeadDetailPanel
          contactId={selectedContactId}
          stages={stages}
          universities={universities}
          onClose={() => setSelectedContactId(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
