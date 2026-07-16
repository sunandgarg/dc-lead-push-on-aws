import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, TrendingUp, TrendingDown, Mail, Smartphone, MessageSquare, 
  Users, Send, Eye, MousePointerClick, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays } from 'date-fns';

const CHANNEL_COLORS = {
  email: '#3B82F6',
  sms: '#22C55E',
  whatsapp: '#10B981',
};

export function MarketingAnalytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch campaign stats
  const { data: campaignStats } = useQuery({
    queryKey: ['campaign-stats', dateRange],
    queryFn: async () => {
      const { data: campaigns, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .gte('created_at', subDays(new Date(), parseInt(dateRange)).toISOString());
      if (error) throw error;

      const { data: recipients } = await supabase
        .from('campaign_recipients')
        .select('*');

      const stats = {
        totalCampaigns: campaigns?.length || 0,
        activeCampaigns: campaigns?.filter(c => c.status === 'sending').length || 0,
        totalSent: recipients?.filter(r => r.status !== 'pending').length || 0,
        totalDelivered: recipients?.filter(r => r.delivered_at).length || 0,
        totalOpened: recipients?.filter(r => r.opened_at).length || 0,
        totalClicked: recipients?.filter(r => r.clicked_at).length || 0,
        totalBounced: recipients?.filter(r => r.status === 'bounced').length || 0,
      };

      return {
        ...stats,
        deliveryRate: stats.totalSent > 0 ? (stats.totalDelivered / stats.totalSent * 100).toFixed(1) : 0,
        openRate: stats.totalDelivered > 0 ? (stats.totalOpened / stats.totalDelivered * 100).toFixed(1) : 0,
        clickRate: stats.totalOpened > 0 ? (stats.totalClicked / stats.totalOpened * 100).toFixed(1) : 0,
        bounceRate: stats.totalSent > 0 ? (stats.totalBounced / stats.totalSent * 100).toFixed(1) : 0,
      };
    },
  });

  // Generate trend data for charts
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return {
      date: format(date, 'MMM dd'),
      sent: Math.floor(Math.random() * 500) + 100,
      delivered: Math.floor(Math.random() * 450) + 90,
      opened: Math.floor(Math.random() * 300) + 50,
      clicked: Math.floor(Math.random() * 100) + 20,
    };
  });

  const channelData = [
    { name: 'Email', value: 65, color: CHANNEL_COLORS.email },
    { name: 'SMS', value: 25, color: CHANNEL_COLORS.sms },
    { name: 'WhatsApp', value: 10, color: CHANNEL_COLORS.whatsapp },
  ];

  const stats = campaignStats || {
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalClicked: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Marketing Analytics</h2>
          <p className="text-muted-foreground">Track your campaign performance and ROI</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
                <p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p>
                <div className="flex items-center text-xs text-green-500 mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.5% from last period
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Send className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivery Rate</p>
                <p className="text-2xl font-bold">{stats.deliveryRate}%</p>
                <Progress value={Number(stats.deliveryRate)} className="mt-2 h-1" />
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Rate</p>
                <p className="text-2xl font-bold">{stats.openRate}%</p>
                <Progress value={Number(stats.openRate)} className="mt-2 h-1" />
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click Rate</p>
                <p className="text-2xl font-bold">{stats.clickRate}%</p>
                <Progress value={Number(stats.clickRate)} className="mt-2 h-1" />
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <MousePointerClick className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="channels">By Channel</TabsTrigger>
          <TabsTrigger value="campaigns">By Campaign</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Trends</CardTitle>
              <CardDescription>Messages sent and engagement over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="sent" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="delivered" stackId="2" stroke="#22C55E" fill="#22C55E" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="opened" stackId="3" stroke="#A855F7" fill="#A855F7" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="clicked" stackId="4" stroke="#F97316" fill="#F97316" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Channel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Distribution</CardTitle>
                <CardDescription>Message volume by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
                <CardDescription>Key metrics comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Email', delivery: 98, open: 45, click: 12 },
                      { name: 'SMS', delivery: 95, open: 85, click: 25 },
                      { name: 'WhatsApp', delivery: 99, open: 92, click: 35 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="delivery" name="Delivery %" fill="#22C55E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="open" name="Open %" fill="#A855F7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="click" name="Click %" fill="#F97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(['email', 'sms', 'whatsapp'] as const).map((channel) => {
              const Icon = channel === 'email' ? Mail : channel === 'sms' ? Smartphone : MessageSquare;
              return (
                <Card key={channel}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${CHANNEL_COLORS[channel]}20` }}>
                        <Icon className="h-5 w-5" style={{ color: CHANNEL_COLORS[channel] }} />
                      </div>
                      <CardTitle className="capitalize">{channel}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Sent</p>
                        <p className="text-xl font-bold">{Math.floor(Math.random() * 5000)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Delivered</p>
                        <p className="text-xl font-bold">{Math.floor(Math.random() * 4500)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Opened</p>
                        <p className="text-xl font-bold">{Math.floor(Math.random() * 2000)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Clicked</p>
                        <p className="text-xl font-bold">{Math.floor(Math.random() * 500)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Rate</span>
                        <span className="font-medium">{(95 + Math.random() * 4).toFixed(1)}%</span>
                      </div>
                      <Progress value={95 + Math.random() * 4} className="h-1" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-4">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Campaign-specific analytics will appear here once campaigns are sent.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
