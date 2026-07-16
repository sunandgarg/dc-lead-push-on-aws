import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Megaphone, Calendar, Users } from 'lucide-react';
import { CreateCampaignModal } from './CreateCampaignModal';
import { format } from 'date-fns';

export function CampaignsTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-500/10 text-gray-600',
    scheduled: 'bg-blue-500/10 text-blue-600',
    sending: 'bg-yellow-500/10 text-yellow-600',
    completed: 'bg-green-500/10 text-green-600',
    cancelled: 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Campaigns</h2>
          <p className="text-muted-foreground">Create and manage marketing campaigns</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="py-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No campaigns yet. Create your first campaign.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: any) => (
            <Card key={campaign.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Megaphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{campaign.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {campaign.channels?.join(', ')} • {campaign.recipient_count || 0} recipients
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {campaign.send_at && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(campaign.send_at), 'MMM d, yyyy')}
                      </span>
                    )}
                    <Badge className={statusColors[campaign.status] || statusColors.draft}>
                      {campaign.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateCampaignModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
}
