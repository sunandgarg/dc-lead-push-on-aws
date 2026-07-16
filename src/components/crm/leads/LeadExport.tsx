import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

interface LeadExportProps {
  universities: any[];
  stages: any[];
}

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Name', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'mobile', label: 'Mobile', default: true },
  { key: 'city', label: 'City', default: true },
  { key: 'state', label: 'State', default: true },
  { key: 'course', label: 'Course', default: true },
  { key: 'specialization', label: 'Specialization', default: false },
  { key: 'source', label: 'Source', default: true },
  { key: 'lead_score', label: 'Lead Score', default: false },
  { key: 'lead_quality', label: 'Lead Quality', default: false },
  { key: 'priority', label: 'Priority', default: false },
  { key: 'notes', label: 'Notes', default: false },
  { key: 'created_at', label: 'Created Date', default: true },
];

export function LeadExport({ universities, stages }: LeadExportProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    EXPORT_COLUMNS.filter(c => c.default).map(c => c.key)
  );
  const [universityFilter, setUniversityFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let query = supabase.from('crm_contacts').select('*');
      
      if (universityFilter !== 'all') {
        query = query.eq('university_id', universityFilter);
      }
      if (stageFilter !== 'all') {
        query = query.eq('stage_id', stageFilter);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(5000);
      
      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: 'No Data', description: 'No leads found matching the filters', variant: 'destructive' });
        return;
      }

      // Build CSV
      const headers = selectedColumns.map(key => 
        EXPORT_COLUMNS.find(c => c.key === key)?.label || key
      );

      const rows = data.map(contact => 
        selectedColumns.map(key => {
          let value = (contact as any)[key];
          if (key === 'created_at' && value) {
            value = new Date(value).toLocaleDateString();
          }
          // Escape CSV values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        })
      );

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Success', description: `Exported ${data.length} leads` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'Failed to export leads', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Leads
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">University Filter</label>
            <Select value={universityFilter} onValueChange={setUniversityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All universities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Universities</SelectItem>
                {universities.map(uni => (
                  <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Stage Filter</label>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {stages.map(stage => (
                  <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Column Selection */}
        <div>
          <label className="text-sm font-medium mb-3 block">Select Columns to Export</label>
          <div className="grid grid-cols-3 gap-3">
            {EXPORT_COLUMNS.map(col => (
              <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedColumns.includes(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                />
                <span className="text-sm">{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Export Button */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">Export to CSV</p>
              <p className="text-sm text-muted-foreground">{selectedColumns.length} columns selected</p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={exporting || selectedColumns.length === 0}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
