import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  X, 
  Phone, 
  Mail, 
  MessageSquare, 
  Send,
  User,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  Zap,
  TrendingUp,
  Activity,
  History,
  StickyNote,
  ExternalLink,
  Copy,
  PhoneCall,
  PhoneOff,
  MessageCircle
} from 'lucide-react';
import { CommunicationPanel } from './CommunicationPanel';
import { LeadActivityTimeline } from './LeadActivityTimeline';
import { LeadCallLogger } from './LeadCallLogger';
import { LeadAssignmentSelector } from './LeadAssignmentSelector';

interface Stage {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  alternate_mobile: string | null;
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
  lead_score: number | null;
  lead_quality: string | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface LeadDetailPanelProps {
  contactId: string;
  stages: Stage[];
  universities: any[];
  onClose: () => void;
  onUpdate: () => void;
}

export function LeadDetailPanel({ 
  contactId, 
  stages, 
  universities, 
  onClose, 
  onUpdate 
}: LeadDetailPanelProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Contact>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const fetchContact = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;
      setContact(data);
      setEditData(data);
    } catch (error) {
      console.error('Error fetching contact:', error);
      toast({ title: 'Error', description: 'Failed to load contact', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [contactId, toast]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  const handleSave = async () => {
    if (!contact) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('crm_contacts')
        .update({
          ...editData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Contact updated successfully' });
      setIsEditing(false);
      fetchContact();
      onUpdate();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({ title: 'Error', description: 'Failed to update contact', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStageChange = async (stageId: string) => {
    if (!contact) return;

    try {
      const previousStage = stages.find(s => s.id === contact.stage_id);
      const newStage = stages.find(s => s.id === stageId);

      const { error } = await supabase
        .from('crm_contacts')
        .update({ 
          stage_id: stageId, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', contact.id);

      if (error) throw error;

      // Log activity
      await supabase.from('crm_activities').insert({
        contact_id: contact.id,
        type: 'stage_change',
        title: 'Stage Changed',
        description: `Moved from ${previousStage?.name || 'Unassigned'} to ${newStage?.name}`,
      });

      toast({ title: 'Success', description: 'Stage updated' });
      fetchContact();
      onUpdate();
    } catch (error) {
      console.error('Error updating stage:', error);
      toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
    }
  };

  const handlePushToUniversity = async () => {
    if (!contact) return;

    toast({ 
      title: 'Push to University', 
      description: 'Lead data will be pushed to the university API' 
    });

    // Log the push activity
    await supabase.from('crm_activities').insert({
      contact_id: contact.id,
      type: 'data_push',
      title: 'Pushed to University',
      description: `Lead data pushed to university API`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading contact...</div>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  const currentStage = stages.find(s => s.id === contact.stage_id);
  const currentUniversity = universities.find(u => u.id === contact.university_id);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="absolute inset-y-0 right-0 w-full max-w-4xl bg-background border-l shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{contact.name}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{contact.mobile}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5"
                  onClick={() => copyToClipboard(contact.mobile)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
          <Select 
            value={contact.stage_id || ''} 
            onValueChange={handleStageChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                {currentStage ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: currentStage.color }} 
                    />
                    {currentStage.name}
                  </div>
                ) : 'Select Stage'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {stages.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color }} 
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge 
            variant={contact.lead_quality === 'hot' ? 'destructive' : 
                    contact.lead_quality === 'warm' ? 'default' : 'secondary'}
          >
            <Zap className="h-3 w-3 mr-1" />
            Score: {contact.lead_score || 0}
          </Badge>

          <div className="flex-1" />

          <Button 
            variant="outline" 
            size="sm"
            onClick={handlePushToUniversity}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Push to University
          </Button>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="px-4 py-2 justify-start bg-transparent border-b rounded-none h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10">
              <User className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="communicate" className="data-[state=active]:bg-primary/10">
              <MessageSquare className="h-4 w-4 mr-2" />
              Communicate
            </TabsTrigger>
            <TabsTrigger value="activities" className="data-[state=active]:bg-primary/10">
              <Activity className="h-4 w-4 mr-2" />
              Activities
            </TabsTrigger>
            <TabsTrigger value="call" className="data-[state=active]:bg-primary/10">
              <Phone className="h-4 w-4 mr-2" />
              Call Log
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="p-4 space-y-6 m-0">
              <OverviewTab 
                contact={contact}
                editData={editData}
                setEditData={setEditData}
                isEditing={isEditing}
                currentUniversity={currentUniversity}
                universities={universities}
              />
            </TabsContent>

            <TabsContent value="communicate" className="p-4 m-0">
              <CommunicationPanel 
                contact={contact} 
                onActivityLogged={() => fetchContact()} 
              />
            </TabsContent>

            <TabsContent value="activities" className="p-4 m-0">
              <LeadActivityTimeline contactId={contact.id} />
            </TabsContent>

            <TabsContent value="call" className="p-4 m-0">
              <LeadCallLogger 
                contact={contact} 
                onCallLogged={() => fetchContact()} 
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ 
  contact, 
  editData, 
  setEditData, 
  isEditing,
  currentUniversity,
  universities 
}: {
  contact: Contact;
  editData: Partial<Contact>;
  setEditData: (data: Partial<Contact>) => void;
  isEditing: boolean;
  currentUniversity: any;
  universities: any[];
}) {
  return (
    <div className="grid gap-6">
      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Full Name</Label>
              {isEditing ? (
                <Input 
                  value={editData.name || ''} 
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.name}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Mobile</Label>
              {isEditing ? (
                <Input 
                  value={editData.mobile || ''} 
                  onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.mobile}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              {isEditing ? (
                <Input 
                  type="email"
                  value={editData.email || ''} 
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.email || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Alternate Mobile</Label>
              {isEditing ? (
                <Input 
                  value={editData.alternate_mobile || ''} 
                  onChange={(e) => setEditData({ ...editData, alternate_mobile: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.alternate_mobile || '-'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">City</Label>
              {isEditing ? (
                <Input 
                  value={editData.city || ''} 
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.city || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">State</Label>
              {isEditing ? (
                <Input 
                  value={editData.state || ''} 
                  onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.state || '-'}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Education Interest */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Education Interest
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Course</Label>
              {isEditing ? (
                <Input 
                  value={editData.course || ''} 
                  onChange={(e) => setEditData({ ...editData, course: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.course || '-'}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Specialization</Label>
              {isEditing ? (
                <Input 
                  value={editData.specialization || ''} 
                  onChange={(e) => setEditData({ ...editData, specialization: e.target.value })}
                />
              ) : (
                <p className="font-medium">{contact.specialization || '-'}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">University</Label>
            {isEditing ? (
              <Select 
                value={editData.university_id || ''} 
                onValueChange={(v) => setEditData({ ...editData, university_id: v })}
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
            ) : (
              <p className="font-medium">{currentUniversity?.name || '-'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea 
              value={editData.notes || ''} 
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              placeholder="Add notes about this contact..."
              rows={4}
            />
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {contact.notes || 'No notes added'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lead Assignment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LeadAssignmentSelector
            contactId={contact.id}
            currentAssignee={contact.assigned_to}
            onAssigned={() => {}}
          />
        </CardContent>
      </Card>

      {/* Lead Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Lead Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Source</span>
            <span className="font-medium">{contact.source || '-'}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Priority</span>
            <Badge variant={
              contact.priority === 'high' ? 'destructive' : 
              contact.priority === 'medium' ? 'default' : 'secondary'
            }>
              {contact.priority || 'medium'}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Created</span>
            <span className="text-sm">
              {new Date(contact.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Contacted</span>
            <span className="text-sm">
              {contact.last_contacted_at 
                ? new Date(contact.last_contacted_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Never'
              }
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
