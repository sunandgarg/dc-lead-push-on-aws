import { useState, useCallback } from 'react';
import { Download, FileDown, Filter, CheckCircle, XCircle, Clock, Building2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface University {
  id: string;
  name: string;
}

interface ConsolidatedLeadDownloadProps {
  universities: University[];
}

export function ConsolidatedLeadDownload({ universities }: ConsolidatedLeadDownloadProps) {
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ total: number; success: number; failed: number; duplicate: number } | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    if (!selectedUniversity) return;

    try {
      let query = supabase
        .from('upload_batches')
        .select('total_leads, success_count, fail_count, duplicate_count')
        .eq('university_id', selectedUniversity);

      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

      const { data, error } = await query;
      if (error) throw error;

      const total = (data || []).reduce((s, b) => s + (b.total_leads || 0), 0);
      const success = (data || []).reduce((s, b) => s + (b.success_count || 0), 0);
      const failed = (data || []).reduce((s, b) => s + (b.fail_count || 0), 0);
      const duplicate = (data || []).reduce((s, b) => s + (b.duplicate_count || 0), 0);

      setStats({ total, success, failed, duplicate });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [selectedUniversity, dateFrom, dateTo]);

  const handleDownload = async () => {
    if (!selectedUniversity) {
      toast({ title: 'Select University', description: 'Please select a university to download summary', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('upload_batches')
        .select('id, file_name, total_leads, success_count, fail_count, duplicate_count, status, created_at, completed_at')
        .eq('university_id', selectedUniversity)
        .order('created_at', { ascending: false });

      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

      const { data: batches, error } = await query;
      if (error) throw error;

      if (!batches || batches.length === 0) {
        toast({ title: 'No Data Found', description: 'No batches match your filter criteria', variant: 'default' });
        setLoading(false);
        return;
      }

      const universityName = universities.find(u => u.id === selectedUniversity)?.name || 'Unknown';
      const headers = ['Batch ID', 'File Name', 'Total Leads', 'Success', 'Failed', 'Duplicate', 'Status', 'Created At', 'Completed At'];
      const csvRows = [headers.join(',')];

      batches.forEach(batch => {
        const row = [
          `"${batch.id}"`,
          `"${(batch.file_name || '').replace(/"/g, '""')}"`,
          batch.total_leads,
          batch.success_count,
          batch.fail_count,
          batch.duplicate_count || 0,
          `"${batch.status}"`,
          `"${batch.created_at ? format(new Date(batch.created_at), 'yyyy-MM-dd HH:mm:ss') : ''}"`,
          `"${batch.completed_at ? format(new Date(batch.completed_at), 'yyyy-MM-dd HH:mm:ss') : ''}"`,
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);

      const dateStr = dateFrom && dateTo ? `${dateFrom}_to_${dateTo}` : format(new Date(), 'yyyy-MM-dd');
      const fileName = `${universityName.replace(/\s+/g, '_')}_batch_summary_${dateStr}.csv`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Download Complete', description: `Downloaded ${batches.length} batch records` });
    } catch (error) {
      console.error('Error downloading:', error);
      toast({ title: 'Download Failed', description: 'Failed to download. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary" />
          Consolidated Batch Summary
        </CardTitle>
        <CardDescription>
          Download batch-level summary for a university with date range filters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              University
            </Label>
            <Select value={selectedUniversity} onValueChange={(val) => { setSelectedUniversity(val); setStats(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select university" />
              </SelectTrigger>
              <SelectContent>
                {universities.map(uni => (
                  <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              From Date
            </Label>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setStats(null); }} className="input-field w-full" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              To Date
            </Label>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setStats(null); }} className="input-field w-full" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Actions
            </Label>
            <Button onClick={fetchStats} variant="outline" className="w-full" disabled={!selectedUniversity}>
              Preview Count
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Leads</p>
              <p className="text-xl font-bold">{stats.total.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Success</p>
              <p className="text-xl font-bold text-green-600">{stats.success.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-xl font-bold text-destructive">{stats.failed.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Duplicate</p>
              <p className="text-xl font-bold text-amber-600">{stats.duplicate.toLocaleString()}</p>
            </div>
          </div>
        )}

        <Button onClick={handleDownload} disabled={loading || !selectedUniversity} className="w-full" size="lg">
          {loading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Batch Summary CSV
            </>
          )}
        </Button>

        <p className="text-sm text-muted-foreground text-center">
          Downloads batch-level aggregates (success/fail/duplicate counts per upload)
        </p>
      </CardContent>
    </Card>
  );
}