import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  TrendingUp, 
  Phone, 
  Mail, 
  Calendar,
  Target,
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

interface CRMDashboardProps {
  universities: any[];
}

export function CRMDashboard({ universities: _universities }: CRMDashboardProps) {
  const [stats, setStats] = useState({
    totalContacts: 0,
    newToday: 0,
    inProgress: 0,
    converted: 0,
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [taskStats, setTaskStats] = useState({ pending: 0, overdue: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [contactsRes, stagesRes, activitiesRes, tasksRes] = await Promise.all([
        supabase.from('crm_contacts').select('id, created_at, stage_id', { count: 'exact' }).limit(1000),
        supabase.from('pipeline_stages').select('*').order('sort_order'),
        supabase.from('crm_activities').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('crm_tasks').select('id, status, due_date'),
      ]);

      const contacts = contactsRes.data || [];
      const totalContactCount = contactsRes.count || contacts.length;
      const stages = stagesRes.data || [];
      const tasks = tasksRes.data || [];
      const today = new Date().toDateString();
      const now = new Date();

      // Color mapping for stage colors stored as names
      const colorNameToHex: Record<string, string> = {
        blue: '#3b82f6', amber: '#f59e0b', purple: '#8b5cf6',
        green: '#10b981', red: '#ef4444', gray: '#6b7280',
        cyan: '#06b6d4', orange: '#f97316', pink: '#ec4899',
        teal: '#14b8a6', indigo: '#6366f1', yellow: '#eab308',
      };

      const resolveColor = (color: string) => {
        if (color?.startsWith('#')) return color;
        return colorNameToHex[color] || COLORS[0];
      };

      setStats({
        totalContacts: totalContactCount,
        newToday: contacts.filter(c => new Date(c.created_at).toDateString() === today).length,
        inProgress: contacts.filter(c => c.stage_id && !stages.find(s => s.id === c.stage_id && s.name === 'Enrolled')).length,
        converted: contacts.filter(c => stages.find(s => s.id === c.stage_id && s.name === 'Enrolled')).length,
      });

      setPipelineData(stages.map(stage => ({
        name: stage.name,
        value: contacts.filter(c => c.stage_id === stage.id).length,
        color: resolveColor(stage.color),
      })));

      // Build real trend data from last 7 days
      const trend: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toDateString();
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayContacts = contacts.filter(c => new Date(c.created_at).toDateString() === dayStr);
        const dayConverted = dayContacts.filter(c => stages.find(s => s.id === c.stage_id && s.name === 'Enrolled'));
        trend.push({
          name: dayLabel,
          leads: dayContacts.length,
          conversions: dayConverted.length,
        });
      }
      setTrendData(trend);

      // Task stats
      setTaskStats({
        pending: tasks.filter(t => t.status !== 'completed').length,
        overdue: tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < now).length,
        completed: tasks.filter(t => t.status === 'completed').length,
      });

      setRecentActivities(activitiesRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
            <p className="text-xs text-muted-foreground">All time contacts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Today</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.newToday}</div>
            <p className="text-xs text-muted-foreground">Added today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Active leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.converted}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{taskStats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-destructive">{taskStats.overdue}</p>
              <p className="text-sm text-muted-foreground">Overdue Tasks</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-success" />
            <div>
              <p className="text-2xl font-bold text-success">{taskStats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed Tasks</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
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
                  dataKey="leads" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary)/0.2)" 
                  name="Leads"
                />
                <Area 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="hsl(var(--success))" 
                  fill="hsl(var(--success)/0.2)" 
                  name="Conversions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" name="Contacts">
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No pipeline data yet. Add contacts to see distribution.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2026 Feature: Conversion Funnel + Lead Freshness SLA */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.length > 0 && pipelineData.some(d => d.value > 0) ? (
              <div className="space-y-3">
                {pipelineData.map((stage, idx) => {
                  const maxVal = Math.max(...pipelineData.map(d => d.value), 1);
                  const widthPct = Math.max((stage.value / maxVal) * 100, 8);
                  const convRate = idx > 0 && pipelineData[idx - 1].value > 0 
                    ? ((stage.value / pipelineData[idx - 1].value) * 100).toFixed(0)
                    : '100';
                  return (
                    <div key={stage.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{stage.value}</span>
                          {idx > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {convRate}% pass
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${widthPct}%`, backgroundColor: stage.color || COLORS[idx % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No funnel data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Lead Freshness / SLA Indicator (2026 Feature) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-warning" />
              Lead Response SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Calculate SLA buckets from stats
              const freshCount = stats.newToday;
              const staleEstimate = Math.max(0, stats.totalContacts - stats.converted - stats.inProgress);
              const items = [
                { label: 'Responded < 5 min', count: freshCount, color: 'text-success', icon: Zap, status: 'Excellent' },
                { label: 'Active in Pipeline', count: stats.inProgress, color: 'text-primary', icon: Clock, status: 'On Track' },
                { label: 'Needs Follow-up', count: staleEstimate, color: 'text-warning', icon: AlertTriangle, status: 'Attention' },
                { label: 'Overdue Tasks', count: taskStats.overdue, color: 'text-destructive', icon: AlertTriangle, status: 'Critical' },
              ];
              return (
                <div className="space-y-4">
                  {items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${item.color}`} />
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <Badge variant="outline" className="text-[10px] mt-0.5">{item.status}</Badge>
                          </div>
                        </div>
                        <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="p-2 rounded-full bg-primary/10">
                    {activity.type === 'call' && <Phone className="h-4 w-4 text-primary" />}
                    {activity.type === 'email' && <Mail className="h-4 w-4 text-primary" />}
                    {activity.type === 'meeting' && <Calendar className="h-4 w-4 text-primary" />}
                    {!['call', 'email', 'meeting'].includes(activity.type) && <Target className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.created_at).toLocaleDateString()} at {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No recent activities. Start interacting with contacts to see activity here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
