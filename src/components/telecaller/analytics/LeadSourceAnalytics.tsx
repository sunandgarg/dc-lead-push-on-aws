import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart3, Calendar } from 'lucide-react';

interface SourceData {
  source: string;
  total: number;
  untouched: number;
  closed: number;
  color: string;
}

const ALL_DATA: SourceData[] = [
  { source: 'Facebook Ads', total: 342, untouched: 45, closed: 187, color: '#3b82f6' },
  { source: 'Google Ads', total: 289, untouched: 32, closed: 164, color: '#ef4444' },
  { source: 'Custom Campaign', total: 198, untouched: 28, closed: 102, color: '#f59e0b' },
  { source: 'Walk-in', total: 156, untouched: 12, closed: 98, color: '#10b981' },
  { source: 'Website', total: 234, untouched: 56, closed: 89, color: '#8b5cf6' },
  { source: 'Referral', total: 87, untouched: 8, closed: 52, color: '#ec4899' },
  { source: 'WhatsApp', total: 145, untouched: 23, closed: 76, color: '#06b6d4' },
  { source: 'Organic', total: 112, untouched: 19, closed: 48, color: '#64748b' },
];

const DATE_RANGES = [
  { label: 'Today', multiplier: 0.05 },
  { label: 'Last 7 Days', multiplier: 0.3 },
  { label: 'This Month', multiplier: 1 },
];

export function LeadSourceAnalytics() {
  const [dateRange, setDateRange] = useState('This Month');

  const data = useMemo(() => {
    const range = DATE_RANGES.find(d => d.label === dateRange);
    const m = range?.multiplier || 1;
    return ALL_DATA.map(d => ({
      ...d,
      total: Math.round(d.total * m),
      untouched: Math.round(d.untouched * m),
      closed: Math.round(d.closed * m),
    }));
  }, [dateRange]);

  const totalLeads = data.reduce((s, d) => s + d.total, 0);
  const totalUntouched = data.reduce((s, d) => s + d.untouched, 0);
  const totalClosed = data.reduce((s, d) => s + d.closed, 0);

  const pieData = data.map(d => ({ name: d.source, value: d.total, color: d.color }));
  const barData = data.map(d => ({ name: d.source, Total: d.total, Untouched: d.untouched, Closed: d.closed }));

  return (
    <div className="space-y-4">
      {/* Date Filter & Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Source-Wise Lead Analytics</h2>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {DATE_RANGES.map(r => (
            <Button key={r.label} size="sm" variant={dateRange === r.label ? 'default' : 'outline'} onClick={() => setDateRange(r.label)}>
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-primary">{totalLeads}</p>
          <p className="text-sm text-muted-foreground">Total Leads</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{totalUntouched}</p>
          <p className="text-sm text-muted-foreground">Untouched</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{totalClosed}</p>
          <p className="text-sm text-muted-foreground">Closed</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Lead Volume by Source</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Source Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Closed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Untouched" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Source Breakdown</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Source Name</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Untouched</TableHead>
                <TableHead className="text-right">Closed</TableHead>
                <TableHead className="text-right">Conversion %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(d => (
                <TableRow key={d.source}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.source}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{d.total}</TableCell>
                  <TableCell className="text-right text-red-600">{d.untouched}</TableCell>
                  <TableCell className="text-right text-green-600">{d.closed}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {d.total > 0 ? ((d.closed / d.total) * 100).toFixed(1) : 0}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{totalLeads}</TableCell>
                <TableCell className="text-right text-red-600">{totalUntouched}</TableCell>
                <TableCell className="text-right text-green-600">{totalClosed}</TableCell>
                <TableCell className="text-right">
                  <Badge className="text-xs bg-primary/10 text-primary">
                    {totalLeads > 0 ? ((totalClosed / totalLeads) * 100).toFixed(1) : 0}%
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
