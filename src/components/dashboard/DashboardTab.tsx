import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { RefreshCw, Building2, CalendarDays, ChevronDown, ChevronUp, User, FileText, CheckCircle2, XCircle, Clock, Users, Search, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataRetentionNotice } from '@/components/ui/DataRetentionNotice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type DatePreset = 'today' | 'yesterday' | '7' | '14' | '30' | 'custom';

function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string) {
  const now = new Date();
  switch (preset) {
    case 'today': return { from: startOfDay(now), to: endOfDay(now), days: 1 };
    case 'yesterday': return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)), days: 1 };
    case '7': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now), days: 7 };
    case '14': return { from: startOfDay(subDays(now, 13)), to: endOfDay(now), days: 14 };
    case '30': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now), days: 30 };
    case 'custom': return {
      from: customFrom ? startOfDay(new Date(customFrom)) : startOfDay(subDays(now, 6)),
      to: customTo ? endOfDay(new Date(customTo)) : endOfDay(now),
      days: customFrom && customTo ? Math.ceil((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000) + 1 : 7,
    };
  }
}

const PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today', yesterday: 'Yesterday', '7': 'Last 7 Days', '14': 'Last 14 Days', '30': 'Last 30 Days', custom: 'Custom Range',
};

const PIE_COLORS = ['hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(45, 93%, 47%)', 'hsl(220, 70%, 50%)'];

// Helper to fetch all rows paginated (bypasses 1000 row limit)
async function fetchAllLeads(from: Date, to: Date, selectedUniId: string) {
  const allLeads: any[] = [];
  const PAGE_SIZE = 1000;
  let page = 0;
  let hasMore = true;

  const MAX_PAGES = 10; // Cap at 10,000 leads to prevent runaway queries
  while (hasMore && page < MAX_PAGES) {
    let query = supabase
      .from('leads')
      .select('id, status, created_at, university_id, user_id, retry_count, batch_id')
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (selectedUniId !== 'all') {
      query = query.eq('university_id', selectedUniId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    allLeads.push(...(data || []));
    hasMore = (data?.length || 0) === PAGE_SIZE;
    page++;
  }
  return allLeads;
}

function normalizeStatus(status: string | null) {
  const value = (status || '').toLowerCase();
  if (value === 'success') return 'success';
  if (value === 'duplicate') return 'duplicate';
  if (value === 'fail' || value === 'failed') return 'failed';
  if (value === 'cancelled') return 'cancelled';
  if (value === 'processing') return 'processing';
  return 'pending';
}
function isSuccess(status: string | null) {
  return normalizeStatus(status) === 'success';
}
function isFailed(status: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === 'failed' || normalized === 'duplicate';
}
function isPending(status: string | null) {
  const normalized = normalizeStatus(status);
  return normalized === 'pending' || normalized === 'processing';
}
function isCancelled(status: string | null) {
  return normalizeStatus(status) === 'cancelled';
}

export function DashboardTab() {
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedUniId, setSelectedUniId] = useState<string>('all');
  const [universities, setUniversities] = useState<{ id: string; name: string }[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedUserBatches, setExpandedUserBatches] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');
  const hasFetched = useRef(false);

  const [stats, setStats] = useState({ total: 0, success: 0, failed: 0, pending: 0, cancelled: 0, uniCount: 0, successRate: 0, avgPerDay: 0 });
  const [dailyTrends, setDailyTrends] = useState<any[]>([]);
  const [uniPerformance, setUniPerformance] = useState<any[]>([]);
  const [userPerformance, setUserPerformance] = useState<any[]>([]);

  const toggleUser = (id: string) => setExpandedUsers(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleUserBatch = (key: string) => setExpandedUserBatches(p => { const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to, days } = getDateRange(datePreset, customFrom, customTo);

      const [{ data: unis }, filtered, { data: profiles }, { data: batches }] = await Promise.all([
        supabase.from('universities').select('id, name'),
        fetchAllLeads(from, to, selectedUniId),
        supabase.from('profiles').select('id, email, full_name').limit(500),
        supabase.from('upload_batches').select('id, university_id, file_name, total_leads, success_count, fail_count, status, created_at, user_id'),
      ]);

      setUniversities(unis || []);
      const uniMap = new Map((unis || []).map(u => [u.id, u.name]));
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const batchMap = new Map((batches || []).map(b => [b.id, b]));

      const success = filtered.filter(l => isSuccess(l.status)).length;
      const failed = filtered.filter(l => isFailed(l.status)).length;
      const pending = filtered.filter(l => isPending(l.status)).length;
      const cancelled = filtered.filter(l => isCancelled(l.status)).length;
      const total = filtered.length;

      setStats({
        total, success, failed, pending, cancelled,
        uniCount: unis?.length || 0,
        successRate: total > 0 ? Math.round((success / total) * 100) : 0,
        avgPerDay: days > 0 ? Math.round(total / days) : 0,
      });

      // Daily trends
      const trends: any[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const day = subDays(to, i);
        const dStart = startOfDay(day);
        const dEnd = endOfDay(day);
        const dLeads = filtered.filter(l => { const d = new Date(l.created_at); return d >= dStart && d <= dEnd; });
        trends.push({
          date: format(day, days > 14 ? 'MMM dd' : 'EEE dd'),
          success: dLeads.filter(l => isSuccess(l.status)).length,
          failed: dLeads.filter(l => isFailed(l.status)).length,
          pending: dLeads.filter(l => isPending(l.status)).length,
          total: dLeads.length,
        });
      }
      setDailyTrends(trends);

      // University performance
      const uPerf = (unis || []).map(uni => {
        const uLeads = filtered.filter(l => l.university_id === uni.id);
        const s = uLeads.filter(l => isSuccess(l.status)).length;
        const f = uLeads.filter(l => isFailed(l.status)).length;
        const p = uLeads.filter(l => isPending(l.status)).length;
        const t = uLeads.length;
        return { id: uni.id, name: uni.name, total: t, success: s, failed: f, pending: p, successRate: t > 0 ? Math.round((s / t) * 100) : 0 };
      }).filter(u => u.total > 0).sort((a, b) => b.total - a.total);
      setUniPerformance(uPerf);

      // User performance with batch detail
      const userBatchMap = new Map<string, Map<string, any>>();
      for (const lead of filtered) {
        const userId = lead.user_id || 'unknown';
        if (!userBatchMap.has(userId)) userBatchMap.set(userId, new Map());
        const batchData = userBatchMap.get(userId)!;
        const bId = lead.batch_id || 'no-batch';
        if (!batchData.has(bId)) {
          const batch = batchMap.get(bId);
          batchData.set(bId, {
            batchId: bId, fileName: batch?.file_name || 'Single Lead',
            uniId: lead.university_id, uniName: uniMap.get(lead.university_id) || 'Unknown',
            total: 0, success: 0, failed: 0, pending: 0, retries: 0,
          });
        }
        const entry = batchData.get(bId)!;
        entry.total++;
        if (isSuccess(lead.status)) entry.success++;
        else if (isFailed(lead.status)) entry.failed++;
        else entry.pending++;
        entry.retries += (lead.retry_count || 0);
      }

      const uPerfs = Array.from(userBatchMap.entries()).map(([userId, bData]) => {
        const profile = profileMap.get(userId);
        const batchDetails = Array.from(bData.values()).sort((a: any, b: any) => b.total - a.total);
        const uniGroups = new Map<string, any>();
        for (const b of batchDetails) {
          if (!uniGroups.has(b.uniId)) {
            uniGroups.set(b.uniId, { uniId: b.uniId, uniName: b.uniName, total: 0, success: 0, failed: 0, pending: 0, retries: 0, batches: [] });
          }
          const g = uniGroups.get(b.uniId)!;
          g.total += b.total; g.success += b.success; g.failed += b.failed; g.pending += b.pending; g.retries += b.retries;
          g.batches.push(b);
        }
        const totals = batchDetails.reduce((a: any, b: any) => ({ total: a.total + b.total, success: a.success + b.success, failed: a.failed + b.failed, pending: a.pending + b.pending, retries: a.retries + b.retries }), { total: 0, success: 0, failed: 0, pending: 0, retries: 0 });
        return {
          userId, email: profile?.email || userId.slice(0, 8) + '...', fullName: profile?.full_name || '',
          ...totals, successRate: totals.total > 0 ? Math.round((totals.success / totals.total) * 100) : 0,
          universities: Array.from(uniGroups.values()).sort((a: any, b: any) => b.total - a.total),
        };
      }).sort((a, b) => b.total - a.total);
      setUserPerformance(uPerfs);
      hasFetched.current = true;
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [datePreset, customFrom, customTo, selectedUniId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredUsers = userSearch
    ? userPerformance.filter(u => u.email.toLowerCase().includes(userSearch.toLowerCase()) || u.fullName.toLowerCase().includes(userSearch.toLowerCase()))
    : userPerformance;

  if (loading && !hasFetched.current) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Success', value: stats.success },
    { name: 'Failed', value: stats.failed },
    { name: 'Pending', value: stats.pending },
    ...(stats.cancelled > 0 ? [{ name: 'Cancelled', value: stats.cancelled }] : []),
  ].filter(d => d.value > 0);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <DataRetentionNotice variant="banner" className="mb-2" />
      {/* Header + Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">Lead performance analytics • {PRESET_LABELS[datePreset]}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            {(['today', 'yesterday', '7', '14', '30'] as DatePreset[]).map(p => (
              <button key={p} onClick={() => setDatePreset(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${datePreset === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {PRESET_LABELS[p]}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${datePreset === 'custom' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <CalendarDays className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Custom Range</p>
                  <div className="grid gap-2">
                    <div><label className="text-xs text-muted-foreground">From</label>
                      <Input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setDatePreset('custom'); }} className="h-8 text-sm" /></div>
                    <div><label className="text-xs text-muted-foreground">To</label>
                      <Input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setDatePreset('custom'); }} className="h-8 text-sm" /></div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <select value={selectedUniId} onChange={e => setSelectedUniId(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm">
            <option value="all">All Universities</option>
            {universities.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Pushed</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stats.avgPerDay}/day avg</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.success.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-0.5 font-medium">{stats.successRate}% rate</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.failed.toLocaleString()}</p>
                <p className="text-xs text-red-600 mt-0.5 font-medium">{stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-red-500/20 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.pending.toLocaleString()}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Universities</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.uniCount}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Success Rate</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.successRate}%</p>
                <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${stats.successRate}%` }} />
                </div>
              </div>
              <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Lead Trends</CardTitle>
            <p className="text-xs text-muted-foreground">{PRESET_LABELS[datePreset]} • Success vs Failed vs Pending</p>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {dailyTrends.length > 0 && dailyTrends.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="success" fill="hsl(142, 76%, 36%)" name="Success" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="failed" fill="hsl(0, 84%, 60%)" name="Failed" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="pending" fill="hsl(45, 93%, 47%)" name="Pending" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data for selected period</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Status Distribution</CardTitle>
            <p className="text-xs text-muted-foreground">{PRESET_LABELS[datePreset]}</p>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
              )}
            </div>
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-muted-foreground">{d.name}: {d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* University Performance Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> University Performance
          </CardTitle>
          <p className="text-xs text-muted-foreground">{PRESET_LABELS[datePreset]} • Click a row to filter</p>
        </CardHeader>
        <CardContent>
          {uniPerformance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No university data for selected period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">University</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Total Pushed</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Success</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Failed</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Pending</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Success Rate</th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-32">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {uniPerformance.map(uni => (
                    <tr key={uni.id} className={`border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors ${selectedUniId === uni.id ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedUniId(uni.id === selectedUniId ? 'all' : uni.id)}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{uni.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">{uni.total}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-green-600">{uni.success}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-red-600">{uni.failed}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-yellow-600">{uni.pending}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`font-bold ${uni.successRate >= 80 ? 'text-green-600' : uni.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {uni.successRate}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${uni.successRate}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Tracking */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> User Activity Tracking
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{PRESET_LABELS[datePreset]} • Expand: User → University → File</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
              <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search user..." className="pl-8 h-8 w-48 text-sm" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No user activity for selected period</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-3 w-8"></th>
                    <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">User</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Success</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Failed</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Pending</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Retries</th>
                    <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <React.Fragment key={user.userId}>
                      <tr className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => toggleUser(user.userId)}>
                        <td className="py-2.5 px-3">
                          {expandedUsers.has(user.userId) ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.fullName || user.email}</p>
                              {user.fullName && <p className="text-xs text-muted-foreground">{user.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">{user.total}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-green-600">{user.success}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-red-600">{user.failed}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-yellow-600">{user.pending}</td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">{user.retries}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold ${user.successRate >= 80 ? 'text-green-600' : user.successRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {user.successRate}%
                          </span>
                        </td>
                      </tr>

                      {expandedUsers.has(user.userId) && user.universities.map((uni: any) => (
                        <React.Fragment key={`${user.userId}-${uni.uniId}`}>
                          <tr className="bg-muted/30 border-b border-border/30 cursor-pointer hover:bg-muted/50"
                            onClick={(e) => { e.stopPropagation(); toggleUserBatch(`${user.userId}-${uni.uniId}`); }}>
                            <td className="py-2 px-3"></td>
                            <td className="py-2 px-3 pl-10">
                              <div className="flex items-center gap-2">
                                {expandedUserBatches.has(`${user.userId}-${uni.uniId}`) ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-sm">{uni.uniName}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-semibold">{uni.total}</td>
                            <td className="py-2 px-3 text-right text-sm text-green-600">{uni.success}</td>
                            <td className="py-2 px-3 text-right text-sm text-red-600">{uni.failed}</td>
                            <td className="py-2 px-3 text-right text-sm text-yellow-600">{uni.pending}</td>
                            <td className="py-2 px-3 text-right text-sm text-muted-foreground">{uni.retries}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`text-sm font-medium ${(uni.total > 0 ? Math.round((uni.success / uni.total) * 100) : 0) >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                {uni.total > 0 ? Math.round((uni.success / uni.total) * 100) : 0}%
                              </span>
                            </td>
                          </tr>

                          {expandedUserBatches.has(`${user.userId}-${uni.uniId}`) && uni.batches.map((batch: any) => (
                            <tr key={`${user.userId}-${batch.batchId}`} className="bg-muted/15 border-b border-border/20">
                              <td className="py-1.5 px-3"></td>
                              <td className="py-1.5 px-3 pl-16">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-foreground">{batch.fileName}</span>
                                </div>
                              </td>
                              <td className="py-1.5 px-3 text-right text-xs font-medium">{batch.total}</td>
                              <td className="py-1.5 px-3 text-right text-xs text-green-600">{batch.success}</td>
                              <td className="py-1.5 px-3 text-right text-xs text-red-600">{batch.failed}</td>
                              <td className="py-1.5 px-3 text-right text-xs text-yellow-600">{batch.pending}</td>
                              <td className="py-1.5 px-3 text-right text-xs text-muted-foreground">{batch.retries}</td>
                              <td className="py-1.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full bg-green-500" style={{ width: `${batch.total > 0 ? (batch.success / batch.total) * 100 : 0}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{batch.total > 0 ? Math.round((batch.success / batch.total) * 100) : 0}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Need React import for React.Fragment
import React from 'react';

export default memo(DashboardTab);
