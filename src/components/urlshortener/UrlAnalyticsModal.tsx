import { useState, useEffect, memo, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';

interface UrlAnalyticsModalProps {
  url: {
    id: string;
    short_code: string;
    original_url: string;
    title: string | null;
    clicks: number;
  };
  open: boolean;
  onClose: () => void;
}

interface ClickData {
  clicked_at: string;
  referrer: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444'];

export const UrlAnalyticsModal = memo(function UrlAnalyticsModal({ url, open, onClose }: UrlAnalyticsModalProps) {
  const [clicks, setClicks] = useState<ClickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30'>('7');

  useEffect(() => {
    if (!open) return;
    
    const fetchClicks = async () => {
      setLoading(true);
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from('url_clicks')
        .select('clicked_at, referrer, country, city, device_type, browser')
        .eq('url_id', url.id)
        .gte('clicked_at', startDate.toISOString())
        .order('clicked_at', { ascending: false });

      if (!error) {
        setClicks(data || []);
      }
      setLoading(false);
    };

    fetchClicks();
  }, [open, url.id, dateRange]);

  // Clicks over time chart data
  const clicksOverTime = useMemo(() => {
    const days = parseInt(dateRange);
    const start = startOfDay(subDays(new Date(), days - 1));
    const end = startOfDay(new Date());
    
    const dayMap = new Map<string, number>();
    eachDayOfInterval({ start, end }).forEach(day => {
      dayMap.set(format(day, 'MMM d'), 0);
    });

    clicks.forEach(click => {
      const day = format(new Date(click.clicked_at), 'MMM d');
      if (dayMap.has(day)) {
        dayMap.set(day, (dayMap.get(day) || 0) + 1);
      }
    });

    return Array.from(dayMap.entries()).map(([name, clicks]) => ({ name, clicks }));
  }, [clicks, dateRange]);

  // Top referrers
  const topReferrers = useMemo(() => {
    const refMap = new Map<string, number>();
    clicks.forEach(click => {
      const ref = click.referrer ? new URL(click.referrer).hostname : 'Direct';
      refMap.set(ref, (refMap.get(ref) || 0) + 1);
    });
    return Array.from(refMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [clicks]);

  // Device breakdown
  const deviceBreakdown = useMemo(() => {
    const deviceMap = new Map<string, number>();
    clicks.forEach(click => {
      const device = click.device_type || 'Unknown';
      deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
    });
    return Array.from(deviceMap.entries())
      .map(([name, value]) => ({ name, value }));
  }, [clicks]);

  // Geographic distribution
  const geoDistribution = useMemo(() => {
    const geoMap = new Map<string, number>();
    clicks.forEach(click => {
      const location = click.country || 'Unknown';
      geoMap.set(location, (geoMap.get(location) || 0) + 1);
    });
    return Array.from(geoMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [clicks]);

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Analytics
          </DialogTitle>
          <DialogDescription className="break-all">
            {url.title || `${window.location.origin}/r/${url.short_code}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="7">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30">Last 30 Days</TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-6">
            {/* Total clicks */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Clicks</p>
                    <p className="text-3xl font-bold">{url.clicks}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {clicks.length} in {dateRange} days
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Clicks over time chart */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3">Clicks Over Time</p>
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={clicksOverTime}>
                      <XAxis dataKey="name" fontSize={12} tickLine={false} />
                      <YAxis fontSize={12} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Referrers and Devices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Referrers */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-3">Top Referrers</p>
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
                    </div>
                  ) : topReferrers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No referrer data</p>
                  ) : (
                    <div className="space-y-2">
                      {topReferrers.map((ref, i) => (
                        <div key={ref.name} className="flex items-center justify-between text-sm">
                          <span className="truncate">{ref.name}</span>
                          <Badge variant="secondary">{ref.value}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium mb-3">Devices</p>
                  {loading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : deviceBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No device data</p>
                  ) : (
                    <div className="space-y-2">
                      {deviceBreakdown.map((device, i) => (
                        <div key={device.name} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {getDeviceIcon(device.name)}
                            {device.name}
                          </span>
                          <Badge variant="secondary">{device.value}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Geographic Distribution */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Geographic Distribution
                </p>
                {loading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
                  </div>
                ) : geoDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No geographic data</p>
                ) : (
                  <div className="space-y-2">
                    {geoDistribution.map((geo, i) => (
                      <div key={geo.name} className="flex items-center justify-between text-sm">
                        <span>{geo.name}</span>
                        <Badge variant="secondary">{geo.value}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});

export default UrlAnalyticsModal;
