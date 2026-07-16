import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const KPI_CONFIG = [
  { key: 'processed', label: 'Processed', color: 'bg-blue-500', textColor: 'text-blue-600', chartColor: '#3b82f6' },
  { key: 'delivered', label: 'Delivered', color: 'bg-green-500', textColor: 'text-green-600', chartColor: '#22c55e' },
  { key: 'deferred', label: 'Deferred', color: 'bg-orange-500', textColor: 'text-orange-600', chartColor: '#f97316' },
  { key: 'open', label: 'Open', color: 'bg-pink-500', textColor: 'text-pink-600', chartColor: '#ec4899' },
  { key: 'click', label: 'Click', color: 'bg-emerald-500', textColor: 'text-emerald-600', chartColor: '#10b981' },
  { key: 'bounce', label: 'Bounce', color: 'bg-amber-500', textColor: 'text-amber-600', chartColor: '#f59e0b' },
  { key: 'spam_report', label: 'Spam Report', color: 'bg-red-500', textColor: 'text-red-600', chartColor: '#ef4444' },
  { key: 'block', label: 'Blocks', color: 'bg-yellow-600', textColor: 'text-yellow-700', chartColor: '#ca8a04' },
  { key: 'bounce_drop', label: 'Bounce Drops', color: 'bg-purple-500', textColor: 'text-purple-600', chartColor: '#a855f7' },
  { key: 'invalid', label: 'Invalid Emails', color: 'bg-teal-500', textColor: 'text-teal-600', chartColor: '#14b8a6' },
  { key: 'request', label: 'Requests', color: 'bg-orange-400', textColor: 'text-orange-500', chartColor: '#fb923c' },
  { key: 'unique_click', label: 'Unique Clicks', color: 'bg-violet-500', textColor: 'text-violet-600', chartColor: '#8b5cf6' },
  { key: 'unique_open', label: 'Unique Opens', color: 'bg-rose-500', textColor: 'text-rose-600', chartColor: '#f43f5e' },
  { key: 'unsubscribe', label: 'Unsubscribes', color: 'bg-red-600', textColor: 'text-red-700', chartColor: '#dc2626' },
];

const formatNumber = (n: number) => n.toLocaleString('en-IN');

export function EmailDashboard() {
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date>(endOfMonth(new Date()));
  const [selectedMetric, setSelectedMetric] = useState('processed');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(true);

  useEffect(() => {
    checkApiKey();
    fetchEvents();
  }, [fromDate, toDate]);

  const checkApiKey = async () => {
    const { data } = await supabase.from('email_api_settings').select('api_key').limit(1).single();
    setHasApiKey(!!(data?.api_key));
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_events')
      .select('event_type, received_at')
      .gte('received_at', fromDate.toISOString())
      .lte('received_at', toDate.toISOString());
    if (!error) setEvents(data || []);
    setLoading(false);
  };

  const kpiCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    KPI_CONFIG.forEach(k => counts[k.key] = 0);
    events.forEach(e => {
      if (counts[e.event_type] !== undefined) counts[e.event_type]++;
    });
    return counts;
  }, [events]);

  const chartData = useMemo(() => {
    const config = KPI_CONFIG.find(k => k.key === selectedMetric);
    if (!config) return [];
    const dayMap: Record<string, number> = {};
    events.filter(e => e.event_type === selectedMetric).forEach(e => {
      const day = format(new Date(e.received_at), 'yyyy-MM-dd');
      dayMap[day] = (dayMap[day] || 0) + 1;
    });
    return Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({
      date: format(new Date(date), 'MMM dd'),
      count,
    }));
  }, [events, selectedMetric]);

  const activeConfig = KPI_CONFIG.find(k => k.key === selectedMetric)!;

  if (!hasApiKey) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <p className="text-amber-800 dark:text-amber-200">Configure your Netcore API key in Settings to see live stats.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-foreground">Email Communication Stats</h3>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(fromDate, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={fromDate} onSelect={(d) => d && setFromDate(d)} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(toDate, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={toDate} onSelect={(d) => d && setToDate(d)} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {KPI_CONFIG.map((kpi) => (
          <Card
            key={kpi.key}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md border-2",
              selectedMetric === kpi.key ? "border-primary ring-2 ring-primary/20" : "border-transparent"
            )}
            onClick={() => setSelectedMetric(kpi.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-3 h-3 rounded-full", kpi.color)} />
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <p className={cn("text-2xl font-bold", kpi.textColor)}>
                {loading ? '...' : formatNumber(kpiCounts[kpi.key] || 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line Chart */}
      <Card>
        <CardContent className="p-6">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">
            {activeConfig.label} Trend
          </h4>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={activeConfig.chartColor} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {loading ? 'Loading...' : 'No data available for the selected period'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
