import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Mail, Eye, MousePointerClick, MessageSquare, GraduationCap,
  CheckCircle2, Clock, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContactStats {
  total: number;
  clicked: number;
  opened: number;
  bounced: number;
  noEngagement: number;
  pushQueued: number;
  pushDone: number;
}

interface Props {
  campaign: Record<string, any>;
  contactStats: ContactStats;
}

// Pure computed - no contacts array, no filtering, zero memory pressure
export function FunnelAnalyticsPanel({ campaign, contactStats }: Props) {
  const stats = useMemo(() => {
    const total = campaign?.total_contacts || 0;
    const sent = campaign?.sent_count || 0;
    const delivered = campaign?.delivered_count || 0;
    const opened = campaign?.opened_count || 0;
    const clicked = campaign?.clicked_count || 0;
    const waSent = campaign?.whatsapp_sent || 0;
    const smsSent = campaign?.sms_sent || 0;
    const pushed = campaign?.pushed_to_university || 0;

    return {
      total, sent, delivered, opened, clicked, waSent, smsSent, pushed,
      openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0',
      clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : '0',
    };
  }, [campaign]);

  return (
    <div className="mb-6 space-y-4">
      {/* Funnel visualization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Campaign Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Emails Sent', value: stats.sent, total: stats.total, icon: Mail },
              { label: 'Delivered', value: stats.delivered, total: stats.sent, icon: Send },
              { label: 'Opened', value: stats.opened, total: stats.delivered, icon: Eye },
              { label: 'Clicked', value: stats.clicked, total: stats.delivered, icon: MousePointerClick },
              { label: 'Follow-ups Sent', value: stats.waSent + stats.smsSent, total: stats.opened + stats.clicked, icon: MessageSquare },
              { label: 'Pushed to University', value: stats.pushed, total: stats.clicked + stats.opened, icon: GraduationCap },
            ].map((step, i) => {
              const pct = step.total > 0 ? (step.value / step.total) * 100 : 0;
              return (
                <div key={i} className="flex items-center gap-3">
                  <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{step.label}</span>
                      <span className="font-bold">{step.value.toLocaleString()} <span className="text-muted-foreground font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open Rate', value: `${stats.openRate}%`, icon: Eye, color: 'text-amber-500' },
          { label: 'Click Rate', value: `${stats.clickRate}%`, icon: MousePointerClick, color: 'text-green-500' },
          { label: 'Ready to Push', value: contactStats.pushQueued.toLocaleString(), icon: Clock, color: 'text-orange-500' },
          { label: 'Already Pushed', value: contactStats.pushDone.toLocaleString(), icon: CheckCircle2, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <stat.icon className={cn('h-5 w-5 mx-auto mb-1', stat.color)} />
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact breakdown - from server-side counts, not client-side filtering */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contact Engagement Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-green-500">{contactStats.clicked.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Clicked</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-500">{contactStats.opened.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Opened Only</div>
            </div>
            <div>
              <div className="text-lg font-bold text-muted-foreground">{contactStats.noEngagement.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">No Engagement</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-500">{contactStats.bounced.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">Bounced</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(FunnelAnalyticsPanel);
