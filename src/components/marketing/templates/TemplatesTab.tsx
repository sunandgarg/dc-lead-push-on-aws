import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Mail, MessageSquare, Send } from 'lucide-react';
import { CreateTemplateModal } from './CreateTemplateModal';

export function TemplatesTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['marketing-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const channelIcons: Record<string, any> = {
    email: Mail,
    sms: MessageSquare,
    whatsapp: Send,
  };

  const channelCounts = {
    email: templates.filter((t: any) => t.channel === 'email').length,
    sms: templates.filter((t: any) => t.channel === 'sms').length,
    whatsapp: templates.filter((t: any) => t.channel === 'whatsapp').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Templates</h2>
          <p className="text-muted-foreground">Create and manage marketing templates</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(['email', 'sms', 'whatsapp'] as const).map((type) => {
          const Icon = channelIcons[type];
          return (
            <Card key={type} className="card-elevated cursor-pointer hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 capitalize">
                  <Icon className="h-5 w-5" />
                  {type} Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{channelCounts[type]} templates</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {templates.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No templates yet. Create your first template to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template: any) => {
            const Icon = channelIcons[template.channel] || FileText;
            return (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>
                      {template.status}
                    </Badge>
                  </div>
                  <h4 className="font-medium">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">{template.channel}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateTemplateModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
