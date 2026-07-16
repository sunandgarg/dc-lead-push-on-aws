import { memo, useMemo } from 'react';
import { CheckCircle2, XCircle, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PushResult } from './MultiPushView';

interface Props {
  results: PushResult[];
  universities: any[];
  totalLeads: number;
}

export const MultiPushReport = memo(function MultiPushReport({ results, universities, totalLeads }: Props) {
  const summary = useMemo(() => {
    const perUni: Record<string, { success: number; duplicate: number; fail: number; pending: number }> = {};
    universities.forEach((u) => {
      perUni[u.id] = { success: 0, duplicate: 0, fail: 0, pending: 0 };
    });
    results.forEach((r) => {
      if (perUni[r.universityId]) perUni[r.universityId][r.status]++;
    });
    return perUni;
  }, [results, universities]);

  const exportCsv = () => {
    const rows = [
      ['Row', 'Name', 'Email', 'Mobile', 'University', 'Status', 'Response'],
      ...results.map((r) => [
        String(r.rowIndex + 1),
        r.lead.name || '',
        r.lead.email || '',
        r.lead.mobile || '',
        r.universityName,
        r.status,
        (r.response || '').replace(/[\n\r,]/g, ' ').slice(0, 300),
      ]),
    ];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-push-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Push Report</CardTitle>
            <CardDescription>
              {totalLeads} leads × {universities.length} universities = {results.length} attempts
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Per-university summary */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {universities.map((u) => {
            const s = summary[u.id];
            return (
              <div key={u.id} className="border rounded-md p-3">
                <div className="font-medium text-sm truncate mb-2">{u.name}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">✓ {s.success}</Badge>
                  <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">↻ {s.duplicate}</Badge>
                  <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15">✗ {s.fail}</Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed table */}
        <ScrollArea className="h-96 border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>University</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs text-muted-foreground">{r.rowIndex + 1}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.lead.name}</div>
                    <div className="text-xs text-muted-foreground">{r.lead.email || r.lead.mobile}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.universityName}</TableCell>
                  <TableCell>
                    {r.status === 'success' && (
                      <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Success
                      </Badge>
                    )}
                    {r.status === 'duplicate' && (
                      <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/15">Duplicate</Badge>
                    )}
                    {r.status === 'fail' && (
                      <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15 gap-1">
                        <XCircle className="h-3 w-3" /> Fail
                      </Badge>
                    )}
                    {r.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-xs text-muted-foreground truncate" title={r.response}>
                      {r.response || '-'}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});
