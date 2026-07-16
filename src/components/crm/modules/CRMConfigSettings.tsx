import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  ArrowLeft, Settings2, Plus, Trash2, GripVertical,
  GitBranch, Database, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function CRMConfigSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [showAddStage, setShowAddStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('blue');
  const [newSourceText, setNewSourceText] = useState('');

  // Fetch pipeline stages from DB
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ['pipeline-stages-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pipeline_stages').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch app_settings for lead sources
  const { data: settingsData } = useQuery({
    queryKey: ['app-settings-crm'],
    queryFn: async () => {
      const { data, error } = await supabase.from('app_settings').select('*').in('key', ['lead_sources', 'cities']);
      if (error) throw error;
      return data || [];
    },
  });

  const leadSources: string[] = (() => {
    const row = settingsData?.find(s => s.key === 'lead_sources');
    try { return row?.value ? JSON.parse(row.value) : ['Google Ads', 'Meta Ads', 'Organic', 'Walk-in', 'Referral', 'Website', 'WhatsApp']; }
    catch { return ['Google Ads', 'Meta Ads', 'Organic', 'Walk-in', 'Referral', 'Website', 'WhatsApp']; }
  })();

  // Add stage mutation
  const addStageMutation = useMutation({
    mutationFn: async () => {
      if (!newStageName.trim()) throw new Error('Stage name required');
      const maxOrder = stages.length > 0 ? Math.max(...stages.map(s => s.sort_order)) + 1 : 0;
      const { error } = await supabase.from('pipeline_stages').insert({
        name: newStageName.trim(),
        color: newStageColor,
        sort_order: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages-config'] });
      toast({ title: 'Stage Added' });
      setNewStageName('');
      setShowAddStage(false);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Delete stage mutation
  const deleteStageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline-stages-config'] });
      toast({ title: 'Stage Deleted' });
    },
  });

  // Save lead sources
  const saveSourcesMutation = useMutation({
    mutationFn: async (sources: string[]) => {
      const { data: existing } = await supabase.from('app_settings').select('id').eq('key', 'lead_sources').single();
      if (existing) {
        await supabase.from('app_settings').update({ value: JSON.stringify(sources) }).eq('key', 'lead_sources');
      } else {
        await supabase.from('app_settings').insert({ key: 'lead_sources', value: JSON.stringify(sources) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings-crm'] });
      toast({ title: 'Sources Updated' });
    },
  });

  const stageColorMap: Record<string, string> = {
    blue: 'bg-blue-500', amber: 'bg-amber-500', purple: 'bg-purple-500',
    green: 'bg-green-500', red: 'bg-red-500', gray: 'bg-gray-500',
    cyan: 'bg-cyan-500', orange: 'bg-orange-500', pink: 'bg-pink-500',
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM Hub
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-emerald-500" /> CRM Configuration
        </h1>
        <p className="text-muted-foreground">Manage pipeline stages and master data</p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 shrink-0 space-y-1">
          {[
            { id: 'pipeline', label: 'Pipeline Stages', icon: GitBranch },
            { id: 'master', label: 'Master Data', icon: Database },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                <Icon className="h-4 w-4" />{tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          {/* Pipeline Stages */}
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Pipeline Stages</h2>
                  <p className="text-sm text-muted-foreground">Configure your lead pipeline stages (stored in database)</p>
                </div>
                <Button size="sm" onClick={() => setShowAddStage(true)} className="gap-1"><Plus className="h-3.5 w-3.5" /> Add Stage</Button>
              </div>

              {stagesLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : stages.length === 0 ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">
                  <p>No pipeline stages configured yet. Add your first stage.</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-3">
                  {stages.map((stage, idx) => (
                    <Card key={stage.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <div className={cn("w-3 h-3 rounded-full", stageColorMap[stage.color] || 'bg-gray-500')} />
                            <span className="font-semibold">{stage.name}</span>
                            <Badge variant="secondary" className="text-xs">Order: {stage.sort_order}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteStageMutation.mutate(stage.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Master Data */}
          {activeTab === 'master' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Lead Sources</CardTitle>
                    <div className="flex gap-2">
                      <Input placeholder="New source..." value={newSourceText} onChange={e => setNewSourceText(e.target.value)} className="w-48 h-8 text-sm" />
                      <Button size="sm" className="h-8" onClick={() => {
                        if (newSourceText.trim()) {
                          const updated = [...leadSources, newSourceText.trim()];
                          saveSourcesMutation.mutate(updated);
                          setNewSourceText('');
                        }
                      }}>Add</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {leadSources.map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-sm gap-2 py-1.5 px-3">
                        {s}
                        <button onClick={() => {
                          const updated = leadSources.filter((_, idx) => idx !== i);
                          saveSourcesMutation.mutate(updated);
                        }} className="hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Stage Dialog */}
      <Dialog open={showAddStage} onOpenChange={setShowAddStage}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Pipeline Stage</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Stage Name</Label><Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="E.g., Inquiry" /></div>
            <div><Label>Color</Label>
              <Select value={newStageColor} onValueChange={setNewStageColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(stageColorMap).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addStageMutation.mutate()} disabled={addStageMutation.isPending}>
              {addStageMutation.isPending ? 'Adding...' : 'Add Stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(CRMConfigSettings);
