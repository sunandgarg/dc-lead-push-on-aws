import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Send, Calendar, Users, Mail, Smartphone, MessageSquare, 
  BarChart3, Play, Pause, Trash2, Copy, Eye, Settings, Clock,
  Beaker, Target, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { MarketingCampaign, CampaignStatus, ChannelType } from '@/types/marketing';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<CampaignStatus, { color: string; label: string }> = {
  draft: { color: 'bg-muted text-muted-foreground', label: 'Draft' },
  scheduled: { color: 'bg-blue-500/10 text-blue-500', label: 'Scheduled' },
  sending: { color: 'bg-yellow-500/10 text-yellow-500', label: 'Sending' },
  sent: { color: 'bg-green-500/10 text-green-500', label: 'Sent' },
  paused: { color: 'bg-orange-500/10 text-orange-500', label: 'Paused' },
  completed: { color: 'bg-green-500/10 text-green-500', label: 'Completed' },
  cancelled: { color: 'bg-red-500/10 text-red-500', label: 'Cancelled' },
  failed: { color: 'bg-red-500/10 text-red-500', label: 'Failed' },
};

const CHANNEL_ICONS: Record<ChannelType, any> = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageSquare,
};

export function CampaignBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    channels: ['email'] as ChannelType[],
    enableABTest: false,
  });

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*, marketing_templates(*)')
        .order('created_at', { ascending: false }) as any;
      if (error) throw error;
      return data as unknown as MarketingCampaign[];
    },
  });

  // Fetch templates for selection
  const { data: templates = [] } = useQuery({
    queryKey: ['marketing-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });

  // Create campaign
  const createCampaign = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const { data: result, error } = await supabase
        .from('marketing_campaigns')
        .insert([{
          name: data.name,
          description: data.description,
          channels: data.channels,
          status: 'draft',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          ab_test_config: data.enableABTest ? {
            enabled: true,
            variants: [],
            winner_criteria: 'open_rate',
            test_duration_hours: 24,
          } : null,
        } as any])
        .select()
        .single();
      if (error) throw error;
      return result as unknown as MarketingCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setShowCreateModal(false);
      setSelectedCampaign(data as MarketingCampaign);
      setNewCampaign({ name: '', description: '', channels: ['email'], enableABTest: false });
      toast({ title: 'Campaign created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating campaign', description: error.message, variant: 'destructive' });
    },
  });

  // Update campaign
  const updateCampaign = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MarketingCampaign> }) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast({ title: 'Campaign updated' });
    },
  });

  // Delete campaign
  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setSelectedCampaign(null);
      toast({ title: 'Campaign deleted' });
    },
  });

  const filteredCampaigns = campaigns.filter(c => {
    if (activeTab === 'all') return true;
    return c.status === activeTab;
  });

  const toggleChannel = (channel: ChannelType) => {
    setNewCampaign(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Campaign Manager</h2>
          <p className="text-muted-foreground">Create and manage multi-channel campaigns</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Summer Enrollment Campaign"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Describe your campaign goals..."
                />
              </div>
              <div>
                <Label className="mb-2 block">Channels</Label>
                <div className="flex gap-2">
                  {(['email', 'sms', 'whatsapp'] as ChannelType[]).map((channel) => {
                    const Icon = CHANNEL_ICONS[channel];
                    const isSelected = newCampaign.channels.includes(channel);
                    return (
                      <Button
                        key={channel}
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleChannel(channel)}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <Beaker className="h-4 w-4" />
                  <div>
                    <p className="text-sm font-medium">A/B Testing</p>
                    <p className="text-xs text-muted-foreground">Test different variants</p>
                  </div>
                </div>
                <Switch
                  checked={newCampaign.enableABTest}
                  onCheckedChange={(checked) => setNewCampaign({ ...newCampaign, enableABTest: checked })}
                />
              </div>
              <Button 
                onClick={() => createCampaign.mutate(newCampaign)} 
                disabled={!newCampaign.name || newCampaign.channels.length === 0 || createCampaign.isPending}
                className="w-full"
              >
                Create Campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'sending').length}</p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'scheduled').length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Recipients</p>
                <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + (c.recipient_count || 0), 0)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="draft">Drafts</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="sending">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground">Loading campaigns...</Card>
          ) : filteredCampaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No campaigns found</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredCampaigns.map((campaign) => (
                <Card 
                  key={campaign.id} 
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary',
                    selectedCampaign?.id === campaign.id && 'border-primary'
                  )}
                  onClick={() => setSelectedCampaign(campaign)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{campaign.name}</h3>
                          <Badge className={STATUS_CONFIG[campaign.status].color}>
                            {STATUS_CONFIG[campaign.status].label}
                          </Badge>
                          {campaign.ab_test_config?.enabled && (
                            <Badge variant="outline" className="gap-1">
                              <Beaker className="h-3 w-3" />
                              A/B Test
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            {campaign.channels.map(ch => {
                              const Icon = CHANNEL_ICONS[ch];
                              return <Icon key={ch} className="h-4 w-4 text-muted-foreground" />;
                            })}
                          </div>
                          <span className="text-muted-foreground">
                            <Users className="h-4 w-4 inline mr-1" />
                            {campaign.recipient_count || 0} recipients
                          </span>
                          {campaign.send_at && (
                            <span className="text-muted-foreground">
                              <Clock className="h-4 w-4 inline mr-1" />
                              {format(new Date(campaign.send_at), 'PPp')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.status === 'draft' && (
                          <>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button size="sm">
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          </>
                        )}
                        {campaign.status === 'sending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateCampaign.mutate({ id: campaign.id, updates: { status: 'paused' } });
                            }}
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCampaign.mutate(campaign.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
