import { useState, useRef, memo } from 'react';
import { Upload, FileText, CheckCircle2, XCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateShortCode, isValidUrl } from '@/utils/base62';

interface BulkImportRow {
  original_url: string;
  custom_code?: string;
  expires_at?: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
  short_code?: string;
}

export const UrlBulkImport = memo(function UrlBulkImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importId, setImportId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({ title: 'Invalid File', description: 'Please upload a CSV file', variant: 'destructive' });
      return;
    }

    setFile(selectedFile);
    const text = await selectedFile.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    const urlIndex = headers.findIndex(h => ['url', 'original_url', 'link'].includes(h));
    const codeIndex = headers.findIndex(h => ['code', 'custom_code', 'short_code'].includes(h));
    const expiresIndex = headers.findIndex(h => ['expires', 'expires_at', 'expiry'].includes(h));

    if (urlIndex === -1) {
      toast({ title: 'Invalid CSV', description: 'CSV must have a URL column', variant: 'destructive' });
      return;
    }

    const parsedRows: BulkImportRow[] = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      return {
        original_url: cols[urlIndex] || '',
        custom_code: codeIndex !== -1 ? cols[codeIndex] : undefined,
        expires_at: expiresIndex !== -1 ? cols[expiresIndex] : undefined,
        status: 'pending' as const,
      };
    }).filter(row => row.original_url);

    setRows(parsedRows);
    setProgress(0);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create import record
      const { data: importRecord, error: importError } = await supabase
        .from('url_bulk_imports')
        .insert({
          user_id: user.id,
          file_name: file?.name || 'bulk_import.csv',
          total_urls: rows.length,
          status: 'processing',
        })
        .select()
        .single();

      if (importError) throw importError;
      setImportId(importRecord.id);

      let successCount = 0;
      let errorCount = 0;
      const updatedRows = [...rows];

      // Process in batches of 10 for better performance
      const BATCH_SIZE = 10;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, Math.min(i + BATCH_SIZE, rows.length));
        const batchInserts: { index: number; payload: any; row: BulkImportRow }[] = [];

        for (let j = 0; j < batch.length; j++) {
          const idx = i + j;
          const row = batch[j];

          const validation = isValidUrl(row.original_url);
          if (!validation.valid) {
            updatedRows[idx] = { ...row, status: 'error', error: validation.error };
            errorCount++;
            continue;
          }

          const shortCode = row.custom_code || generateShortCode();
          let expiresAt: string | null = null;
          if (row.expires_at) {
            try { expiresAt = new Date(row.expires_at).toISOString(); } catch { /* skip */ }
          }

          batchInserts.push({
            index: idx,
            row,
            payload: {
              original_url: row.original_url,
              short_code: shortCode,
              user_id: user.id,
              expires_at: expiresAt,
              custom_code: !!row.custom_code,
            },
          });
        }

        // Insert valid rows one by one (needed for individual error reporting)
        for (const item of batchInserts) {
          const { data, error } = await supabase
            .from('url_mappings')
            .insert(item.payload)
            .select()
            .single();

          if (error) {
            updatedRows[item.index] = {
              ...item.row, status: 'error',
              error: error.code === '23505' ? 'Short code already exists' : error.message,
            };
            errorCount++;
          } else {
            updatedRows[item.index] = { ...item.row, status: 'success', short_code: data.short_code };
            successCount++;
          }
        }

        setRows([...updatedRows]);
        setProgress(Math.min(((i + batch.length) / rows.length) * 100, 100));

        // Small delay between batches to prevent rate limiting
        if (i + BATCH_SIZE < rows.length) {
          await new Promise(r => setTimeout(r, 100));
        }
      }

      // Update import record
      await supabase
        .from('url_bulk_imports')
        .update({
          success_count: successCount,
          error_count: errorCount,
          status: 'completed',
          completed_at: new Date().toISOString(),
          error_report: updatedRows.filter(r => r.status === 'error').map(r => ({
            url: r.original_url,
            error: r.error,
          })),
        })
        .eq('id', importRecord.id);

      toast({
        title: 'Import Complete',
        description: `${successCount} URLs imported, ${errorCount} failed`,
      });

    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadErrorReport = () => {
    const errors = rows.filter(r => r.status === 'error');
    if (errors.length === 0) return;

    const csv = 'original_url,error\n' + errors.map(r => 
      `"${r.original_url}","${r.error}"`
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleCsv = () => {
    const sample = `original_url,custom_code,expires_at
https://example.com/page1,mycode1,2025-12-31
https://example.com/page2,,
https://example.com/page3,custom2,2026-06-30`;

    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_import_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = rows.filter(r => r.status === 'success').length;
  const errorCount = rows.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Import
          </CardTitle>
          <CardDescription>
            Upload a CSV file to create multiple short URLs at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CSV Format Info */}
          <div className="p-4 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-2">CSV Format:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><strong>original_url</strong> (required): The URL to shorten</li>
              <li><strong>custom_code</strong> (optional): Custom short code</li>
              <li><strong>expires_at</strong> (optional): Expiration date (YYYY-MM-DD)</li>
            </ul>
            <Button variant="link" size="sm" className="px-0 mt-2" onClick={downloadSampleCsv}>
              <Download className="h-3 w-3 mr-1" />
              Download Sample CSV
            </Button>
          </div>

          {/* File Upload */}
          <div 
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <FileText className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <p className="font-medium">{file.name}</p>
            ) : (
              <>
                <p className="font-medium">Click to upload CSV</p>
                <p className="text-sm text-muted-foreground">or drag and drop</p>
              </>
            )}
          </div>

          {/* Progress */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{rows.length} URLs to import</span>
                <div className="flex items-center gap-2">
                  {successCount > 0 && (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {successCount}
                    </Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      {errorCount}
                    </Badge>
                  )}
                </div>
              </div>
              {isProcessing && <Progress value={progress} />}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={handleImport} 
              disabled={rows.length === 0 || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Importing...' : 'Start Import'}
            </Button>
            {errorCount > 0 && (
              <Button variant="outline" onClick={downloadErrorReport}>
                <Download className="h-4 w-4 mr-2" />
                Error Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead>Custom Code</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 50).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs max-w-xs truncate">
                        {row.original_url}
                      </TableCell>
                      <TableCell>{row.custom_code || '-'}</TableCell>
                      <TableCell>
                        {row.status === 'pending' && (
                          <Badge variant="secondary">Pending</Badge>
                        )}
                        {row.status === 'success' && (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            /{row.short_code}
                          </Badge>
                        )}
                        {row.status === 'error' && (
                          <Badge variant="destructive" title={row.error}>
                            <XCircle className="h-3 w-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 50 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Showing 50 of {rows.length} rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

export default UrlBulkImport;
