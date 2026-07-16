import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, 
  Upload, 
  Rocket, 
  Search, 
  Pencil, 
  Trash2, 
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MarketingLead {
  id: string;
  campaign_id: string | null;
  source_type: string;
  name: string | null;
  email: string | null;
  mobile: string | null;
  variables: any;
  status: string;
  pushed_to_university_id: string | null;
  pushed_at: string | null;
  push_response: string | null;
  created_at: string;
}

interface University {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
}

export function MarketingLeadsTab() {
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [isPushing, setIsPushing] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, unisRes, campaignsRes] = await Promise.all([
        supabase
          .from('marketing_leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('universities').select('id, name').order('name'),
        supabase.from('marketing_campaigns').select('id, name').order('name'),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      setLeads(leadsRes.data || []);
      setUniversities(unisRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch leads', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedLeads(newSelected);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (lead.mobile || '').includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const downloadLeads = (leadsToDownload: MarketingLead[]) => {
    const headers = ['Name', 'Email', 'Mobile', 'Status', 'Source', 'Created At'];
    const rows = leadsToDownload.map(lead => [
      lead.name || '',
      lead.email || '',
      lead.mobile || '',
      lead.status,
      lead.source_type,
      new Date(lead.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing_leads_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSelected = () => {
    const selected = leads.filter(l => selectedLeads.has(l.id));
    if (selected.length === 0) {
      toast({ title: 'No leads selected', variant: 'destructive' });
      return;
    }
    downloadLeads(selected);
    toast({ title: 'Success', description: `Downloaded ${selected.length} leads` });
  };

  const handleDownloadAll = () => {
    downloadLeads(filteredLeads);
    toast({ title: 'Success', description: `Downloaded ${filteredLeads.length} leads` });
  };

  const handlePushToUniversity = async () => {
    if (!selectedUniversity || selectedLeads.size === 0) {
      toast({ title: 'Select a university and leads', variant: 'destructive' });
      return;
    }

    setIsPushing(true);
    try {
      const selectedLeadData = leads.filter(l => selectedLeads.has(l.id));
      
      // Get university details
      const { data: uni } = await supabase
        .from('universities')
        .select('*')
        .eq('id', selectedUniversity)
        .single();

      if (!uni) throw new Error('University not found');

      // Create a batch for these leads
      const { data: batch, error: batchError } = await supabase
        .from('upload_batches')
        .insert({
          university_id: selectedUniversity,
          file_name: `Marketing Import - ${new Date().toISOString()}`,
          total_leads: selectedLeadData.length,
          status: 'processing',
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Insert leads into the main leads table
      const leadsToInsert = selectedLeadData.map(lead => ({
        university_id: selectedUniversity,
        batch_id: batch.id,
        name: lead.name || '',
        email: lead.email || '',
        mobile: lead.mobile || '',
        lead_source: uni.source,
        lead_medium: uni.medium,
        lead_campaign: uni.campaign,
        status: 'pending',
      }));

      const { error: insertError } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (insertError) throw insertError;

      // Update marketing leads status
      const { error: updateError } = await supabase
        .from('marketing_leads')
        .update({
          status: 'pushed',
          pushed_to_university_id: selectedUniversity,
          pushed_at: new Date().toISOString(),
        })
        .in('id', Array.from(selectedLeads));

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: `${selectedLeadData.length} leads queued for ${uni.name}`,
      });

      setShowPushModal(false);
      setSelectedLeads(new Set());
      fetchData();
    } catch (error) {
      console.error('Error pushing leads:', error);
      toast({ title: 'Error', description: 'Failed to push leads', variant: 'destructive' });
    } finally {
      setIsPushing(false);
    }
  };

  const handleBulkEdit = async () => {
    if (!bulkEditField || !bulkEditValue || selectedLeads.size === 0) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }

    try {
      const updates: Partial<MarketingLead> = {};
      if (bulkEditField === 'name') updates.name = bulkEditValue;
      if (bulkEditField === 'email') updates.email = bulkEditValue;
      if (bulkEditField === 'mobile') updates.mobile = bulkEditValue;
      if (bulkEditField === 'status') updates.status = bulkEditValue;

      const { error } = await supabase
        .from('marketing_leads')
        .update(updates)
        .in('id', Array.from(selectedLeads));

      if (error) throw error;

      toast({ title: 'Success', description: `Updated ${selectedLeads.size} leads` });
      setShowBulkEditModal(false);
      setBulkEditField('');
      setBulkEditValue('');
      fetchData();
    } catch (error) {
      console.error('Error updating leads:', error);
      toast({ title: 'Error', description: 'Failed to update leads', variant: 'destructive' });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) return;

    try {
      const { error } = await supabase
        .from('marketing_leads')
        .delete()
        .in('id', Array.from(selectedLeads));

      if (error) throw error;

      toast({ title: 'Success', description: `Deleted ${selectedLeads.size} leads` });
      setSelectedLeads(new Set());
      fetchData();
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast({ title: 'Error', description: 'Failed to delete leads', variant: 'destructive' });
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

      const nameIdx = headers.findIndex(h => ['name', 'full_name'].includes(h));
      const emailIdx = headers.findIndex(h => ['email', 'email_id'].includes(h));
      const mobileIdx = headers.findIndex(h => ['mobile', 'phone', 'contact'].includes(h));

      const newLeads = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length >= 1) {
          newLeads.push({
            name: nameIdx >= 0 ? values[nameIdx] : null,
            email: emailIdx >= 0 ? values[emailIdx] : null,
            mobile: mobileIdx >= 0 ? values[mobileIdx] : null,
            source_type: 'import',
            status: 'new',
          });
        }
      }

      if (newLeads.length > 0) {
        const { error } = await supabase.from('marketing_leads').insert(newLeads);
        if (error) {
          toast({ title: 'Error', description: 'Failed to import leads', variant: 'destructive' });
        } else {
          toast({ title: 'Success', description: `Imported ${newLeads.length} leads` });
          fetchData();
        }
      }

      setShowImportModal(false);
    };
    reader.readAsText(file);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="secondary">New</Badge>;
      case 'processed':
        return <Badge className="bg-blue-500/10 text-blue-500">Processed</Badge>;
      case 'pushed':
        return <Badge className="bg-green-500/10 text-green-500">Pushed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Lead Management</h2>
          <p className="text-muted-foreground">
            View, edit, and push leads from marketing campaigns to universities
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Leads from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a CSV file with columns: name, email, mobile
                </p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                />
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{leads.length}</p>
                <p className="text-sm text-muted-foreground">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'new').length}</p>
                <p className="text-sm text-muted-foreground">New</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'pushed').length}</p>
                <p className="text-sm text-muted-foreground">Pushed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{leads.filter(l => l.status === 'failed').length}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="pushed">Pushed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {selectedLeads.size > 0 && (
              <>
                <Button onClick={handleDownloadSelected} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Download ({selectedLeads.size})
                </Button>
                
                <Dialog open={showPushModal} onOpenChange={setShowPushModal}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Rocket className="h-4 w-4 mr-1" />
                      Push to University
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Push {selectedLeads.size} Leads</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={selectedUniversity} onValueChange={setSelectedUniversity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select University" />
                        </SelectTrigger>
                        <SelectContent>
                          {universities.map(uni => (
                            <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handlePushToUniversity}
                        disabled={isPushing || !selectedUniversity}
                        className="w-full"
                      >
                        {isPushing ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Rocket className="h-4 w-4 mr-2" />
                        )}
                        Push Leads
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Pencil className="h-4 w-4 mr-1" />
                      Bulk Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Edit {selectedLeads.size} Leads</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Select value={bulkEditField} onValueChange={setBulkEditField}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="mobile">Mobile</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                        </SelectContent>
                      </Select>
                      {bulkEditField === 'status' ? (
                        <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="processed">Processed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          placeholder="New value"
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                        />
                      )}
                      <Button onClick={handleBulkEdit} className="w-full">
                        Apply Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </>
            )}

            <Button onClick={handleDownloadAll} variant="ghost" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Download All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No leads found. Import leads or run a marketing campaign.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(lead.id)}
                        onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lead.name || '-'}</TableCell>
                    <TableCell>{lead.email || '-'}</TableCell>
                    <TableCell>{lead.mobile || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.source_type}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
