import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Loader2, Zap, Mail, Eye, MousePointerClick, Send, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelCampaignBuilder } from './FunnelCampaignBuilder';

export function FunnelCampaignModule() {
  const navigate = useNavigate();
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['funnel-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (showBuilder || editingId) {
    return (
      <FunnelCampaignBuilder
        campaignId={editingId}
        onBack={() => { setShowBuilder(false); setEditingId(null); }}
      />
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    sending_email: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    tracking: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    sending_followup: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    pushing: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    completed: 'bg-green-500/10 text-green-600 border-green-500/20',
    paused: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM Hub
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-500" /> Funnel Campaign Engine
            </h1>
            <p className="text-muted-foreground">Email → Track Engagement → WhatsApp/SMS → Push to University</p>
          </div>
          <Button onClick={() => setShowBuilder(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Funnel Campaign
          </Button>
        </div>
      </div>

      {/* How it works */}
      <Card className="mb-6 border-dashed">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { icon: Mail, label: 'Send Bulk Email', desc: '100K contacts', color: 'text-blue-500' },
              { icon: Eye, label: 'Track Opens', desc: 'Who opened?', color: 'text-amber-500' },
              { icon: MousePointerClick, label: 'Track Clicks', desc: 'Who clicked?', color: 'text-green-500' },
              { icon: Send, label: 'Follow Up', desc: 'WA / SMS / Email', color: 'text-purple-500' },
              { icon: GraduationCap, label: 'Push to Uni', desc: 'Auto or manual', color: 'text-orange-500' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-1 relative">
                <step.icon className={cn('h-6 w-6', step.color)} />
                <span className="text-xs font-medium">{step.label}</span>
                <span className="text-[10px] text-muted-foreground">{step.desc}</span>
                {i < 4 && <div className="absolute right-0 top-3 translate-x-1/2 text-muted-foreground/40">→</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaigns list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">No funnel campaigns yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first campaign to send emails, track engagement, and push leads to universities</p>
            <Button onClick={() => setShowBuilder(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c: any) => (
            <Card key={c.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setEditingId(c.id)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge className={cn('text-xs', statusColors[c.status] || statusColors.draft)}>{c.status}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                {/* Funnel stats */}
                <div className="grid grid-cols-6 gap-3">
                  {[
                    { label: 'Sent', value: c.sent_count || 0, color: 'text-blue-500' },
                    { label: 'Delivered', value: c.delivered_count || 0, color: 'text-sky-500' },
                    { label: 'Opened', value: c.opened_count || 0, color: 'text-amber-500' },
                    { label: 'Clicked', value: c.clicked_count || 0, color: 'text-green-500' },
                    { label: 'Follow-ups', value: (c.whatsapp_sent || 0) + (c.sms_sent || 0), color: 'text-purple-500' },
                    { label: 'Pushed', value: c.pushed_to_university || 0, color: 'text-orange-500' },
                  ].map((s, i) => (
                    <div key={i} className="text-center">
                      <div className={cn('text-lg font-bold', s.color)}>{s.value.toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(FunnelCampaignModule);
