import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, ClipboardList, FileText, CheckSquare, Search,
  MoreVertical, Eye, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ApplicationManagementModule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('forms');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch lead capture forms from DB
  const { data: forms = [], isLoading: formsLoading } = useQuery({
    queryKey: ['lead-capture-forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_capture_forms')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch form submissions
  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['form-submissions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_submissions')
        .select('*, lead_capture_forms(name)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const totalForms = forms.length;
  const activeForms = forms.filter(f => f.is_active).length;
  const totalSubmissions = submissions.length;

  const filteredForms = forms.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSubs = submissions.filter(s => {
    const formName = (s as any).lead_capture_forms?.name || '';
    const subData = JSON.stringify(s.submission_data || {});
    return formName.toLowerCase().includes(searchTerm.toLowerCase()) || subData.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM Hub
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-indigo-500" /> Application Management
            </h1>
            <p className="text-muted-foreground">Manage lead capture forms and submissions</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total Forms</p>
          <p className="text-3xl font-bold text-blue-500">{totalForms}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Active Forms</p>
          <p className="text-3xl font-bold text-green-500">{activeForms}</p>
        </CardContent></Card>
        <Card><CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Total Submissions</p>
          <p className="text-3xl font-bold text-purple-500">{totalSubmissions}</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="forms" className="gap-1"><FileText className="h-4 w-4" /> Forms</TabsTrigger>
          <TabsTrigger value="submissions" className="gap-1"><CheckSquare className="h-4 w-4" /> Submissions</TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-3 my-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <TabsContent value="forms">
          {formsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredForms.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No forms yet</p>
              <p className="text-sm">Create lead capture forms from CRM → Lead Capture</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {filteredForms.map(form => (
                <Card key={form.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{form.name}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{form.submissions_count || 0} submissions</span>
                            <span>•</span>
                            <span>Created {new Date(form.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={form.is_active ? 'default' : 'secondary'}>
                        {form.is_active ? 'active' : 'inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions">
          {subsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredSubs.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No submissions yet</p>
            </CardContent></Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubs.slice(0, 50).map(sub => {
                    const subData = sub.submission_data as Record<string, any> || {};
                    const name = subData.name || subData.full_name || subData.email || 'Unknown';
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{(sub as any).lead_capture_forms?.name || 'Unknown Form'}</TableCell>
                        <TableCell>
                          <p className="text-sm">{name}</p>
                          <p className="text-xs text-muted-foreground">{subData.email || subData.mobile || ''}</p>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{sub.utm_source || 'Direct'}</Badge></TableCell>
                        <TableCell className="text-xs">{new Date(sub.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(ApplicationManagementModule);
