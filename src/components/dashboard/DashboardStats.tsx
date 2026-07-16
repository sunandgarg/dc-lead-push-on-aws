import { memo } from 'react';
import { Users, CheckCircle2, XCircle, Clock, TrendingUp, Building2, Zap, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface DashboardStatsProps {
  stats: {
    totalLeads: number;
    successLeads: number;
    failedLeads: number;
    pendingLeads: number;
    totalUniversities: number;
    todayLeads: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const successRate = stats.totalLeads > 0 
    ? Math.round((stats.successLeads / stats.totalLeads) * 100) 
    : 0;

  const failureRate = stats.totalLeads > 0 
    ? Math.round((stats.failedLeads / stats.totalLeads) * 100) 
    : 0;

  // Determine health status
  const getHealthStatus = () => {
    if (successRate >= 90) return { label: 'Excellent', color: 'text-green-500', bg: 'bg-green-500' };
    if (successRate >= 70) return { label: 'Good', color: 'text-blue-500', bg: 'bg-blue-500' };
    if (successRate >= 50) return { label: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-500' };
    return { label: 'Needs Attention', color: 'text-red-500', bg: 'bg-red-500' };
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Hero Stats - The Most Important Numbers */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Leads - Big Number */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {stats.totalLeads.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  All leads in the system
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate - Visual Gauge */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-bold text-foreground">{successRate}%</p>
                  <span className={`text-xs font-medium ${health.color}`}>
                    {health.label}
                  </span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <Progress value={successRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>0%</span>
              <span>100%</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Activity */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Leads</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {stats.todayLeads.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Processed today
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Universities */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Universities</p>
                <p className="text-4xl font-bold text-foreground mt-1">
                  {stats.totalUniversities}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Active integrations
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown - Easy to Understand */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Status Breakdown</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Here's how your leads are distributed across different statuses
          </p>
          
          <div className="grid gap-4 md:grid-cols-3">
            {/* Success */}
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Successful</p>
                  <p className="text-2xl font-bold text-green-600">{stats.successLeads.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-green-500/20">
                  <div 
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${stats.totalLeads > 0 ? (stats.successLeads / stats.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-green-600">
                  {stats.totalLeads > 0 ? Math.round((stats.successLeads / stats.totalLeads) * 100) : 0}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ✓ These leads were sent successfully to universities
              </p>
            </div>

            {/* Failed */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failedLeads.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-red-500/20">
                  <div 
                    className="h-full rounded-full bg-red-500 transition-all duration-500"
                    style={{ width: `${stats.totalLeads > 0 ? (stats.failedLeads / stats.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-red-600">
                  {stats.totalLeads > 0 ? Math.round((stats.failedLeads / stats.totalLeads) * 100) : 0}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ✗ These leads failed to send - check API logs
              </p>
            </div>

            {/* Pending */}
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingLeads.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-yellow-500/20">
                  <div 
                    className="h-full rounded-full bg-yellow-500 transition-all duration-500"
                    style={{ width: `${stats.totalLeads > 0 ? (stats.pendingLeads / stats.totalLeads) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-yellow-600">
                  {stats.totalLeads > 0 ? Math.round((stats.pendingLeads / stats.totalLeads) * 100) : 0}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ⏳ Waiting to be processed
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default memo(DashboardStats);
