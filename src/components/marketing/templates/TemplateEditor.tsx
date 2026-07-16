import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Mail, Smartphone, MessageSquare, FileText, Copy, 
  Trash2, Edit2, Eye, CheckCircle, AlertCircle, Code, Palette
} from 'lucide-react';
import { ChannelType, TemplateStatus, MarketingTemplate } from '@/types/marketing';
import { cn } from '@/lib/utils';

const CHANNEL_CONFIG = {
  email: { icon: Mail, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  sms: { icon: Smartphone, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  whatsapp: { icon: MessageSquare, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
};

const VARIABLE_TOKENS = [
  { token: '{{name}}', description: 'Contact name' },
  { token: '{{email}}', description: 'Contact email' },
  { token: '{{mobile}}', description: 'Contact mobile' },
  { token: '{{company_name}}', description: 'Your company name' },
  { token: '{{course}}', description: 'Course name' },
  { token: '{{university}}', description: 'University name' },
];

export function TemplateEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelType>('email');
  const [previewMode, setPreviewMode] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    channel: 'email' as ChannelType,
    subject_line: '',
    content: '',
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['marketing-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as MarketingTemplate[];
    },
  });

  // Create template
  const createTemplate = useMutation({
    mutationFn: async (data: typeof newTemplate) => {
      const content = data.channel === 'email' 
        ? { blocks: [{ id: '1', type: 'text', content: { text: data.content }, styles: {} }] }
        : data.channel === 'sms'
        ? { message: data.content }
        : { type: 'text', body: data.content };

      const { data: result, error } = await supabase
        .from('marketing_templates')
        .insert([{
          name: data.name,
          type: data.channel,
          channel: data.channel,
          content,
          subject_line: data.subject_line || null,
          variables: extractVariables(data.content),
          status: 'draft',
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      setShowCreateModal(false);
      setNewTemplate({ name: '', channel: 'email', subject_line: '', content: '' });
      toast({ title: 'Template created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating template', description: error.message, variant: 'destructive' });
    },
  });

  // Update template status
  const updateTemplateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TemplateStatus }) => {
      const { error } = await supabase
        .from('marketing_templates')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      toast({ title: 'Template updated' });
    },
  });

  // Delete template
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      setSelectedTemplate(null);
      toast({ title: 'Template deleted' });
    },
  });

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{[^}]+\}\}/g) || [];
    return [...new Set(matches)];
  };

  const insertVariable = (token: string) => {
    setNewTemplate(prev => ({
      ...prev,
      content: prev.content + token,
    }));
  };

  const filteredTemplates = templates.filter(t => t.channel === activeChannel);

  const getContentText = (template: MarketingTemplate): string => {
    const content = template.content as any;
    if (template.channel === 'email') {
      return content?.blocks?.[0]?.content?.text || '';
    } else if (template.channel === 'sms') {
      return content?.message || '';
    } else {
      return content?.body || '';
    }
  };

  const getStatusBadge = (status: TemplateStatus) => {
    const config = {
      draft: { variant: 'secondary' as const, icon: Edit2 },
      active: { variant: 'default' as const, icon: CheckCircle },
      archived: { variant: 'outline' as const, icon: AlertCircle },
    };
    const { variant, icon: Icon } = config[status] || config.draft;
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Template Manager</h2>
          <p className="text-muted-foreground">Create and manage message templates</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="Welcome Email"
                  />
                </div>
                <div>
                  <Label>Channel</Label>
                  <Select
                    value={newTemplate.channel}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, channel: v as ChannelType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newTemplate.channel === 'email' && (
                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={newTemplate.subject_line}
                    onChange={(e) => setNewTemplate({ ...newTemplate, subject_line: e.target.value })}
                    placeholder="Welcome to {{company_name}}!"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Content</Label>
                  <div className="flex gap-1">
                    {VARIABLE_TOKENS.slice(0, 4).map((v) => (
                      <Button
                        key={v.token}
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => insertVariable(v.token)}
                      >
                        {v.token.replace(/[{}]/g, '')}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="Hi {{name}}, welcome to our platform!"
                  rows={6}
                />
                {newTemplate.channel === 'sms' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {newTemplate.content.length}/160 characters
                  </p>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <p className="w-full text-xs text-muted-foreground">Available variables:</p>
                {VARIABLE_TOKENS.map((v) => (
                  <Badge 
                    key={v.token} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => insertVariable(v.token)}
                  >
                    <Code className="h-3 w-3 mr-1" />
                    {v.token}
                  </Badge>
                ))}
              </div>

              <Button 
                onClick={() => createTemplate.mutate(newTemplate)} 
                disabled={!newTemplate.name || !newTemplate.content || createTemplate.isPending}
                className="w-full"
              >
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Channel Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {(['email', 'sms', 'whatsapp'] as ChannelType[]).map((channel) => {
          const config = CHANNEL_CONFIG[channel];
          const Icon = config.icon;
          const count = templates.filter(t => t.channel === channel).length;
          const activeCount = templates.filter(t => t.channel === channel && t.status === 'active').length;
          
          return (
            <Card 
              key={channel}
              className={cn(
                'cursor-pointer transition-all hover:border-primary',
                activeChannel === channel && 'border-primary ring-1 ring-primary'
              )}
              onClick={() => setActiveChannel(channel)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', config.bgColor)}>
                    <Icon className={cn('h-5 w-5', config.color)} />
                  </div>
                  <div>
                    <p className="font-medium capitalize">{channel}</p>
                    <p className="text-sm text-muted-foreground">
                      {count} templates • {activeCount} active
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Template List */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {isLoading ? (
              <Card className="p-8 text-center text-muted-foreground">Loading templates...</Card>
            ) : filteredTemplates.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No {activeChannel} templates yet</p>
              </Card>
            ) : (
              filteredTemplates.map((template) => {
                const config = CHANNEL_CONFIG[template.channel];
                const Icon = config.icon;
                
                return (
                  <Card 
                    key={template.id}
                    className={cn(
                      'cursor-pointer transition-all hover:border-primary',
                      selectedTemplate?.id === template.id && 'border-primary'
                    )}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', config.bgColor)}>
                            <Icon className={cn('h-5 w-5', config.color)} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{template.name}</h4>
                              {getStatusBadge(template.status)}
                            </div>
                            {template.subject_line && (
                              <p className="text-sm text-muted-foreground mb-1">
                                Subject: {template.subject_line}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {getContentText(template)}
                            </p>
                            {template.variables && template.variables.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {template.variables.slice(0, 3).map((v, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {v}
                                  </Badge>
                                ))}
                                {template.variables.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{template.variables.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate.mutate(template.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{selectedTemplate.channel}</Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newStatus = selectedTemplate.status === 'active' ? 'draft' : 'active';
                        updateTemplateStatus.mutate({ id: selectedTemplate.id, status: newStatus as TemplateStatus });
                      }}
                    >
                      {selectedTemplate.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                  
                  {selectedTemplate.channel === 'email' && (
                    <div className="p-4 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                      <p className="font-medium">{selectedTemplate.subject_line || 'No subject'}</p>
                    </div>
                  )}
                  
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="whitespace-pre-wrap text-sm">{getContentText(selectedTemplate)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Variables used:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.variables?.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                      {(!selectedTemplate.variables || selectedTemplate.variables.length === 0) && (
                        <p className="text-xs text-muted-foreground">No variables</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a template to preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
