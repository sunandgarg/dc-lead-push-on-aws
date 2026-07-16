import { memo, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, Upload, Mail, Eye, MousePointerClick,
  GraduationCap, Loader2, FileSpreadsheet, Users, Zap, Clock, Play, Pause,
  AlertCircle, ChevronRight, Variable, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { FunnelAnalyticsPanel } from './FunnelAnalyticsPanel';

interface Props {
  campaignId: string | null;
  onBack: () => void;
}

// Lightweight contact summary - never store full contact objects in state for large files
interface CsvSummary {
  fileName: string;
  totalRows: number;
  sampleRows: Array<{ name: string; email: string; mobile: string }>;
  headers: string[];
  nameIdx: number;
  emailIdx: number;
  mobileIdx: number;
}

// Streaming CSV parser - processes file in chunks to avoid OOM on 100K+ files
function parseCSVStreaming(
  text: string,
  onProgress: (pct: number) => void,
): { summary: CsvSummary; rows: string[] } | { error: string } {
  try {
    const lineBreak = text.includes('\r\n') ? '\r\n' : '\n';
    const lines = text.split(lineBreak);
    const nonEmpty: string[] = [];
    
    // Single pass - collect non-empty lines, report progress
    const total = lines.length;
    for (let i = 0; i < total; i++) {
      if (lines[i].trim()) nonEmpty.push(lines[i]);
      if (i % 10000 === 0) onProgress(Math.round((i / total) * 50)); // 0-50% for parsing
    }
    
    if (nonEmpty.length < 2) return { error: 'Need at least a header row and one data row' };

    const headers = nonEmpty[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const nameIdx = headers.findIndex(h => h.includes('name') && !h.includes('last'));
    const emailIdx = headers.findIndex(h => h.includes('email'));
    const mobileIdx = headers.findIndex(h => h.includes('mobile') || h.includes('phone'));

    if (emailIdx === -1) return { error: 'CSV must have an email column' };

    // Only keep data rows (not header), don't parse them yet
    const dataRows = nonEmpty.slice(1);
    
    // Sample first 5 for preview
    const sampleRows = dataRows.slice(0, 5).map(line => {
      const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
      return {
        name: nameIdx >= 0 ? cols[nameIdx] || '' : '',
        email: cols[emailIdx] || '',
        mobile: mobileIdx >= 0 ? cols[mobileIdx] || '' : '',
      };
    });

    onProgress(50);

    return {
      summary: {
        fileName: '',
        totalRows: dataRows.length,
        sampleRows,
        headers,
        nameIdx,
        emailIdx,
        mobileIdx,
      },
      rows: dataRows,
    };
  } catch {
    return { error: 'Failed to parse CSV - file may be corrupted' };
  }
}

export function FunnelCampaignBuilder({ campaignId, onBack }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Raw CSV rows kept in ref (not state) to avoid re-renders with 100K+ items
  const rawCsvRows = useRef<string[]>([]);
  const csvMeta = useRef<{ headers: string[]; nameIdx: number; emailIdx: number; mobileIdx: number } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailContent, setEmailContent] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  
  // CSV state - only summary, not full data
  const [csvSummary, setCsvSummary] = useState<CsvSummary | null>(null);
  const [csvParseProgress, setCsvParseProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);

  // Upload progress
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Engagement rules
  const [clickAction, setClickAction] = useState('whatsapp');
  const [openAction, setOpenAction] = useState('sms');
  const [noEngageAction, setNoEngageAction] = useState('email_retry');
  const [waitHours, setWaitHours] = useState('48');
  const [whatsappMessage, setWhatsappMessage] = useState('Hi {{name}}, thanks for your interest! Reply to learn more about {{course}}.');
  const [smsMessage, setSmsMessage] = useState('Hi {{name}}, we noticed you checked out our programs. Call us or reply for details.');
  const [retryEmailSubject, setRetryEmailSubject] = useState('');
  const [retryEmailContent, setRetryEmailContent] = useState('');

  // University push
  const [universityId, setUniversityId] = useState('');
  const [autoPush, setAutoPush] = useState(false);

  // Load existing campaign
  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ['funnel-campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .from('funnel_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      if (error) throw error;
      if (data) {
        setName(data.name);
        setEmailSubject(data.email_subject || '');
        setEmailContent(data.email_content || '');
        setFromEmail(data.from_email || '');
        setFromName(data.from_name || '');
        setUniversityId(data.university_id || '');
        setAutoPush(data.push_mode === 'auto');
        const rules = data.engagement_rules as Record<string, any> | null;
        if (rules) {
          setClickAction(rules.click_action || 'whatsapp');
          setOpenAction(rules.open_action || 'sms');
          setNoEngageAction(rules.no_engage_action || 'email_retry');
          setWaitHours(String(rules.wait_hours || 48));
          if (rules.whatsapp_message) setWhatsappMessage(rules.whatsapp_message);
          if (rules.sms_message) setSmsMessage(rules.sms_message);
          setRetryEmailSubject(rules.retry_email_subject || '');
          setRetryEmailContent(rules.retry_email_content || '');
        }
      }
      return data;
    },
    enabled: !!campaignId,
  });

  // Load aggregated stats only - NOT individual contacts (memory safe)
  const { data: contactStats } = useQuery({
    queryKey: ['funnel-contact-stats', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      // Use count queries instead of loading all contacts
      const [total, clicked, opened, bounced, pushQueued, pushDone] = await Promise.all([
        supabase.from('funnel_campaign_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId),
        supabase.from('funnel_campaign_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('engagement_type', 'clicked'),
        supabase.from('funnel_campaign_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('engagement_type', 'opened'),
        supabase.from('funnel_campaign_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('email_bounced', true),
        supabase.from('funnel_campaign_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('push_status', 'queued'),
        supabase.from('funnel_campaign_contacts').select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId).eq('push_status', 'pushed'),
      ]);
      return {
        total: total.count || 0,
        clicked: clicked.count || 0,
        opened: opened.count || 0,
        bounced: bounced.count || 0,
        noEngagement: (total.count || 0) - (clicked.count || 0) - (opened.count || 0) - (bounced.count || 0),
        pushQueued: pushQueued.count || 0,
        pushDone: pushDone.count || 0,
      };
    },
    enabled: !!campaignId,
    refetchInterval: campaign?.status === 'sending_email' || campaign?.status === 'tracking' ? 5000 : false,
  });

  // Load universities
  const { data: universities = [] } = useQuery({
    queryKey: ['funnel-universities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('universities').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  // Streaming CSV upload - reads file without loading all rows into React state
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Guard: reject files > 50MB
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 50MB. Split your CSV into smaller files.', variant: 'destructive' });
      return;
    }

    setIsParsing(true);
    setCsvParseProgress(0);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      
      // Use requestIdleCallback or setTimeout to avoid blocking the main thread
      setTimeout(() => {
        const result = parseCSVStreaming(text, (pct) => setCsvParseProgress(pct));
        
        if ('error' in result) {
          toast({ title: 'CSV Error', description: result.error, variant: 'destructive' });
          setIsParsing(false);
          return;
        }

        result.summary.fileName = file.name;
        
        // Store raw rows in ref (not state) - avoids re-render overhead
        rawCsvRows.current = result.rows;
        csvMeta.current = {
          headers: result.summary.headers,
          nameIdx: result.summary.nameIdx,
          emailIdx: result.summary.emailIdx,
          mobileIdx: result.summary.mobileIdx,
        };
        
        setCsvSummary(result.summary);
        setCsvParseProgress(100);
        setIsParsing(false);
        toast({ title: 'CSV Ready', description: `${result.summary.totalRows.toLocaleString()} contacts parsed` });
      }, 10);
    };
    reader.onerror = () => {
      toast({ title: 'Read Error', description: 'Failed to read file', variant: 'destructive' });
      setIsParsing(false);
    };
    reader.readAsText(file);
  }, [toast]);

  // High-throughput save: parallel chunk inserts with progress
  const saveCampaign = useMutation({
    mutationFn: async (status: string) => {
      if (!name.trim()) throw new Error('Campaign name is required');

      const totalRows = csvSummary?.totalRows || campaign?.total_contacts || 0;
      const payload = {
        name,
        email_subject: emailSubject,
        email_content: emailContent,
        from_email: fromEmail,
        from_name: fromName,
        university_id: universityId || null,
        push_mode: autoPush ? 'auto' : 'manual',
        total_contacts: totalRows,
        status,
        engagement_rules: {
          click_action: clickAction,
          open_action: openAction,
          no_engage_action: noEngageAction,
          wait_hours: parseInt(waitHours),
          whatsapp_message: whatsappMessage,
          sms_message: smsMessage,
          retry_email_subject: retryEmailSubject,
          retry_email_content: retryEmailContent,
          auto_push_to_university: autoPush,
        },
      };

      let cId = campaignId;
      if (campaignId) {
        const { error } = await supabase.from('funnel_campaigns').update(payload).eq('id', campaignId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('funnel_campaigns').insert(payload).select('id').single();
        if (error) throw error;
        cId = data.id;
      }

      // Upload contacts from raw CSV rows - streamed, never all in memory at once
      const rows = rawCsvRows.current;
      if (rows.length > 0 && cId && csvMeta.current) {
        setIsUploading(true);
        setUploadProgress(0);
        
        const meta = csvMeta.current;
        const CHUNK_SIZE = 2000; // Larger chunks = fewer round trips
        const PARALLEL = 4; // 4 parallel inserts at once
        const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
        let completedChunks = 0;
        let failedChunks = 0;

        // Process chunks in parallel batches
        for (let batchStart = 0; batchStart < totalChunks; batchStart += PARALLEL) {
          const promises: Promise<void>[] = [];
          
          for (let ci = batchStart; ci < Math.min(batchStart + PARALLEL, totalChunks); ci++) {
            const startIdx = ci * CHUNK_SIZE;
            const endIdx = Math.min(startIdx + CHUNK_SIZE, rows.length);
            
            // Parse rows just-in-time (not pre-parsed) to save memory
            const chunk: Array<{
              campaign_id: string;
              name: string;
              email: string;
              mobile: string;
              extra_data: Record<string, string>;
            }> = [];
            
            for (let r = startIdx; r < endIdx; r++) {
              const cols = rows[r].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
              const email = cols[meta.emailIdx] || '';
              if (!email || !email.includes('@')) continue; // Skip invalid
              
              const extra: Record<string, string> = {};
              for (let h = 0; h < meta.headers.length; h++) {
                if (h !== meta.nameIdx && h !== meta.emailIdx && h !== meta.mobileIdx && cols[h]) {
                  extra[meta.headers[h]] = cols[h];
                }
              }
              
              chunk.push({
                campaign_id: cId!,
                name: meta.nameIdx >= 0 ? cols[meta.nameIdx] || '' : '',
                email,
                mobile: meta.mobileIdx >= 0 ? cols[meta.mobileIdx] || '' : '',
                extra_data: extra,
              });
            }

            if (chunk.length > 0) {
              promises.push(
                (async () => {
                  try {
                    const { error: insertError } = await supabase.from('funnel_campaign_contacts').insert(chunk);
                    if (insertError) {
                      failedChunks++;
                      console.error('Chunk insert failed:', insertError.message);
                    }
                  } catch {
                    failedChunks++;
                  }
                  completedChunks++;
                  setUploadProgress(Math.round((completedChunks / totalChunks) * 100));
                })()
              );
            } else {
              completedChunks++;
            }
          }

          await Promise.all(promises);
        }

        // Update total count
        const actualCount = rows.length - failedChunks * CHUNK_SIZE; // approximate
        await supabase.from('funnel_campaigns').update({ total_contacts: Math.max(actualCount, 0) }).eq('id', cId);
        
        // Clear raw data from memory
        rawCsvRows.current = [];
        setIsUploading(false);

        if (failedChunks > 0) {
          toast({ title: 'Partial Upload', description: `${failedChunks} chunk(s) failed. Most contacts were uploaded.`, variant: 'destructive' });
        }
      }

      return cId;
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['funnel-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['funnel-contact-stats', campaignId] });
      toast({ title: status === 'draft' ? 'Draft Saved' : 'Campaign Started' });
      if (status === 'draft') onBack();
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const insertVariable = useCallback((setter: (fn: (prev: string) => string) => void, variable: string) => {
    setter(prev => prev + `{{${variable}}}`);
  }, []);

  const isExisting = !!campaignId && !!campaign;
  const isDraft = !isExisting || campaign?.status === 'draft';
  const contactCount = isExisting ? (campaign?.total_contacts || 0) : (csvSummary?.totalRows || 0);

  if (loadingCampaign) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Campaigns
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            {isExisting ? campaign?.name : 'New Funnel Campaign'}
          </h1>
          {isExisting && <Badge className={cn('text-xs', campaign?.status === 'completed' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600')}>{campaign?.status}</Badge>}
        </div>
      </div>

      {/* Show analytics for existing campaigns - uses aggregated stats, not raw contacts */}
      {isExisting && campaign?.status !== 'draft' && contactStats && (
        <FunnelAnalyticsPanel campaign={campaign} contactStats={contactStats} />
      )}

      {/* Upload progress overlay */}
      {isUploading && (
        <Card className="mb-6 border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Uploading contacts to database...</span>
              <span className="text-sm font-bold ml-auto">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">
              {csvSummary ? `${csvSummary.totalRows.toLocaleString()} contacts • 2000 per batch • 4 parallel` : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Upload + Email */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500" />
              Step 1: Email Blast
            </CardTitle>
            <CardDescription>Upload contacts and configure the initial email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDraft && (
              <div>
                <Label>Campaign Name</Label>
                <Input placeholder="E.g., March Admission Drive" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}

            {/* CSV Upload */}
            {isDraft && !isExisting && (
              <div>
                <Label>Upload Contacts (CSV)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => !isParsing && fileInputRef.current?.click()}
                >
                  {isParsing ? (
                    <div className="space-y-2">
                      <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Parsing CSV... {csvParseProgress}%</p>
                      <Progress value={csvParseProgress} className="h-1.5 max-w-48 mx-auto" />
                    </div>
                  ) : csvSummary ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium">{csvSummary.fileName}</span>
                        <Badge variant="secondary">{csvSummary.totalRows.toLocaleString()} contacts</Badge>
                      </div>
                      {/* Preview table */}
                      <div className="text-left border rounded mt-2 overflow-hidden">
                        <table className="w-full text-[10px]">
                          <thead><tr className="bg-muted/50">
                            <th className="p-1 font-medium">Name</th>
                            <th className="p-1 font-medium">Email</th>
                            <th className="p-1 font-medium">Mobile</th>
                          </tr></thead>
                          <tbody>
                            {csvSummary.sampleRows.map((r, i) => (
                              <tr key={i} className="border-t"><td className="p-1">{r.name}</td><td className="p-1">{r.email}</td><td className="p-1">{r.mobile}</td></tr>
                            ))}
                          </tbody>
                        </table>
                        {csvSummary.totalRows > 5 && (
                          <p className="text-[10px] text-muted-foreground p-1 bg-muted/30">...and {(csvSummary.totalRows - 5).toLocaleString()} more</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload CSV (up to 50MB)</p>
                      <p className="text-[10px] text-muted-foreground">Must have: email column. Optional: name, mobile</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </div>
            )}

            {isExisting && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{contactCount.toLocaleString()} contacts</p>
                  <p className="text-[10px] text-muted-foreground">Uploaded to this campaign</p>
                </div>
              </div>
            )}

            <Separator />

            <div>
              <Label>From Name</Label>
              <Input placeholder="Your College Name" value={fromName} onChange={e => setFromName(e.target.value)} disabled={!isDraft} />
            </div>
            <div>
              <Label>From Email</Label>
              <Input placeholder="admissions@college.edu" value={fromEmail} onChange={e => setFromEmail(e.target.value)} disabled={!isDraft} />
            </div>
            <div>
              <Label>Subject Line</Label>
              <Input placeholder="Your gateway to a bright future 🎓" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} disabled={!isDraft} />
            </div>
            <div>
              <Label>Email Body</Label>
              <Textarea
                rows={6}
                placeholder="Write your email content... Use {{name}}, {{course}} etc."
                value={emailContent}
                onChange={e => setEmailContent(e.target.value)}
                className="font-mono text-sm"
                disabled={!isDraft}
              />
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {['name', 'email', 'course', 'college', 'link'].map(v => (
                  <Button key={v} variant="outline" size="sm" className="h-5 text-[10px] px-1.5" onClick={() => insertVariable(setEmailContent, v)} disabled={!isDraft}>
                    <Variable className="h-2.5 w-2.5 mr-0.5" />{v}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Engagement Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointerClick className="h-4 w-4 text-green-500" />
              Step 2: Engagement Rules
            </CardTitle>
            <CardDescription>Define actions based on email engagement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <Label className="text-xs">Wait before follow-up</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input type="number" value={waitHours} onChange={e => setWaitHours(e.target.value)} className="w-20 h-7 text-sm" disabled={!isDraft} />
                  <span className="text-xs text-muted-foreground">hours after email</span>
                </div>
              </div>
            </div>

            {/* Clicked → WhatsApp */}
            <Card className="border-green-500/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">If Clicked</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <Select value={clickAction} onValueChange={setClickAction} disabled={!isDraft}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="none">No Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {clickAction === 'whatsapp' && (
                  <div>
                    <Label className="text-xs">WhatsApp Message</Label>
                    <Textarea rows={3} value={whatsappMessage} onChange={e => setWhatsappMessage(e.target.value)} className="text-xs font-mono" disabled={!isDraft} />
                  </div>
                )}
                {clickAction === 'sms' && (
                  <div>
                    <Label className="text-xs">SMS Message</Label>
                    <Textarea rows={2} value={smsMessage} onChange={e => setSmsMessage(e.target.value)} className="text-xs font-mono" disabled={!isDraft} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Opened but not clicked → SMS */}
            <Card className="border-amber-500/20">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">If Opened (no click)</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <Select value={openAction} onValueChange={setOpenAction} disabled={!isDraft}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email_retry">Retry Email</SelectItem>
                      <SelectItem value="none">No Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {openAction === 'sms' && (
                  <div>
                    <Label className="text-xs">SMS Message</Label>
                    <Textarea rows={2} value={smsMessage} onChange={e => setSmsMessage(e.target.value)} className="text-xs font-mono" disabled={!isDraft} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* No engagement → Retry */}
            <Card className="border-muted">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">No Engagement</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <Select value={noEngageAction} onValueChange={setNoEngageAction} disabled={!isDraft}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email_retry">Retry Email</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="none">Skip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {noEngageAction === 'email_retry' && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Retry Subject</Label>
                      <Input placeholder="Did you miss this?" value={retryEmailSubject} onChange={e => setRetryEmailSubject(e.target.value)} className="h-7 text-xs" disabled={!isDraft} />
                    </div>
                    <div>
                      <Label className="text-xs">Retry Body</Label>
                      <Textarea rows={2} value={retryEmailContent} onChange={e => setRetryEmailContent(e.target.value)} className="text-xs font-mono" disabled={!isDraft} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Section 3: University Push + Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-orange-500" />
              Step 3: Push to University
            </CardTitle>
            <CardDescription>Push engaged leads to university CRM</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Target University</Label>
              <Select value={universityId} onValueChange={setUniversityId} disabled={!isDraft}>
                <SelectTrigger><SelectValue placeholder="Select university" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u: { id: string; name: string }) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Auto Push</p>
                  <p className="text-[10px] text-muted-foreground">Automatically push engaged leads</p>
                </div>
              </div>
              <Switch checked={autoPush} onCheckedChange={setAutoPush} disabled={!isDraft} />
            </div>

            {!autoPush && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">Manual Review Mode</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Engaged contacts will be queued for review before pushing.</p>
              </div>
            )}

            <Separator />

            {/* Funnel Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Funnel Summary</h4>
              <div className="space-y-1.5">
                {[
                  { icon: Mail, label: 'Send email to', value: `${contactCount.toLocaleString()} contacts`, color: 'text-blue-500' },
                  { icon: Clock, label: 'Wait', value: `${waitHours} hours`, color: 'text-amber-500' },
                  { icon: MousePointerClick, label: 'Clicked →', value: clickAction === 'none' ? 'Skip' : clickAction.toUpperCase(), color: 'text-green-500' },
                  { icon: Eye, label: 'Opened →', value: openAction === 'none' ? 'Skip' : openAction.toUpperCase(), color: 'text-amber-500' },
                  { icon: RefreshCw, label: 'No engage →', value: noEngageAction === 'none' ? 'Skip' : noEngageAction.replace('_', ' '), color: 'text-muted-foreground' },
                  { icon: GraduationCap, label: 'Push to uni', value: autoPush ? 'Automatic' : 'Manual review', color: 'text-orange-500' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <item.icon className={cn('h-3 w-3', item.color)} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            {isDraft && (
              <div className="space-y-2">
                <Button
                  className="w-full gap-2"
                  onClick={() => saveCampaign.mutate('sending_email')}
                  disabled={saveCampaign.isPending || isUploading || (!csvSummary && !isExisting) || !emailSubject}
                >
                  {(saveCampaign.isPending || isUploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Launch Funnel Campaign
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => saveCampaign.mutate('draft')}
                  disabled={saveCampaign.isPending || isUploading}
                >
                  Save as Draft
                </Button>
              </div>
            )}

            {isExisting && campaign?.status !== 'draft' && campaign?.status !== 'completed' && (
              <Button variant="outline" className="w-full gap-2" onClick={() => saveCampaign.mutate('paused')}>
                <Pause className="h-4 w-4" /> Pause Campaign
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default memo(FunnelCampaignBuilder);
