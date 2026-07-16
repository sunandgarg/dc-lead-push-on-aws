import { useState, useEffect, memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, MousePointer2, Link2, Users, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const UrlAnalytics = memo(function UrlAnalytics() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [stats, setStats] = useState({
    totalUrls: 0,
    totalClicks: 0,
    activeUrls: 0,
  });
  const [clicksData, setClicksData] = useState<any[]>([]);
  const [topUrls, setTopUrls] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [countryData, setCountryData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);

      try {
        // Fetch URL stats
        const { data: urlsData } = await supabase
          .from('url_mappings')
          .select('id, clicks, is_active, created_at');

        const totalUrls = urlsData?.length || 0;
        const totalClicks = urlsData?.reduce((sum, u) => sum + u.clicks, 0) || 0;
        const activeUrls = urlsData?.filter(u => u.is_active).length || 0;
        setStats({ totalUrls, totalClicks, activeUrls });

        // Top performing URLs
        const topPerformers = [...(urlsData || [])]
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5);
        
        // Fetch titles for top URLs
        const topIds = topPerformers.map(u => u.id);
        const { data: urlDetails } = await supabase
          .from('url_mappings')
          .select('id, short_code, title, clicks')
          .in('id', topIds);
        
        setTopUrls(urlDetails || []);

        // Fetch click analytics
        const { data: clicks } = await supabase
          .from('url_clicks')
          .select('clicked_at, device_type, country')
          .gte('clicked_at', startDate.toISOString());

        // Process clicks over time
        const start = startOfDay(subDays(new Date(), days - 1));
        const end = startOfDay(new Date());
        const dayMap = new Map<string, number>();
        
        eachDayOfInterval({ start, end }).forEach(day => {
          dayMap.set(format(day, 'MMM d'), 0);
        });

        (clicks || []).forEach(click => {
          const day = format(new Date(click.clicked_at), 'MMM d');
          if (dayMap.has(day)) {
            dayMap.set(day, (dayMap.get(day) || 0) + 1);
          }
        });

        setClicksData(Array.from(dayMap.entries()).map(([name, clicks]) => ({ name, clicks })));

        // Device breakdown
        const deviceMap = new Map<string, number>();
        (clicks || []).forEach(click => {
          const device = click.device_type || 'Unknown';
          deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
        });
        setDeviceData(Array.from(deviceMap.entries()).map(([name, value]) => ({ name, value })));

        // Country breakdown
        const countryMap = new Map<string, number>();
        (clicks || []).forEach(click => {
          const country = click.country || 'Unknown';
          countryMap.set(country, (countryMap.get(country) || 0) + 1);
        });
        setCountryData(
          Array.from(countryMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, value]) => ({ name, value }))
        );

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Link2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total URLs</p>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalUrls}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <MousePointer2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalClicks}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active URLs</p>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{stats.activeUrls}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clicks Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Clicks Over Time</CardTitle>
          <CardDescription>Daily click trends for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={clicksData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top URLs and Device/Geo breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing URLs */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing URLs</CardTitle>
            <CardDescription>URLs with the most clicks</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : topUrls.length === 0 ? (
              <p className="text-muted-foreground text-sm">No URLs yet</p>
            ) : (
              <div className="space-y-3">
                {topUrls.map((url, i) => (
                  <div key={url.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-muted-foreground text-sm w-4">{i + 1}.</span>
                      <span className="font-mono text-sm truncate">/{url.short_code}</span>
                    </div>
                    <Badge variant="secondary">{url.clicks} clicks</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Breakdown</CardTitle>
            <CardDescription>Clicks by device type</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : deviceData.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={deviceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {deviceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>Top countries by clicks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : countryData.length === 0 ? (
            <p className="text-muted-foreground text-sm">No geographic data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={countryData} layout="vertical">
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

export default UrlAnalytics;
