import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Calendar,
  AlertCircle,
  LogOut,
  Home,
  History,
  BarChart3,
  Search,
  ChevronRight,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  course: string | null;
  stage_id: string | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  stage?: { id: string; name: string; color: string };
}

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface CallLog {
  id: string;
  title: string;
  outcome: string | null;
  duration_minutes: number | null;
  created_at: string;
}

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'no_answer', label: 'No Answer', icon: PhoneMissed, color: 'text-yellow-600' },
  { value: 'busy', label: 'Busy', icon: PhoneOff, color: 'text-orange-600' },
  { value: 'wrong_number', label: 'Wrong Number', icon: XCircle, color: 'text-red-600' },
  { value: 'voicemail', label: 'Voicemail', icon: MessageSquare, color: 'text-blue-600' },
  { value: 'callback_requested', label: 'Callback', icon: Calendar, color: 'text-purple-600' },
  { value: 'interested', label: 'Interested', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'not_interested', label: 'Not Interested', icon: AlertCircle, color: 'text-gray-600' },
];

export default function TelecallerApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'stats'>('home');
  const [leads, setLeads] = useState<Contact[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Contact | null>(null);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callData, setCallData] = useState({ outcome: '', duration: '', notes: '', nextFollowUp: '' });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  // Stats
  const [stats, setStats] = useState({ todayCalls: 0, connected: 0, pending: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, stagesRes] = await Promise.all([
        supabase
          .from('crm_contacts')
          .select('*')
          .order('next_follow_up', { ascending: true, nullsFirst: false })
          .limit(100),
        supabase.from('pipeline_stages').select('*').order('sort_order')
      ]);

      const leadsWithStages = (leadsRes.data || []).map(lead => ({
        ...lead,
        stage: stagesRes.data?.find(s => s.id === lead.stage_id)
      }));

      setLeads(leadsWithStages);
      setStages(stagesRes.data || []);

      // Calculate today's stats
      const today = new Date().toISOString().split('T')[0];
      const { data: todayLogs } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('type', 'call')
        .gte('created_at', today);

      const connected = todayLogs?.filter(l => l.outcome === 'connected' || l.outcome === 'interested').length || 0;
      
      setStats({
        todayCalls: todayLogs?.length || 0,
        connected,
        pending: leadsWithStages.filter(l => !l.last_contacted_at).length
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCallHistory = useCallback(async () => {
    const today = new Date();
    today.setDate(today.getDate() - 7);
    
    const { data } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('type', 'call')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
    
    setCallLogs(data || []);
  }, []);

  useEffect(() => {
    fetchData();
    fetchCallHistory();
  }, [fetchData, fetchCallHistory]);

  const initiateCall = (lead: Contact) => {
    setSelectedLead(lead);
    window.location.href = `tel:${lead.mobile}`;
    setCallModalOpen(true);
  };

  const handleSaveCallLog = async () => {
    if (!selectedLead || !callData.outcome) {
      toast({ title: 'Error', description: 'Please select call outcome', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const outcome = CALL_OUTCOMES.find(o => o.value === callData.outcome);
      
      await supabase.from('crm_activities').insert({
        contact_id: selectedLead.id,
        type: 'call',
        title: `Call: ${outcome?.label || callData.outcome}`,
        description: callData.notes || null,
        outcome: callData.outcome,
        duration_minutes: callData.duration ? parseInt(callData.duration) : null,
        metadata: { 
          mobile: selectedLead.mobile,
          next_follow_up: callData.nextFollowUp || null,
          called_from: 'mobile_app'
        },
      });

      const updateData: Record<string, any> = { 
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (callData.nextFollowUp) {
        updateData.next_follow_up = callData.nextFollowUp;
      }

      await supabase
        .from('crm_contacts')
        .update(updateData)
        .eq('id', selectedLead.id);

      toast({ title: 'Success', description: 'Call logged successfully' });
      setCallData({ outcome: '', duration: '', notes: '', nextFollowUp: '' });
      setCallModalOpen(false);
      setSelectedLead(null);
      fetchData();
      fetchCallHistory();
    } catch (error) {
      console.error('Error saving call log:', error);
      toast({ title: 'Error', description: 'Failed to save call log', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStageChange = async (contactId: string, stageId: string) => {
    try {
      await supabase
        .from('crm_contacts')
        .update({ stage_id: stageId, updated_at: new Date().toISOString() })
        .eq('id', contactId);

      const stage = stages.find(s => s.id === stageId);
      await supabase.from('crm_activities').insert({
        contact_id: contactId,
        type: 'stage_change',
        title: `Stage changed to ${stage?.name}`,
      });

      toast({ title: 'Updated', description: 'Lead stage updated' });
      fetchData();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.mobile.includes(searchTerm)
  );

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Telecaller CRM</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchData} className="text-primary-foreground">
              <RefreshCw className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-primary-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'home' && (
          <div className="h-full flex flex-col">
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30">
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-primary">{stats.todayCalls}</p>
                <p className="text-xs text-muted-foreground">Today's Calls</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.connected}</p>
                <p className="text-xs text-muted-foreground">Connected</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </Card>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Leads List */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No leads found</div>
                ) : (
                  filteredLeads.map(lead => (
                    <Card key={lead.id} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold truncate">{lead.name}</p>
                            {lead.stage && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs"
                                style={{ backgroundColor: lead.stage.color, color: 'white' }}
                              >
                                {lead.stage.name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{lead.mobile}</p>
                          {lead.course && (
                            <p className="text-xs text-muted-foreground">{lead.course}</p>
                          )}
                          {lead.next_follow_up && (
                            <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              Follow-up: {new Date(lead.next_follow_up).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Button 
                          onClick={() => initiateCall(lead)}
                          className="bg-green-600 hover:bg-green-700 h-12 w-12 rounded-full p-0"
                        >
                          <Phone className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      {/* Quick Stage Update */}
                      <div className="mt-2 pt-2 border-t">
                        <Select 
                          value={lead.stage_id || ''} 
                          onValueChange={(v) => handleStageChange(lead.id, v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Update Stage" />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map(stage => (
                              <SelectItem key={stage.id} value={stage.id}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: stage.color }} 
                                  />
                                  {stage.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {activeTab === 'history' && (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <h2 className="font-semibold text-lg mb-4">Call History (Last 7 Days)</h2>
              {callLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No call history</p>
              ) : (
                callLogs.map(log => {
                  const outcomeInfo = CALL_OUTCOMES.find(o => o.value === log.outcome);
                  const Icon = outcomeInfo?.icon || Phone;
                  return (
                    <Card key={log.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-muted ${outcomeInfo?.color || ''}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{log.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                            {log.duration_minutes && (
                              <span>• {log.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}

        {activeTab === 'stats' && (
          <div className="p-4">
            <h2 className="font-semibold text-lg mb-4">My Statistics</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <Phone className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-3xl font-bold">{stats.todayCalls}</p>
                <p className="text-sm text-muted-foreground">Today's Calls</p>
              </Card>
              <Card className="p-4 text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-3xl font-bold">{stats.connected}</p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </Card>
              <Card className="p-4 text-center">
                <AlertCircle className="h-8 w-8 mx-auto text-orange-500 mb-2" />
                <p className="text-3xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Leads</p>
              </Card>
              <Card className="p-4 text-center">
                <BarChart3 className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                <p className="text-3xl font-bold">
                  {stats.todayCalls > 0 ? Math.round((stats.connected / stats.todayCalls) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Connect Rate</p>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 bg-background border-t">
        <div className="grid grid-cols-3">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-3 ${activeTab === 'home' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Leads</span>
          </button>
          <button
            onClick={() => { setActiveTab('history'); fetchCallHistory(); }}
            className={`flex flex-col items-center py-3 ${activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <History className="h-5 w-5" />
            <span className="text-xs mt-1">History</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center py-3 ${activeTab === 'stats' ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs mt-1">Stats</span>
          </button>
        </div>
      </nav>

      {/* Call Log Modal */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-green-600" />
              Log Call: {selectedLead?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Call Outcome *</Label>
              <div className="grid grid-cols-2 gap-2">
                {CALL_OUTCOMES.map(outcome => {
                  const Icon = outcome.icon;
                  return (
                    <Button
                      key={outcome.value}
                      variant={callData.outcome === outcome.value ? 'default' : 'outline'}
                      className="justify-start h-auto py-2"
                      onClick={() => setCallData({ ...callData, outcome: outcome.value })}
                    >
                      <Icon className={`h-4 w-4 mr-2 ${outcome.color}`} />
                      <span className="text-xs">{outcome.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={callData.duration}
                onChange={(e) => setCallData({ ...callData, duration: e.target.value })}
                placeholder="e.g., 5"
              />
            </div>

            <div>
              <Label>Schedule Follow-up</Label>
              <Input
                type="datetime-local"
                value={callData.nextFollowUp}
                onChange={(e) => setCallData({ ...callData, nextFollowUp: e.target.value })}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={callData.notes}
                onChange={(e) => setCallData({ ...callData, notes: e.target.value })}
                placeholder="What was discussed?"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setCallModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCallLog}
                disabled={isSaving || !callData.outcome}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save Log'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
