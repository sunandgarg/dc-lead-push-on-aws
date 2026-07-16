import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Copy, Zap, X, Download, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logic: 'AND' | 'OR';
}

interface FieldMapping {
  uniField: string;
  sourceField: string;
  defaultValue: string;
}

interface RuleAction {
  type: 'push' | 'set_default' | 'tag' | 'notify';
  university_id?: string;
  university_name?: string;
  fieldMappings?: FieldMapping[];
  field?: string;
  value?: string;
  tag?: string;
  email?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  status: 'Active' | 'Paused';
  conditions: Condition[];
  actions: RuleAction[];
  retryEnabled: boolean;
  maxRetries: number;
  retryAfter: string;
  triggeredCount: number;
  successCount: number;
  failCount: number;
  lastTriggered: string;
}

interface LogEntry {
  id: string;
  time: string;
  leadName: string;
  rule: string;
  university: string;
  result: string;
  failReason: string;
  retryCount: number;
}

interface UniversityOption {
  id: string;
  name: string;
  columnMapping: Record<string, string>;
}

const FIELD_OPTIONS = ['City', 'State', 'Course', 'Specialization', 'Source', 'Campaign Name', 'Mobile', 'Email', 'Any Field is Empty'];
const OPERATOR_OPTIONS: Record<string, string[]> = {
  default: ['is', 'is not', 'contains', 'does not contain', 'starts with'],
  empty: ['is empty', 'is not empty'],
};
const LEAD_FIELDS = ['name', 'email', 'mobile', 'course', 'specialization', 'city', 'state', 'campaign', 'source', 'address'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function downloadLogCSV(data: LogEntry[], filename: string) {
  const headers = ['Time', 'Lead Name', 'Rule', 'University', 'Result', 'Fail Reason', 'Retry Count'];
  const rows = data.map(l => [l.time, l.leadName, l.rule, l.university, l.result, l.failReason, l.retryCount.toString()]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export function AutomationRulesPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Builder state
  const [ruleName, setRuleName] = useState('');
  const [ruleDesc, setRuleDesc] = useState('');
  const [rulePriority, setRulePriority] = useState(1);
  const [ruleStatus, setRuleStatus] = useState<'Active' | 'Paused'>('Active');
  const [conditions, setConditions] = useState<Condition[]>([{ id: '1', field: 'City', operator: 'is', value: '', logic: 'AND' }]);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [maxRetries, setMaxRetries] = useState(2);
  const [retryAfter, setRetryAfter] = useState('5min');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, logsRes, uniRes] = await Promise.all([
        supabase.from('automation_rules').select('*').order('priority', { ascending: true }),
        supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('universities').select('id, name, column_mapping'),
      ]);

      if (rulesRes.data) {
        setRules(rulesRes.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          priority: r.priority,
          status: r.status || 'Active',
          conditions: (r.conditions as any) || [],
          actions: (r.actions as any) || [],
          retryEnabled: r.retry_enabled,
          maxRetries: r.max_retries,
          retryAfter: r.retry_after || '5min',
          triggeredCount: r.triggered_count || 0,
          successCount: r.success_count || 0,
          failCount: r.fail_count || 0,
          lastTriggered: r.last_triggered_at ? formatDate(r.last_triggered_at) : 'Never',
        })));
      }

      if (logsRes.data) {
        setLogs(logsRes.data.map((l: any) => ({
          id: l.id,
          time: l.created_at,
          leadName: l.lead_name || '',
          rule: l.rule_name || '',
          university: l.university_name || '',
          result: l.result || 'Pending',
          failReason: l.fail_reason || '',
          retryCount: l.retry_count || 0,
        })));
      }

      if (uniRes.data) {
        setUniversities(uniRes.data.map((u: any) => ({
          id: u.id,
          name: u.name,
          columnMapping: typeof u.column_mapping === 'object' ? u.column_mapping : {},
        })));
      }
    } catch (err) {
      console.error('Error fetching automation data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUniversityFieldMappings = (uniId: string): { apiField: string; internalKey: string }[] => {
    const uni = universities.find(u => u.id === uniId);
    if (!uni || !uni.columnMapping) return LEAD_FIELDS.map(f => ({ apiField: f, internalKey: f }));
    const mapping = uni.columnMapping;
    const entries = Object.entries(mapping)
      .filter(([k, v]) => !k.startsWith('__') && typeof v === 'string' && v.trim())
      .map(([k, v]) => ({ apiField: v as string, internalKey: k }));
    // Also include static fields so user can see them
    const statics = Object.entries(mapping)
      .filter(([k, v]) => k.startsWith('__static_') && typeof v === 'string')
      .map(([k, v]) => ({ apiField: k.replace('__static_', '') + ' (static)', internalKey: '__static__' }));
    const all = [...entries, ...statics];
    return all.length > 0 ? all : LEAD_FIELDS.map(f => ({ apiField: f, internalKey: f }));
  };

  const openBuilder = (rule?: AutomationRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleName(rule.name); setRuleDesc(rule.description); setRulePriority(rule.priority);
      setRuleStatus(rule.status); setConditions(rule.conditions); setActions(rule.actions);
      setRetryEnabled(rule.retryEnabled); setMaxRetries(rule.maxRetries); setRetryAfter(rule.retryAfter);
    } else {
      setEditingRule(null); setRuleName(''); setRuleDesc(''); setRulePriority(rules.length + 1);
      setRuleStatus('Active'); setConditions([{ id: '1', field: 'City', operator: 'is', value: '', logic: 'AND' }]);
      setActions([]); setRetryEnabled(true); setMaxRetries(2); setRetryAfter('5min');
    }
    setShowBuilder(true);
  };

  const addCondition = () => setConditions(prev => [...prev, { id: Date.now().toString(), field: 'City', operator: 'is', value: '', logic: 'AND' }]);
  const removeCondition = (id: string) => setConditions(prev => prev.filter(c => c.id !== id));
  const updateCondition = (id: string, key: keyof Condition, val: string) => setConditions(prev => prev.map(c => c.id === id ? { ...c, [key]: val } : c));

  const addAction = (type: RuleAction['type']) => {
    if (type === 'push') {
      const firstUni = universities[0];
      const fieldMaps = firstUni ? getUniversityFieldMappings(firstUni.id) : LEAD_FIELDS.map(f => ({ apiField: f, internalKey: f }));
      setActions(prev => [...prev, {
        type,
        university_id: firstUni?.id || '',
        university_name: firstUni?.name || '',
        fieldMappings: fieldMaps.map(fm => ({ uniField: fm.apiField, sourceField: fm.internalKey === '__static__' ? '' : fm.internalKey, defaultValue: '' })),
      }]);
    }
    else if (type === 'set_default') setActions(prev => [...prev, { type, field: 'course', value: '' }]);
    else if (type === 'tag') setActions(prev => [...prev, { type, tag: '' }]);
    else if (type === 'notify') setActions(prev => [...prev, { type, email: '' }]);
  };

  const removeAction = (idx: number) => setActions(prev => prev.filter((_, i) => i !== idx));

  const updateActionUniversity = (idx: number, uniId: string) => {
    const uni = universities.find(u => u.id === uniId);
    const fieldMaps = getUniversityFieldMappings(uniId);
    setActions(prev => prev.map((a, i) => i === idx ? {
      ...a,
      university_id: uniId,
      university_name: uni?.name || '',
      fieldMappings: fieldMaps.map(fm => ({ uniField: fm.apiField, sourceField: fm.internalKey === '__static__' ? '' : fm.internalKey, defaultValue: '' })),
    } : a));
  };

  const saveRule = async () => {
    if (!ruleName.trim()) { toast({ title: 'Error', description: 'Rule name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        name: ruleName,
        description: ruleDesc,
        priority: rulePriority,
        status: ruleStatus,
        conditions: conditions as any,
        actions: actions as any,
        retry_enabled: retryEnabled,
        max_retries: maxRetries,
        retry_after: retryAfter,
      };

      if (editingRule) {
        const { error } = await supabase.from('automation_rules').update(payload).eq('id', editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('automation_rules').insert(payload);
        if (error) throw error;
      }

      setShowBuilder(false);
      toast({ title: editingRule ? 'Rule Updated' : 'Rule Created', description: `"${ruleName}" saved successfully` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const duplicateRule = async (rule: AutomationRule) => {
    const { error } = await supabase.from('automation_rules').insert({
      name: rule.name + ' (Copy)',
      description: rule.description,
      priority: rule.priority,
      status: 'Paused',
      conditions: rule.conditions as any,
      actions: rule.actions as any,
      retry_enabled: rule.retryEnabled,
      max_retries: rule.maxRetries,
      retry_after: rule.retryAfter,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Rule Duplicated' }); fetchData(); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    const { error } = await supabase.from('automation_rules').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Rule Deleted' }); fetchData(); }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Active' ? 'Paused' : 'Active';
    const { error } = await supabase.from('automation_rules').update({ status: newStatus }).eq('id', id);
    if (!error) fetchData();
  };

  const getOperators = (field: string) => {
    if (['Mobile', 'Email', 'Any Field is Empty', 'Course', 'Specialization'].includes(field)) return [...OPERATOR_OPTIONS.default, ...OPERATOR_OPTIONS.empty];
    return OPERATOR_OPTIONS.default;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading automation rules...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2"><Zap className="h-6 w-6 text-warning" /> Automation Rules</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button onClick={() => openBuilder()}><Plus className="h-4 w-4 mr-2" /> Create New Rule</Button>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList><TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger><TabsTrigger value="logs">Activity Log ({logs.length})</TabsTrigger></TabsList>

        <TabsContent value="rules" className="space-y-4 mt-4">
          {rules.map(rule => (
            <Card key={rule.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-display font-semibold text-lg">{rule.name}</h3>
                    <Badge variant={rule.status === 'Active' ? 'default' : 'secondary'} className={rule.status === 'Active' ? 'bg-success/20 text-success border-success/30' : ''}>{rule.status}</Badge>
                    <span className="text-xs text-muted-foreground">Priority: {rule.priority}</span>
                  </div>
                  {rule.description && <p className="text-sm text-muted-foreground">{rule.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">IF:</span>
                    {rule.conditions.map((c, i) => (
                      <span key={c.id}>
                        {i > 0 && <Badge variant="outline" className="text-xs mx-1">{c.logic}</Badge>}
                        <Badge variant="outline" className="text-xs">{c.field} {c.operator} {c.value}</Badge>
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">THEN:</span>
                    {rule.actions.map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {a.type === 'push' ? `Push → ${a.university_name || 'Unknown'}` :
                         a.type === 'set_default' ? `Set ${a.field} = ${a.value}` :
                         a.type === 'tag' ? `Tag: ${a.tag}` : `Notify: ${a.email}`}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span>Triggered: <strong className="font-display">{rule.triggeredCount}</strong></span>
                    <span className="text-success">✓ {rule.successCount}</span>
                    <span className="text-destructive">✕ {rule.failCount}</span>
                    <span className="text-muted-foreground">Last: {rule.lastTriggered}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={rule.status === 'Active'} onCheckedChange={() => toggleStatus(rule.id, rule.status)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openBuilder(rule)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateRule(rule)}><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteRule(rule.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
          {rules.length === 0 && <Card className="p-12 text-center text-muted-foreground"><Zap className="h-8 w-8 mx-auto mb-3 opacity-50" /><p>No automation rules yet. Create one to auto-push leads to universities.</p></Card>}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <div className="flex justify-end mb-3">
            <Button variant="outline" size="sm" onClick={() => downloadLogCSV(logs, 'automation-log.csv')}><Download className="h-3 w-3 mr-1" /> Export CSV</Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="table-header">
                <TableHead>Time</TableHead><TableHead>Lead</TableHead><TableHead>Rule</TableHead><TableHead>University</TableHead><TableHead>Result</TableHead><TableHead>Fail Reason</TableHead><TableHead>Retries</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No automation logs yet.</TableCell></TableRow>
                ) : logs.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{formatDate(l.time)}</TableCell>
                    <TableCell className="font-medium text-sm">{l.leadName}</TableCell>
                    <TableCell className="text-sm">{l.rule}</TableCell>
                    <TableCell className="text-sm">{l.university}</TableCell>
                    <TableCell><span className={l.result === 'Success' ? 'badge-success' : 'badge-error'}>{l.result}</span></TableCell>
                    <TableCell className="text-xs text-destructive">{l.failReason || '-'}</TableCell>
                    <TableCell className="text-sm">{l.retryCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Builder Modal */}
      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{editingRule ? 'Edit Rule' : 'Create New Rule'}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Step 1: Basics */}
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-sm text-primary">Step 1 - Rule Basics</h4>
              <div><Label>Rule Name *</Label><Input value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="e.g. Delhi Leads → LPU" /></div>
              <div><Label>Description</Label><Textarea value={ruleDesc} onChange={e => setRuleDesc(e.target.value)} placeholder="Optional description" rows={2} /></div>
              <div className="flex gap-4">
                <div><Label>Priority</Label><Input type="number" min={1} value={rulePriority} onChange={e => setRulePriority(Number(e.target.value))} className="w-20" /></div>
                <div className="flex items-center gap-2"><Label>Status:</Label><Switch checked={ruleStatus === 'Active'} onCheckedChange={c => setRuleStatus(c ? 'Active' : 'Paused')} /><span className="text-sm">{ruleStatus}</span></div>
              </div>
            </div>

            {/* Step 2: Conditions */}
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-sm text-primary">Step 2 - Conditions (IF)</h4>
              <p className="text-xs text-muted-foreground">Run this rule when a lead arrives AND matches these conditions:</p>
              {conditions.map((c, i) => (
                <div key={c.id} className="flex gap-2 items-center">
                  {i > 0 && (
                    <Select value={c.logic} onValueChange={v => updateCondition(c.id, 'logic', v)}>
                      <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="AND">AND</SelectItem><SelectItem value="OR">OR</SelectItem></SelectContent>
                    </Select>
                  )}
                  <Select value={c.field} onValueChange={v => updateCondition(c.id, 'field', v)}>
                    <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{FIELD_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={c.operator} onValueChange={v => updateCondition(c.id, 'operator', v)}>
                    <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{getOperators(c.field).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  {!c.operator.includes('empty') && <Input value={c.value} onChange={e => updateCondition(c.id, 'value', e.target.value)} placeholder="Value" className="h-8 flex-1" />}
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeCondition(c.id)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCondition}><Plus className="h-3 w-3 mr-1" /> Add Condition</Button>
            </div>

            {/* Step 3: Actions */}
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-sm text-primary">Step 3 - Actions (THEN)</h4>
              {actions.map((action, idx) => (
                <Card key={idx} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{action.type === 'push' ? '🏛 Push to University' : action.type === 'set_default' ? '✏️ Set Default' : action.type === 'tag' ? '🏷 Tag Lead' : '📧 Notify'}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAction(idx)}><X className="h-3 w-3" /></Button>
                  </div>
                  {action.type === 'push' && (
                    <>
                      <Select value={action.university_id} onValueChange={v => updateActionUniversity(idx, v)}>
                        <SelectTrigger><SelectValue placeholder="Select University" /></SelectTrigger>
                        <SelectContent>
                          {universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {action.fieldMappings && action.fieldMappings.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">University API fields from your integration config. Map each to a lead field or set a fixed value:</p>
                          <Table>
                            <TableHeader><TableRow className="table-header"><TableHead>API Field (University)</TableHead><TableHead>Map From Lead</TableHead><TableHead>Fixed/Default Value</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {action.fieldMappings.map((fm, fmIdx) => (
                                <TableRow key={fmIdx}>
                                  <TableCell className="font-mono text-xs font-semibold">{fm.uniField}</TableCell>
                                  <TableCell>
                                    {fm.uniField.includes('(static)') ? (
                                      <span className="text-xs text-muted-foreground italic">Static - set in university config</span>
                                    ) : (
                                      <Select value={fm.sourceField || '__skip__'} onValueChange={v => {
                                        const newActions = [...actions];
                                        newActions[idx].fieldMappings![fmIdx].sourceField = v === '__skip__' ? '' : v;
                                        setActions(newActions);
                                      }}>
                                        <SelectTrigger className="h-7"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__skip__">- Skip -</SelectItem>
                                          {LEAD_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {fm.uniField.includes('(static)') ? (
                                      <span className="text-xs text-muted-foreground italic">Configured</span>
                                    ) : (
                                      <Input className="h-7" value={fm.defaultValue} onChange={e => {
                                        const newActions = [...actions];
                                        newActions[idx].fieldMappings![fmIdx].defaultValue = e.target.value;
                                        setActions(newActions);
                                      }} placeholder="Fixed value (always sent)" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </>
                  )}
                  {action.type === 'set_default' && (
                    <div className="flex gap-2 items-center text-sm">
                      <span>If</span>
                      <Select value={action.field} onValueChange={v => { const n = [...actions]; n[idx].field = v; setActions(n); }}>
                        <SelectTrigger className="w-32 h-7"><SelectValue /></SelectTrigger>
                        <SelectContent>{LEAD_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                      <span>is empty → set to</span>
                      <Input className="h-7 flex-1" value={action.value} onChange={e => { const n = [...actions]; n[idx].value = e.target.value; setActions(n); }} />
                    </div>
                  )}
                  {action.type === 'tag' && <Input placeholder="Tag name e.g. high-priority" value={action.tag} onChange={e => { const n = [...actions]; n[idx].tag = e.target.value; setActions(n); }} />}
                  {action.type === 'notify' && <Input placeholder="Notification email" type="email" value={action.email} onChange={e => { const n = [...actions]; n[idx].email = e.target.value; setActions(n); }} />}
                </Card>
              ))}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => addAction('push')}>+ Push to University</Button>
                <Button variant="outline" size="sm" onClick={() => addAction('set_default')}>+ Set Default</Button>
                <Button variant="outline" size="sm" onClick={() => addAction('tag')}>+ Tag Lead</Button>
                <Button variant="outline" size="sm" onClick={() => addAction('notify')}>+ Notify Email</Button>
              </div>
            </div>

            {/* Step 4: Retry */}
            <div className="space-y-3">
              <h4 className="font-display font-semibold text-sm text-primary">Step 4 - Retry Settings</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Label>Retry on failure:</Label><Switch checked={retryEnabled} onCheckedChange={setRetryEnabled} /></div>
                {retryEnabled && (
                  <>
                    <div className="flex items-center gap-2"><Label>Max:</Label>
                      <Select value={maxRetries.toString()} onValueChange={v => setMaxRetries(Number(v))}>
                        <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2"><Label>After:</Label>
                      <Select value={retryAfter} onValueChange={setRetryAfter}>
                        <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="5min">5 min</SelectItem><SelectItem value="15min">15 min</SelectItem><SelectItem value="1hr">1 hour</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuilder(false)}>Cancel</Button>
            <Button onClick={saveRule} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              {editingRule ? 'Update Rule' : 'Save Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
