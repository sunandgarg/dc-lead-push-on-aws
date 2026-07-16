import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus, Send, Clock, Eye, Smartphone, Monitor, Tablet, 
  Mail, Play, Pause, Trash2, Users, Calendar, Zap
} from 'lucide-react';
import DOMPurify from 'dompurify';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SMTPCampaign {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string | null;
  from_domain_id: string | null;
  status: string;
  send_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  tracking_enabled: boolean;
  created_at: string;
}

interface SMTPDomain {
  id: string;
  domain: string;
  from_email: string;
  from_name: string | null;
  verification_status: string;
}

interface SMTPTemplate {
  id: string;
  name: string;
  subject_line: string | null;
  html_content: string;
  variables: string[];
}

export function SMTPCampaignBuilder() {
  const [campaigns, setCampaigns] = useState<SMTPCampaign[]>([]);
  const [domains, setDomains] = useState<SMTPDomain[]>([]);
  const [templates, setTemplates] = useState<SMTPTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [selectedCampaign, setSelectedCampaign] = useState<SMTPCampaign | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    html_body: '',
    text_body: '',
    from_domain_id: '',
    template_id: '',
    send_at: '',
  });
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [campaignsRes, domainsRes, templatesRes] = await Promise.all([
        supabase.from('smtp_campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('smtp_domains').select('*').eq('verification_status', 'verified'),
        supabase.from('smtp_templates').select('*').order('name'),
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (domainsRes.error) throw domainsRes.error;
      if (templatesRes.error) throw templatesRes.error;

      setCampaigns(campaignsRes.data || []);
      setDomains(domainsRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        template_id: templateId,
        subject: template.subject_line || '',
        html_body: template.html_content,
      });
    }
  };

  const handleSave = async () => {
    try {
      const campaign = {
        name: formData.name,
        subject: formData.subject,
        html_body: formData.html_body,
        text_body: formData.text_body || null,
        from_domain_id: formData.from_domain_id || null,
        send_at: formData.send_at ? new Date(formData.send_at).toISOString() : null,
        status: formData.send_at ? 'scheduled' : 'draft',
      };

      const { error } = await supabase.from('smtp_campaigns').insert(campaign);

      if (error) throw error;
      toast({ title: 'Success', description: 'Campaign created!' });
      setShowCreateModal(false);
      setFormData({ name: '', subject: '', html_body: '', text_body: '', from_domain_id: '', template_id: '', send_at: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error saving campaign:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'sending') {
        updates.sent_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('smtp_campaigns')
        .update(updates)
        .eq('id', campaignId);

      if (error) throw error;
      toast({ title: 'Updated', description: `Campaign ${newStatus}` });
      fetchData();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('smtp_campaigns').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Campaign removed' });
      fetchData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      scheduled: 'bg-warning/20 text-warning',
      sending: 'bg-primary/20 text-primary',
      completed: 'bg-success/20 text-success',
      paused: 'bg-orange-100 text-orange-700',
      cancelled: 'bg-destructive/20 text-destructive',
    };
    return <Badge className={styles[status] || styles.draft}>{status}</Badge>;
  };

  const previewWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  if (loading) {
    return <div className="animate-pulse">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Email Campaigns</h2>
          <p className="text-muted-foreground">Create and manage SMTP email campaigns</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{campaigns.length}</p>
              </div>
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'scheduled').length}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sending</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'sending').length}</p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'completed').length}</p>
              </div>
              <Send className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card className="card-elevated">
        <CardContent className="p-0">
          {campaigns.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-2">No Campaigns Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first email campaign</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {campaign.total_recipients} recipients
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                        </span>
                        {campaign.send_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Scheduled: {format(new Date(campaign.send_at), 'MMM dd, HH:mm')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSelectedCampaign(campaign); setShowPreviewModal(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {campaign.status === 'draft' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'sending')}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                      {campaign.status === 'sending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(campaign.id, 'paused')}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="content" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="March Newsletter"
                />
              </div>

              <div className="space-y-2">
                <Label>Use Template</Label>
                <Select value={formData.template_id} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Your subject line with {{variables}}"
                />
              </div>

              <div className="space-y-2">
                <Label>HTML Content</Label>
                <Textarea
                  value={formData.html_body}
                  onChange={(e) => setFormData({ ...formData, html_body: e.target.value })}
                  placeholder="<html><body>Your email content...</body></html>"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label>Plain Text (fallback)</Label>
                <Textarea
                  value={formData.text_body}
                  onChange={(e) => setFormData({ ...formData, text_body: e.target.value })}
                  placeholder="Plain text version for email clients that don't support HTML"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>From Domain</Label>
                <Select value={formData.from_domain_id} onValueChange={(val) => setFormData({ ...formData, from_domain_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sending domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.from_name} &lt;{domain.from_email}&gt;
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {domains.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No verified domains. Please add and verify a domain first.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Schedule Send (optional)</Label>
                <Input
                  type="datetime-local"
                  value={formData.send_at}
                  onChange={(e) => setFormData({ ...formData, send_at: e.target.value })}
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty to save as draft
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.subject || !formData.html_body}>
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Email Preview: {selectedCampaign?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Button
              variant={previewDevice === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewDevice('desktop')}
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
            <Button
              variant={previewDevice === 'tablet' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewDevice('tablet')}
            >
              <Tablet className="h-4 w-4 mr-1" />
              Tablet
            </Button>
            <Button
              variant={previewDevice === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPreviewDevice('mobile')}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white" style={{ maxWidth: previewWidths[previewDevice], margin: '0 auto' }}>
            <div className="p-4 bg-muted border-b">
              <p className="text-sm"><strong>Subject:</strong> {selectedCampaign?.subject}</p>
            </div>
            <div 
              className="p-4"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedCampaign?.html_body || '') }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
