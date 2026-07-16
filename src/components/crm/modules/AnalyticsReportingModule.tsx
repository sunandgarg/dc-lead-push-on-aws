import { memo, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart3, TrendingUp, Users, Target, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const CHART_COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(210, 70%, 55%)',
];

export function AnalyticsReportingModule() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30d');

  const daysBack = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  // Fetch contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['crm-analytics-contacts', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('id, source, city, state, course, lead_score, lead_quality, stage_id, created_at, pipeline_stages(name)')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch activities count
  const { data: activitiesCount = 0 } = useQuery({
    queryKey: ['crm-analytics-activities', period],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('crm_activities')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since);
      if (error) throw error;
      return count || 0;
    },
  });

  // Compute source data
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach(c => { const s = c.source || 'Unknown'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, fill: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [contacts]);

  // Stage data
  const stageData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach(c => { const s = (c as any).pipeline_stages?.name || 'Unknown'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([stage, count]) => ({ stage, count }));
  }, [contacts]);

  // City data
  const cityData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach(c => { if (c.city) map[c.city] = (map[c.city] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, leads]) => ({ city, leads }));
  }, [contacts]);

  // State data
  const stateData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach(c => { if (c.state) map[c.state] = (map[c.state] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([state, leads]) => ({ state, leads }));
  }, [contacts]);

  // Daily trend
  const trendData = useMemo(() => {
    const map: Record<string, number> = {};
    contacts.forEach(c => {
      const day = new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).map(([date, leads]) => ({ date, leads }));
  }, [contacts]);

  const totalLeads = contacts.length;
  const hotLeads = contacts.filter(c => c.lead_quality === 'hot').length;
  const conversionRate = totalLeads > 0 ? ((hotLeads / totalLeads) * 100).toFixed(1) : '0';

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM Hub
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6 text-cyan-500" /> Analytics & Reporting</h1>
            <p className="text-muted-foreground">Real-time lead analytics and performance data</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Leads', value: totalLeads.toLocaleString(), icon: Users },
              { label: 'Hot Leads', value: hotLeads.toString(), icon: Target },
              { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp },
              { label: 'Activities', value: activitiesCount.toLocaleString(), icon: BarChart3 },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i}><CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent></Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Source Distribution</CardTitle></CardHeader>
              <CardContent>
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={sourceData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {sourceData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [value, 'Leads']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">No source data yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Stage Distribution</CardTitle></CardHeader>
              <CardContent>
                {stageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stageData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="stage" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="count" name="Leads" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">No stage data yet</p>}
              </CardContent>
            </Card>
          </div>

          {trendData.length > 0 && (
            <Card className="mb-6">
              <CardHeader><CardTitle className="text-lg">Lead Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">State-wise Leads</CardTitle></CardHeader>
              <CardContent>
                {stateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stateData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis dataKey="state" type="category" tick={{ fontSize: 11 }} width={100} className="fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="leads" name="Leads" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">No state data yet</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">City-wise Leads</CardTitle></CardHeader>
              <CardContent className="p-0">
                {cityData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">City</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Leads</th>
                    </tr></thead>
                    <tbody>
                      {cityData.map((c, i) => (
                        <tr key={i} className="border-b hover:bg-muted/20">
                          <td className="p-3 font-medium">{c.city}</td>
                          <td className="p-3 text-right">{c.leads}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <p className="text-center py-12 text-muted-foreground">No city data yet</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(AnalyticsReportingModule);
