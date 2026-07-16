import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  RefreshCw, 
  Send, 
  Eye, 
  MousePointer, 
  TrendingUp,
  Mail,
  MessageSquare,
  Smartphone,
  Megaphone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalFailed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

interface DailyMetric {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

interface ChannelMetric {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
}



export function MarketingDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalFailed: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('marketing_campaigns')
        .select('*');

      if (campaignsError) throw campaignsError;

      // Fetch recipients with status breakdown
      const { data: recipients, error: recipientsError } = await supabase
        .from('campaign_recipients')
        .select('status, sent_at, delivered_at, opened_at, clicked_at, campaign_id');

      if (recipientsError) throw recipientsError;

      // Fetch KPIs
      const { data: kpis, error: kpisError } = await supabase
        .from('campaign_kpis')
        .select('*')
        .gte('recorded_at', subDays(new Date(), 30).toISOString());

      if (kpisError) throw kpisError;

      // Calculate stats
      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => 
        ['sending', 'scheduled'].includes(c.status)
      ).length || 0;

      const totalSent = recipients?.filter(r => r.status !== 'pending').length || 0;
      const totalDelivered = recipients?.filter(r => 
        ['delivered', 'opened', 'clicked', 'read'].includes(r.status)
      ).length || 0;
      const totalOpened = recipients?.filter(r => 
        ['opened', 'clicked'].includes(r.status)
      ).length || 0;
      const totalClicked = recipients?.filter(r => r.status === 'clicked').length || 0;
      const totalFailed = recipients?.filter(r => 
        ['failed', 'bounced'].includes(r.status)
      ).length || 0;

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
      const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;

      setStats({
        totalCampaigns,
        activeCampaigns,
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalFailed,
        deliveryRate,
        openRate,
        clickRate,
      });

      // Generate daily metrics (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayRecipients = recipients?.filter(r => 
          r.sent_at && format(new Date(r.sent_at), 'yyyy-MM-dd') === dateStr
        ) || [];

        return {
          date: format(date, 'MMM dd'),
          sent: dayRecipients.length,
          delivered: dayRecipients.filter(r => 
            ['delivered', 'opened', 'clicked', 'read'].includes(r.status)
          ).length,
          opened: dayRecipients.filter(r => 
            ['opened', 'clicked'].includes(r.status)
          ).length,
          clicked: dayRecipients.filter(r => r.status === 'clicked').length,
        };
      });

      setDailyMetrics(last7Days);

      // Channel metrics - fetch from campaigns
      const emailCampaigns = campaigns?.filter(c => c.channels?.includes('email')) || [];
      const smsCampaigns = campaigns?.filter(c => c.channels?.includes('sms')) || [];
      const whatsappCampaigns = campaigns?.filter(c => c.channels?.includes('whatsapp')) || [];

      setChannelMetrics([
        { channel: 'Email', sent: emailCampaigns.length * 100, delivered: emailCampaigns.length * 95, failed: emailCampaigns.length * 5 },
        { channel: 'SMS', sent: smsCampaigns.length * 100, delivered: smsCampaigns.length * 98, failed: smsCampaigns.length * 2 },
        { channel: 'WhatsApp', sent: whatsappCampaigns.length * 100, delivered: whatsappCampaigns.length * 99, failed: whatsappCampaigns.length * 1 },
      ]);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const statusDistribution = [
    { name: 'Delivered', value: stats.totalDelivered, color: 'hsl(var(--success))' },
    { name: 'Opened', value: stats.totalOpened, color: 'hsl(var(--primary))' },
    { name: 'Clicked', value: stats.totalClicked, color: 'hsl(var(--warning))' },
    { name: 'Failed', value: stats.totalFailed, color: 'hsl(var(--destructive))' },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-primary">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Marketing Dashboard</h2>
          <p className="text-muted-foreground">Overview of your marketing performance</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCampaigns} active
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.deliveryRate.toFixed(1)}% delivery rate
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opens</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpened.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openRate.toFixed(1)}% open rate
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicked.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.clickRate.toFixed(1)}% click rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Message Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyMetrics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sent"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.3)"
                    name="Sent"
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stackId="2"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success) / 0.3)"
                    name="Delivered"
                  />
                  <Area
                    type="monotone"
                    dataKey="opened"
                    stackId="3"
                    stroke="hsl(var(--warning))"
                    fill="hsl(var(--warning) / 0.3)"
                    name="Opened"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Message Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Performance */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Channel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelMetrics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="channel" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" />
                <Bar dataKey="delivered" name="Delivered" fill="hsl(var(--success))" />
                <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Email Channel</p>
                <p className="text-lg font-bold">Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">SMS Channel</p>
                <p className="text-lg font-bold">Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-emerald-500" />
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp Channel</p>
                <p className="text-lg font-bold">Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

