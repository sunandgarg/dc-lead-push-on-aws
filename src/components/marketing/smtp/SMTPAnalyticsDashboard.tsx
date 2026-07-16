import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, Send, CheckCircle, Eye, MousePointer, XCircle, AlertTriangle,
  TrendingUp, TrendingDown, Globe, Users, PieChart as PieChartIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { format, subDays, subHours, startOfDay, startOfHour } from 'date-fns';

interface CampaignStats {
  id: string;
  name: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  spam: number;
  unsubscribed: number;
}

interface DomainStats {
  domain: string;
  sent: number;
  delivered: number;
  bounced: number;
  reputation: number;
}

interface TimeSeriesData {
  time: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

interface DeviceData {
  device: string;
  count: number;
}

export function SMTPAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState({
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalBounced: 0,
    totalFailed: 0,
    totalSpam: 0,
    totalUnsubscribed: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    spamRate: 0,
  });
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const [domainStats, setDomainStats] = useState<DomainStats[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);
  const [emailClientData, setEmailClientData] = useState<{ client: string; count: number }[]>([]);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Fetch email logs
      const daysAgo = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
      const startDate = subDays(new Date(), daysAgo).toISOString();

      const { data: emailLogs, error: logsError } = await supabase
        .from('smtp_email_logs')
        .select('*')
        .gte('created_at', startDate);

      if (logsError) throw logsError;

      const { data: trackingEvents, error: eventsError } = await supabase
        .from('smtp_tracking_events')
        .select('*')
        .gte('created_at', startDate);

      if (eventsError) throw eventsError;

      const { data: campaigns, error: campaignsError } = await supabase
        .from('smtp_campaigns')
        .select('id, name');

      if (campaignsError) throw campaignsError;

      const { data: domains, error: domainsError } = await supabase
        .from('smtp_domains')
        .select('id, domain, reputation_score');

      if (domainsError) throw domainsError;

      // Calculate overall stats - single pass
      const logs = emailLogs || [];
      let totalSent = 0, totalDelivered = 0, totalOpened = 0, totalClicked = 0, totalBounced = 0, totalFailed = 0, totalSpam = 0, totalUnsubscribed = 0;
      for (const l of logs) {
        if (l.status !== 'pending') totalSent++;
        if (['delivered', 'opened', 'clicked'].includes(l.status)) totalDelivered++;
        if (['opened', 'clicked'].includes(l.status)) totalOpened++;
        if (l.status === 'clicked') totalClicked++;
        if (l.status === 'bounced') totalBounced++;
        if (l.status === 'failed') totalFailed++;
        if (l.status === 'spam') totalSpam++;
        if (l.status === 'unsubscribed') totalUnsubscribed++;
      }

      setStats({
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        totalBounced,
        totalFailed,
        totalSpam,
        totalUnsubscribed,
        deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
        clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
        bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        spamRate: totalSent > 0 ? (totalSpam / totalSent) * 100 : 0,
      });

      // Campaign stats - group by campaign_id in one pass
      const campMap = new Map<string, { sent: number; delivered: number; opened: number; clicked: number; bounced: number; failed: number; spam: number; unsubscribed: number }>();
      for (const l of logs) {
        if (!l.campaign_id) continue;
        let c = campMap.get(l.campaign_id);
        if (!c) { c = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0, spam: 0, unsubscribed: 0 }; campMap.set(l.campaign_id, c); }
        if (l.status !== 'pending') c.sent++;
        if (['delivered', 'opened', 'clicked'].includes(l.status)) c.delivered++;
        if (['opened', 'clicked'].includes(l.status)) c.opened++;
        if (l.status === 'clicked') c.clicked++;
        if (l.status === 'bounced') c.bounced++;
        if (l.status === 'failed') c.failed++;
        if (l.status === 'spam') c.spam++;
        if (l.status === 'unsubscribed') c.unsubscribed++;
      }
      const campStats: CampaignStats[] = (campaigns || [])
        .filter(camp => campMap.has(camp.id) && (campMap.get(camp.id)!.sent > 0))
        .map(camp => ({ id: camp.id, name: camp.name, ...campMap.get(camp.id)! }));
      setCampaignStats(campStats);

      // Domain stats
      const domStats: DomainStats[] = (domains || []).map(dom => {
        const domLogs = logs.filter(l => l.domain_id === dom.id);
        return {
          domain: dom.domain,
          sent: domLogs.filter(l => l.status !== 'pending').length,
          delivered: domLogs.filter(l => ['delivered', 'opened', 'clicked'].includes(l.status)).length,
          bounced: domLogs.filter(l => l.status === 'bounced').length,
          reputation: dom.reputation_score || 100,
        };
      });
      setDomainStats(domStats);

      // Time series data
      const events = trackingEvents || [];
      const timeData: TimeSeriesData[] = [];
      const intervals = timeRange === '24h' ? 24 : 7;
      
      for (let i = intervals - 1; i >= 0; i--) {
        const intervalStart = timeRange === '24h' 
          ? startOfHour(subHours(new Date(), i))
          : startOfDay(subDays(new Date(), i));
        const intervalEnd = timeRange === '24h'
          ? startOfHour(subHours(new Date(), i - 1))
          : startOfDay(subDays(new Date(), i - 1));
        
        const intervalLogs = logs.filter(l => {
          const logDate = new Date(l.created_at);
          return logDate >= intervalStart && logDate < (i === 0 ? new Date() : intervalEnd);
        });

        timeData.push({
          time: timeRange === '24h' 
            ? format(intervalStart, 'HH:mm')
            : format(intervalStart, 'MMM dd'),
          sent: intervalLogs.filter(l => l.status !== 'pending').length,
          delivered: intervalLogs.filter(l => ['delivered', 'opened', 'clicked'].includes(l.status)).length,
          opened: intervalLogs.filter(l => ['opened', 'clicked'].includes(l.status)).length,
          clicked: intervalLogs.filter(l => l.status === 'clicked').length,
        });
      }
      setTimeSeriesData(timeData);

      // Device data from tracking events
      const devices: Record<string, number> = {};
      events.forEach(e => {
        const device = e.device_type || 'Unknown';
        devices[device] = (devices[device] || 0) + 1;
      });
      setDeviceData(Object.entries(devices).map(([device, count]) => ({ device, count })));

      // Email client data
      const clients: Record<string, number> = {};
      events.forEach(e => {
        const client = e.email_client || 'Unknown';
        clients[client] = (clients[client] || 0) + 1;
      });
      setEmailClientData(Object.entries(clients).map(([client, count]) => ({ client, count })));

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const statusDistribution = [
    { name: 'Delivered', value: stats.totalDelivered, color: 'hsl(var(--success))' },
    { name: 'Opened', value: stats.totalOpened, color: 'hsl(var(--primary))' },
    { name: 'Clicked', value: stats.totalClicked, color: 'hsl(var(--warning))' },
    { name: 'Bounced', value: stats.totalBounced, color: 'hsl(var(--destructive))' },
    { name: 'Failed', value: stats.totalFailed, color: '#666' },
  ].filter(item => item.value > 0);

  if (loading) {
    return <div className="animate-pulse text-center py-12">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">SMTP Analytics</h2>
          <p className="text-muted-foreground">Comprehensive email performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
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
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpened.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              {stats.openRate >= 20 ? (
                <TrendingUp className="h-3 w-3 text-success mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive mr-1" />
              )}
              <span className={stats.openRate >= 20 ? 'text-success' : 'text-destructive'}>
                {stats.openRate.toFixed(1)}% open rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClicked.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.clickRate.toFixed(1)}% CTR
            </p>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounces</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBounced.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              {stats.bounceRate <= 2 ? (
                <CheckCircle className="h-3 w-3 text-success mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 text-destructive mr-1" />
              )}
              <span className={stats.bounceRate <= 2 ? 'text-success' : 'text-destructive'}>
                {stats.bounceRate.toFixed(2)}% bounce rate
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-elevated border-l-4 border-l-success">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-xl font-bold text-success">{stats.totalDelivered.toLocaleString()}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-destructive">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-xl font-bold text-destructive">{stats.totalFailed.toLocaleString()}</p>
              </div>
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Spam Reports</p>
                <p className="text-xl font-bold text-orange-500">{stats.totalSpam.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-muted">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unsubscribed</p>
                <p className="text-xl font-bold">{stats.totalUnsubscribed.toLocaleString()}</p>
              </div>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Email Performance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="sent" name="Sent" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" />
                  <Area type="monotone" dataKey="delivered" name="Delivered" stackId="2" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.3)" />
                  <Area type="monotone" dataKey="opened" name="Opened" stackId="3" stroke="hsl(var(--warning))" fill="hsl(var(--warning) / 0.3)" />
                  <Area type="monotone" dataKey="clicked" name="Clicked" stackId="4" stroke="#8884d8" fill="rgba(136,132,216,0.3)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Email Status Distribution
            </CardTitle>
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
                    <Tooltip />
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

      {/* Device & Email Client */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Opens by Device</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {deviceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deviceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" />
                    <YAxis dataKey="device" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" name="Opens" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No device data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Opens by Email Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {emailClientData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emailClientData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" />
                    <YAxis dataKey="client" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" name="Opens" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No email client data yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      {campaignStats.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Campaign</th>
                    <th className="px-4 py-3 text-center font-medium">Sent</th>
                    <th className="px-4 py-3 text-center font-medium">Delivered</th>
                    <th className="px-4 py-3 text-center font-medium">Opened</th>
                    <th className="px-4 py-3 text-center font-medium">Clicked</th>
                    <th className="px-4 py-3 text-center font-medium">Bounced</th>
                    <th className="px-4 py-3 text-center font-medium">Open Rate</th>
                    <th className="px-4 py-3 text-center font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaignStats.map((camp) => {
                    const openRate = camp.delivered > 0 ? (camp.opened / camp.delivered) * 100 : 0;
                    const ctr = camp.opened > 0 ? (camp.clicked / camp.opened) * 100 : 0;
                    return (
                      <tr key={camp.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{camp.name}</td>
                        <td className="px-4 py-3 text-center">{camp.sent.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-success">{camp.delivered.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-primary">{camp.opened.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-warning">{camp.clicked.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-destructive">{camp.bounced.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={openRate >= 20 ? 'default' : 'secondary'}>
                            {openRate.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={ctr >= 3 ? 'default' : 'secondary'}>
                            {ctr.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Performance */}
      {domainStats.length > 0 && (
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domain Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {domainStats.map((dom) => (
                <div key={dom.domain} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{dom.domain}</h4>
                    <Badge variant={dom.reputation >= 90 ? 'default' : dom.reputation >= 70 ? 'secondary' : 'destructive'}>
                      {dom.reputation}% reputation
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Sent</p>
                      <p className="font-bold">{dom.sent}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Delivered</p>
                      <p className="font-bold text-success">{dom.delivered}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Bounced</p>
                      <p className="font-bold text-destructive">{dom.bounced}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
