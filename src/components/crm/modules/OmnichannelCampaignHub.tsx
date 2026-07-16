import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, MessageSquare, Phone, Mail, Send, Clock, Users,
  Smartphone, Image, Link2, Bold, Italic, Variable, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const TEMPLATES = {
  sms: [
    { id: '1', name: 'Welcome Message', content: 'Hi {{name}}, Welcome to {{college}}! Your inquiry has been received. Track: {{link}}' },
    { id: '2', name: 'Follow-up', content: 'Hi {{name}}, we noticed you were interested in {{course}}. Call us at {{phone}} for more info.' },
  ],
  whatsapp: [
    { id: '1', name: 'Admission Update', content: 'Hello {{name}} 👋\n\nYour application for {{course}} at {{college}} is being processed.\n\nStatus: {{status}}\nRef: {{ref_id}}\n\nFor queries, reply here or call {{phone}}' },
    { id: '2', name: 'Fee Reminder', content: 'Hi {{name}},\n\nThis is a reminder that your fee payment of ₹{{amount}} is due on {{date}}.\n\nPay now: {{link}}' },
  ],
  email: [
    { id: '1', name: 'Welcome Email', content: '<h2>Welcome {{name}}!</h2><p>Thank you for your interest in {{course}} at {{college}}.</p>' },
    { id: '2', name: 'Newsletter', content: '<h2>Monthly Update</h2><p>Hi {{name}}, here are the latest updates from {{college}}...</p>' },
  ],
};

export function OmnichannelCampaignHub() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState('sms');
  const [messageContent, setMessageContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [scheduleType, setScheduleType] = useState('now');
  const [scheduleDate, setScheduleDate] = useState('');

  // Fetch campaigns from DB
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['omni-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch segments for audience picker
  const { data: segments = [] } = useQuery({
    queryKey: ['omni-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_segments')
        .select('id, name, lead_count')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch contact count
  const { data: totalContacts = 0 } = useQuery({
    queryKey: ['omni-contact-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_contacts')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Save campaign mutation
  const saveCampaign = useMutation({
    mutationFn: async (status: string) => {
      if (!campaignName.trim()) throw new Error('Campaign name required');
      const { error } = await supabase.from('marketing_campaigns').insert({
        name: campaignName,
        channels: [activeChannel],
        status,
        description: messageContent,
        recipient_count: 0,
        send_at: scheduleType === 'scheduled' && scheduleDate ? new Date(scheduleDate).toISOString() : null,
        recurrence: scheduleType === 'recurring' ? 'daily' : null,
      });
      if (error) throw error;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['omni-campaigns'] });
      toast({ title: status === 'draft' ? 'Draft Saved' : 'Campaign Sent' });
      setCampaignName('');
      setMessageContent('');
      setSelectedTemplate('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleTemplateSelect = (templateId: string) => {
    const templates = TEMPLATES[activeChannel as keyof typeof TEMPLATES];
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessageContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const insertVariable = (variable: string) => {
    setMessageContent(prev => prev + `{{${variable}}}`);
  };

  const channelCampaigns = campaigns.filter(c => (c.channels as string[])?.includes(activeChannel));

  const channelStats = {
    totalSent: channelCampaigns.filter(c => c.status === 'sent' || c.status === 'completed').reduce((s, c) => s + (c.recipient_count || 0), 0),
    totalCampaigns: channelCampaigns.length,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM Hub
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Send className="h-6 w-6 text-purple-500" /> Omnichannel Campaign Hub
        </h1>
        <p className="text-muted-foreground">Bulk SMS, WhatsApp Campaigns & Email Broadcasts</p>
      </div>

      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList className="bg-card border border-border p-1 h-auto">
          <TabsTrigger value="sms" className="gap-2 px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Phone className="h-4 w-4" /> Bulk SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2 px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2 px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Mail className="h-4 w-4" /> Email
          </TabsTrigger>
        </TabsList>

        {['sms', 'whatsapp', 'email'].map(channel => (
          <TabsContent key={channel} value={channel} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Create Campaign</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Campaign Name</Label>
                      <Input placeholder="E.g., March Admission Drive" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
                    </div>

                    <div>
                      <Label>Template</Label>
                      <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                        <SelectTrigger><SelectValue placeholder="Choose a template or write custom" /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATES[channel as keyof typeof TEMPLATES].map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label>Message Content</Label>
                        <div className="flex gap-1">
                          {channel === 'email' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Bold className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Italic className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><Image className="h-3.5 w-3.5" /></Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Link2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                      <Textarea
                        rows={channel === 'email' ? 10 : 5}
                        placeholder={`Write your ${channel === 'sms' ? 'SMS' : channel === 'whatsapp' ? 'WhatsApp' : 'email'} message here...`}
                        value={messageContent}
                        onChange={e => setMessageContent(e.target.value)}
                        className="font-mono text-sm"
                      />
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground mr-1">Insert:</span>
                        {['name', 'course', 'college', 'link', 'phone', 'date'].map(v => (
                          <Button key={v} variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => insertVariable(v)}>
                            <Variable className="h-3 w-3 mr-1" />{`{{${v}}}`}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Target Audience</Label>
                        <Select value={targetAudience} onValueChange={setTargetAudience}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Contacts ({totalContacts.toLocaleString()})</SelectItem>
                            {segments.map(seg => (
                              <SelectItem key={seg.id} value={seg.id}>{seg.name} ({seg.lead_count || 0})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Schedule</Label>
                        <Select value={scheduleType} onValueChange={setScheduleType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="now">Send Now</SelectItem>
                            <SelectItem value="scheduled">Schedule for Later</SelectItem>
                            <SelectItem value="recurring">Recurring</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {scheduleType === 'scheduled' && (
                      <div>
                        <Label>Schedule Date & Time</Label>
                        <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
                      </div>
                    )}

                    <Card className="border-dashed">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Link2 className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">URL Builder / Shortener</span>
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Paste your long URL here..." className="flex-1" />
                          <Button size="sm">Shorten</Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1 gap-2"
                        disabled={saveCampaign.isPending}
                        onClick={() => saveCampaign.mutate(scheduleType === 'now' ? 'sent' : 'scheduled')}
                      >
                        {saveCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {scheduleType === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
                      </Button>
                      <Button variant="outline" disabled={saveCampaign.isPending} onClick={() => saveCampaign.mutate('draft')}>
                        Save as Draft
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Past Campaigns from DB */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">Recent Campaigns</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : channelCampaigns.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No campaigns yet for this channel</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead><tr className="border-b bg-muted/30">
                          <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Recipients</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                        </tr></thead>
                        <tbody>
                          {channelCampaigns.slice(0, 10).map(c => (
                            <tr key={c.id} className="border-b hover:bg-muted/20">
                              <td className="p-3 font-medium">{c.name}</td>
                              <td className="p-3">
                                <Badge className={cn("text-xs",
                                  (c.status === 'sent' || c.status === 'completed') && 'bg-green-500/10 text-green-600 border-green-500/20',
                                  c.status === 'scheduled' && 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                  c.status === 'draft' && 'bg-muted text-muted-foreground',
                                )}>{c.status}</Badge>
                              </td>
                              <td className="p-3">{(c.recipient_count || 0).toLocaleString()}</td>
                              <td className="p-3 text-muted-foreground">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : c.send_at ? new Date(c.send_at).toLocaleDateString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Mobile Preview */}
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" /> Mobile Preview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="mx-auto w-[260px] h-[480px] bg-muted/50 rounded-[2rem] border-4 border-foreground/20 p-3 flex flex-col">
                      <div className="flex items-center justify-center mb-2">
                        <div className="w-16 h-1.5 rounded-full bg-foreground/20" />
                      </div>
                      <div className="flex-1 bg-background rounded-xl p-3 overflow-y-auto">
                        {channel === 'sms' && (
                          <div className="space-y-2">
                            <div className="text-[10px] text-center text-muted-foreground">SMS Preview</div>
                            <div className="bg-primary/10 rounded-xl rounded-tl-none p-3 text-xs leading-relaxed">
                              {messageContent || 'Your SMS message will appear here...'}
                            </div>
                          </div>
                        )}
                        {channel === 'whatsapp' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 pb-2 border-b">
                              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-green-500" />
                              </div>
                              <div>
                                <p className="text-xs font-medium">Business Name</p>
                                <p className="text-[10px] text-muted-foreground">Online</p>
                              </div>
                            </div>
                            <div className="bg-green-500/10 rounded-xl rounded-tl-none p-3 text-xs leading-relaxed whitespace-pre-wrap">
                              {messageContent || 'Your WhatsApp message will appear here...'}
                            </div>
                          </div>
                        )}
                        {channel === 'email' && (
                          <div className="space-y-2">
                            <div className="text-[10px] text-center text-muted-foreground mb-2">Email Preview</div>
                            <div className="border rounded-lg p-2">
                              <p className="text-[10px] text-muted-foreground">From: noreply@college.edu</p>
                              <p className="text-[10px] text-muted-foreground">Subject: {campaignName || 'Campaign Subject'}</p>
                              <div className="border-t mt-1 pt-2 text-xs leading-relaxed whitespace-pre-wrap">
                                {messageContent || 'Your email content will appear here...'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Channel Stats</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: 'Total Campaigns', value: channelStats.totalCampaigns.toLocaleString() },
                      { label: 'Total Recipients', value: channelStats.totalSent.toLocaleString() },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        <span className="text-sm font-bold">{stat.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default memo(OmnichannelCampaignHub);
