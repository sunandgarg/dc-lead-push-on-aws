import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Play, Pause, Trash2, GripVertical, Mail, Smartphone, MessageSquare, 
  Clock, GitBranch, Zap, ChevronDown, ChevronUp, Users, Target, Settings
} from 'lucide-react';
import { 
  MarketingSequence, SequenceStep, StepType, SequenceTriggerType,
  SEQUENCE_TEMPLATES 
} from '@/types/marketingAutomation';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<StepType, any> = {
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageSquare,
  wait: Clock,
  condition: GitBranch,
  action: Zap,
  webhook: Zap,
};

const STEP_COLORS: Record<StepType, string> = {
  email: 'border-l-blue-500',
  sms: 'border-l-green-500',
  whatsapp: 'border-l-emerald-500',
  wait: 'border-l-yellow-500',
  condition: 'border-l-orange-500',
  action: 'border-l-purple-500',
  webhook: 'border-l-gray-500',
};

export function SequenceBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSequence, setSelectedSequence] = useState<MarketingSequence | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [newSequence, setNewSequence] = useState({
    name: '',
    description: '',
    trigger_type: 'manual' as SequenceTriggerType,
  });

  // Fetch sequences
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['marketing-sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_sequences')
        .select('*')
        .order('created_at', { ascending: false }) as any;
      if (error) throw error;
      return data as MarketingSequence[];
    },
  });

  // Fetch steps for selected sequence
  const { data: steps = [] } = useQuery({
    queryKey: ['sequence-steps', selectedSequence?.id],
    queryFn: async () => {
      if (!selectedSequence?.id) return [];
      const { data, error } = await supabase
        .from('marketing_sequence_steps')
        .select('*')
        .eq('sequence_id', selectedSequence.id)
        .order('step_order', { ascending: true }) as any;
      if (error) throw error;
      return data as SequenceStep[];
    },
    enabled: !!selectedSequence?.id,
  });

  // Create sequence mutation
  const createSequence = useMutation({
    mutationFn: async (data: Partial<MarketingSequence>) => {
      const { data: result, error } = await supabase
        .from('marketing_sequences')
        .insert([{
          name: data.name,
          description: data.description,
          trigger_type: data.trigger_type,
          trigger_config: {},
          entry_conditions: { logic: 'AND', conditions: [] },
          exit_conditions: { logic: 'AND', conditions: [] },
          goal_config: { enabled: false, type: 'stage_reached' },
        } as any])
        .select()
        .single();
      if (error) throw error;
      return result as unknown as MarketingSequence;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-sequences'] });
      setShowCreateModal(false);
      setSelectedSequence(data);
      toast({ title: 'Sequence created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating sequence', description: error.message, variant: 'destructive' });
    },
  });

  // Add step mutation
  const addStep = useMutation({
    mutationFn: async ({ sequenceId, stepType }: { sequenceId: string; stepType: StepType }) => {
      const { data, error } = await supabase
        .from('marketing_sequence_steps')
        .insert([{
          sequence_id: sequenceId,
          step_type: stepType,
          name: `New ${stepType} step`,
          step_order: steps.length,
          config: {},
          conditions: { logic: 'AND', conditions: [] },
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence-steps', selectedSequence?.id] });
      toast({ title: 'Step added' });
    },
  });

  // Update sequence status
  const updateSequenceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('marketing_sequences')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-sequences'] });
      toast({ title: 'Sequence updated' });
    },
  });

  // Delete step mutation
  const deleteStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('marketing_sequence_steps')
        .delete()
        .eq('id', stepId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence-steps', selectedSequence?.id] });
      toast({ title: 'Step deleted' });
    },
  });

  // Create from template
  const createFromTemplate = useMutation({
    mutationFn: async (template: typeof SEQUENCE_TEMPLATES[0]) => {
      // Create sequence
      const { data: sequence, error: seqError } = await supabase
        .from('marketing_sequences')
        .insert([{
          name: template.name,
          description: template.description,
          trigger_type: template.trigger_type,
          trigger_config: {},
          entry_conditions: { logic: 'AND', conditions: [] },
          exit_conditions: { logic: 'AND', conditions: [] },
          goal_config: { enabled: false, type: 'stage_reached' },
        } as any])
        .select()
        .single();
      if (seqError) throw seqError;

      // Create steps
      const stepsToInsert = template.steps.map((step, idx) => ({
        sequence_id: sequence.id,
        step_order: idx,
        step_type: step.step_type,
        name: step.name,
        config: step.config,
        delay_amount: step.delay_amount,
        delay_unit: step.delay_unit,
        conditions: step.conditions,
        is_active: step.is_active,
      }));

      const { error: stepsError } = await supabase
        .from('marketing_sequence_steps')
        .insert(stepsToInsert as any);
      if (stepsError) throw stepsError;

      return sequence as unknown as MarketingSequence;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-sequences'] });
      setShowTemplateModal(false);
      setSelectedSequence(data);
      toast({ title: 'Sequence created from template' });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      active: 'default',
      paused: 'outline',
      completed: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Drip Sequences</h2>
          <p className="text-muted-foreground">Create automated multi-step campaigns</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Choose a Template</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                {SEQUENCE_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => createFromTemplate.mutate(template)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">{template.category}</Badge>
                        <Badge variant="secondary">{template.steps.length} steps</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Sequence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Sequence</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newSequence.name}
                    onChange={(e) => setNewSequence({ ...newSequence, name: e.target.value })}
                    placeholder="Welcome Sequence"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newSequence.description}
                    onChange={(e) => setNewSequence({ ...newSequence, description: e.target.value })}
                    placeholder="Describe your sequence..."
                  />
                </div>
                <div>
                  <Label>Trigger</Label>
                  <Select
                    value={newSequence.trigger_type}
                    onValueChange={(v) => setNewSequence({ ...newSequence, trigger_type: v as SequenceTriggerType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Enrollment</SelectItem>
                      <SelectItem value="lead_created">Lead Created</SelectItem>
                      <SelectItem value="form_submitted">Form Submitted</SelectItem>
                      <SelectItem value="stage_change">Stage Changed</SelectItem>
                      <SelectItem value="score_change">Score Changed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => createSequence.mutate(newSequence)} 
                  disabled={!newSequence.name || createSequence.isPending}
                  className="w-full"
                >
                  Create Sequence
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sequence List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Your Sequences</h3>
          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
          ) : sequences.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sequences yet. Create your first one!</p>
            </Card>
          ) : (
            sequences.map((seq) => (
              <Card 
                key={seq.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary',
                  selectedSequence?.id === seq.id && 'border-primary ring-1 ring-primary'
                )}
                onClick={() => setSelectedSequence(seq)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{seq.name}</h4>
                    {getStatusBadge(seq.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{seq.description}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {seq.enrolled_count} enrolled
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {seq.goal_achieved_count} converted
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Sequence Editor */}
        <div className="lg:col-span-2">
          {selectedSequence ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedSequence.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{selectedSequence.description}</p>
                </div>
                <div className="flex gap-2">
                  {selectedSequence.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateSequenceStatus.mutate({ id: selectedSequence.id, status: 'paused' })}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => updateSequenceStatus.mutate({ id: selectedSequence.id, status: 'active' })}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Steps */}
                <div className="space-y-3">
                  {steps.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No steps yet. Add your first step below.</p>
                    </div>
                  ) : (
                    steps.map((step, idx) => {
                      const Icon = STEP_ICONS[step.step_type] || Zap;
                      return (
                        <div key={step.id} className="relative">
                          {idx > 0 && (
                            <div className="absolute left-6 -top-3 w-0.5 h-3 bg-border" />
                          )}
                          <Card className={cn('border-l-4', STEP_COLORS[step.step_type])}>
                            <CardContent className="p-4 flex items-center gap-4">
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{step.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {step.delay_amount > 0 && `Wait ${step.delay_amount} ${step.delay_unit} → `}
                                  {step.step_type}
                                </p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteStep.mutate(step.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Add Step */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <span className="text-sm text-muted-foreground w-full mb-2">Add step:</span>
                  {(['email', 'sms', 'whatsapp', 'wait', 'condition'] as StepType[]).map((type) => {
                    const Icon = STEP_ICONS[type];
                    return (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => addStep.mutate({ sequenceId: selectedSequence.id, stepType: type })}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a sequence to edit or create a new one</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
