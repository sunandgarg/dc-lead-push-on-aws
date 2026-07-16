import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload,
  FileSpreadsheet,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileDown
} from 'lucide-react';

interface BulkLeadImportProps {
  universities: any[];
  stages: any[];
  onImportComplete: () => void;
}

interface ParsedLead {
  name: string;
  email: string;
  mobile: string;
  city?: string;
  state?: string;
  course?: string;
  specialization?: string;
  source?: string;
  isValid: boolean;
  errors: string[];
}

export function BulkLeadImport({ universities, stages, onImportComplete }: BulkLeadImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const headers = [
      'name',
      'email',
      'mobile',
      'city',
      'state',
      'course',
      'specialization',
      'source'
    ];
    
    const sampleData = [
      'John Doe',
      'john@example.com',
      '9876543210',
      'Mumbai',
      'Maharashtra',
      'BBA',
      'Marketing',
      'Website'
    ];

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedLead[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const leads: ParsedLead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const lead: any = { errors: [], isValid: true };

      headers.forEach((header, idx) => {
        lead[header] = values[idx] || '';
      });

      // Validate
      if (!lead.name) {
        lead.errors.push('Name is required');
        lead.isValid = false;
      }
      if (!lead.mobile) {
        lead.errors.push('Mobile is required');
        lead.isValid = false;
      } else if (!/^\d{10}$/.test(lead.mobile.replace(/\D/g, '').slice(-10))) {
        lead.errors.push('Invalid mobile number');
        lead.isValid = false;
      }
      if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
        lead.errors.push('Invalid email format');
        lead.isValid = false;
      }

      leads.push(lead as ParsedLead);
    }

    return leads;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({ title: 'Error', description: 'Please upload a CSV file', variant: 'destructive' });
      return;
    }

    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const leads = parseCSV(text);
      setParsedLeads(leads);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    const validLeads = parsedLeads.filter(l => l.isValid);
    if (validLeads.length === 0) {
      toast({ title: 'Error', description: 'No valid leads to import', variant: 'destructive' });
      return;
    }

    setImporting(true);
    setProgress(0);
    let success = 0;
    let failed = 0;

    const defaultStage = selectedStage || stages.find(s => s.is_default)?.id || stages[0]?.id;
    const BATCH_SIZE = 100;

    for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
      const batch = validLeads.slice(i, i + BATCH_SIZE);
      const rows = batch.map(lead => ({
        name: lead.name,
        email: lead.email || null,
        mobile: lead.mobile,
        city: lead.city || null,
        state: lead.state || null,
        course: lead.course || null,
        specialization: lead.specialization || null,
        source: lead.source || 'Bulk Import',
        university_id: selectedUniversity || null,
        stage_id: defaultStage,
      }));

      try {
        const { error, data } = await supabase.from('crm_contacts').insert(rows).select('id');
        if (error) throw error;
        success += data?.length || rows.length;
      } catch (error) {
        // Fallback: insert one-by-one for this batch to save what we can
        for (const row of rows) {
          try {
            const { error: singleErr } = await supabase.from('crm_contacts').insert(row);
            if (singleErr) throw singleErr;
            success++;
          } catch {
            failed++;
          }
        }
      }
      setProgress(Math.round(Math.min(i + BATCH_SIZE, validLeads.length) / validLeads.length * 100));
    }

    setImporting(false);
    setImportResult({ success, failed });
    
    toast({ 
      title: 'Import Complete', 
      description: `${success} leads imported, ${failed} failed` 
    });

    if (success > 0) {
      onImportComplete();
    }
  };

  const validCount = parsedLeads.filter(l => l.isValid).length;
  const invalidCount = parsedLeads.filter(l => !l.isValid).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Lead Import
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Download Template */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="font-medium">Download Template</p>
            <p className="text-sm text-muted-foreground">Use this CSV template to prepare your leads</p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <FileDown className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">University (Optional)</label>
              <Select value={selectedUniversity || '__none__'} onValueChange={(v) => setSelectedUniversity(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select university" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {universities.map(uni => (
                    <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Initial Stage</label>
              <Select value={selectedStage} onValueChange={setSelectedStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Default stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div 
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium">{file ? file.name : 'Click to upload CSV file'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {file ? `${parsedLeads.length} leads detected` : 'Max 5000 leads per import'}
            </p>
          </div>
        </div>

        {/* Preview */}
        {parsedLeads.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {validCount} Valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {invalidCount} Invalid
                </Badge>
              )}
            </div>

            {invalidCount > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Validation Errors</span>
                </div>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                  {parsedLeads.filter(l => !l.isValid).slice(0, 5).map((lead, idx) => (
                    <li key={idx}>Row {idx + 2}: {lead.errors.join(', ')}</li>
                  ))}
                  {invalidCount > 5 && <li>...and {invalidCount - 5} more errors</li>}
                </ul>
              </div>
            )}

            {importing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Importing... {progress}%
                </p>
              </div>
            )}

            {importResult && (
              <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Import Complete</p>
                  <p className="text-sm text-muted-foreground">
                    {importResult.success} imported, {importResult.failed} failed
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={handleImport} 
              disabled={importing || validCount === 0}
              className="w-full"
            >
              {importing ? 'Importing...' : `Import ${validCount} Leads`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
