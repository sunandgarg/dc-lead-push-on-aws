import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Play, Pause, Settings, Trash2, 
  Zap, Mail, Smartphone, MessageSquare, Clock, GitBranch,
  Edit, UserPlus, Tag, Globe, CircleX, ArrowRight
} from 'lucide-react';
import { MarketingWorkflow, WorkflowNode, WorkflowEdge, NodeType, WORKFLOW_NODE_TYPES, WorkflowTriggerType } from '@/types/marketingAutomation';
import { cn } from '@/lib/utils';

const NODE_ICONS: Record<NodeType, any> = {
  trigger: Zap,
  email: Mail,
  sms: Smartphone,
  whatsapp: MessageSquare,
  wait: Clock,
  condition: GitBranch,
  update_field: Edit,
  assign: UserPlus,
  add_tag: Tag,
  webhook: Globe,
  end: CircleX,
};

export function WorkflowBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<MarketingWorkflow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    trigger_type: 'lead_created' as WorkflowTriggerType,
  });

  // Fetch workflows
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['marketing-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_workflows')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(w => ({
        ...w,
        nodes: Array.isArray(w.nodes) ? w.nodes : [],
        edges: Array.isArray(w.edges) ? w.edges : [],
      })) as unknown as MarketingWorkflow[];
    },
  });

  // Create workflow
  const createWorkflow = useMutation({
    mutationFn: async (data: typeof newWorkflow) => {
      const initialNodes = [
        {
          id: 'trigger-1',
          type: 'trigger',
          label: 'Trigger',
          position: { x: 250, y: 50 },
          config: { trigger_type: data.trigger_type },
        },
      ];

      const { data: result, error } = await supabase
        .from('marketing_workflows')
        .insert([{
          name: data.name,
          description: data.description,
          trigger_type: data.trigger_type,
          trigger_config: {},
          nodes: initialNodes as any,
          edges: [] as any,
          status: 'draft',
        }])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-workflows'] });
      setShowCreateModal(false);
      setSelectedWorkflow({
        ...data,
        nodes: Array.isArray(data.nodes) ? (data.nodes as unknown as WorkflowNode[]) : [],
        edges: Array.isArray(data.edges) ? (data.edges as unknown as WorkflowEdge[]) : [],
      } as MarketingWorkflow);
      toast({ title: 'Workflow created successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error creating workflow', description: error.message, variant: 'destructive' });
    },
  });

  // Add node to workflow
  const addNode = useCallback(async (nodeType: NodeType) => {
    if (!selectedWorkflow) return;

    const newNode = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      label: WORKFLOW_NODE_TYPES.find(n => n.type === nodeType)?.label || nodeType,
      position: { 
        x: 250, 
        y: (selectedWorkflow.nodes.length) * 100 + 50 
      },
      config: {},
    };

    const updatedNodes = [...selectedWorkflow.nodes, newNode];
    
    // Auto-connect to last node
    const lastNode = selectedWorkflow.nodes[selectedWorkflow.nodes.length - 1];
    const updatedEdges = lastNode ? [
      ...selectedWorkflow.edges,
      { id: `edge-${Date.now()}`, source: lastNode.id, target: newNode.id }
    ] : selectedWorkflow.edges;

    const { error } = await supabase
      .from('marketing_workflows')
      .update({ nodes: updatedNodes as any, edges: updatedEdges as any })
      .eq('id', selectedWorkflow.id);

    if (error) {
      toast({ title: 'Error adding node', variant: 'destructive' });
      return;
    }

    setSelectedWorkflow({
      ...selectedWorkflow,
      nodes: updatedNodes,
      edges: updatedEdges,
    });
    queryClient.invalidateQueries({ queryKey: ['marketing-workflows'] });
  }, [selectedWorkflow, queryClient, toast]);

  // Delete node
  const deleteNode = useCallback(async (nodeId: string) => {
    if (!selectedWorkflow) return;
    
    const updatedNodes = selectedWorkflow.nodes.filter(n => n.id !== nodeId);
    const updatedEdges = selectedWorkflow.edges.filter(
      e => e.source !== nodeId && e.target !== nodeId
    );

    const { error } = await supabase
      .from('marketing_workflows')
      .update({ nodes: updatedNodes as any, edges: updatedEdges as any })
      .eq('id', selectedWorkflow.id);

    if (!error) {
      setSelectedWorkflow({
        ...selectedWorkflow,
        nodes: updatedNodes,
        edges: updatedEdges,
      });
      queryClient.invalidateQueries({ queryKey: ['marketing-workflows'] });
    }
  }, [selectedWorkflow, queryClient]);

  // Update workflow status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('marketing_workflows')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-workflows'] });
      toast({ title: 'Workflow updated' });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      active: 'default',
      paused: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Workflow Automation</h2>
          <p className="text-muted-foreground">Build visual automation workflows</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newWorkflow.name}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                  placeholder="Lead Follow-up Workflow"
                />
              </div>
              <div>
                <Label>Trigger</Label>
                <Select
                  value={newWorkflow.trigger_type}
                  onValueChange={(v) => setNewWorkflow({ ...newWorkflow, trigger_type: v as WorkflowTriggerType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead_created">Lead Created</SelectItem>
                    <SelectItem value="form_submitted">Form Submitted</SelectItem>
                    <SelectItem value="stage_change">Stage Changed</SelectItem>
                    <SelectItem value="score_change">Score Changed</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="schedule">Schedule</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => createWorkflow.mutate(newWorkflow)} 
                disabled={!newWorkflow.name || createWorkflow.isPending}
                className="w-full"
              >
                Create Workflow
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Workflow List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Your Workflows</h3>
          {isLoading ? (
            <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
          ) : workflows.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No workflows yet</p>
            </Card>
          ) : (
            workflows.map((wf) => (
              <Card 
                key={wf.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary',
                  selectedWorkflow?.id === wf.id && 'border-primary ring-1 ring-primary'
                )}
                onClick={() => setSelectedWorkflow(wf)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium truncate">{wf.name}</h4>
                    {getStatusBadge(wf.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {wf.trigger_type.replace('_', ' ')}
                    </Badge>
                    <span>{wf.nodes.length} nodes</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Workflow Canvas */}
        <div className="lg:col-span-3">
          {selectedWorkflow ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between py-3 border-b">
                <div>
                  <CardTitle className="text-lg">{selectedWorkflow.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Trigger: {selectedWorkflow.trigger_type.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedWorkflow.status === 'active' ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: selectedWorkflow.id, status: 'paused' })}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: selectedWorkflow.id, status: 'active' })}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Activate
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <div className="flex flex-1 overflow-hidden">
                {/* Node Palette */}
                <div className="w-48 border-r p-3 bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Add Node</p>
                  <ScrollArea className="h-full">
                    <div className="space-y-2">
                      {WORKFLOW_NODE_TYPES.filter(n => n.type !== 'trigger').map((nodeType) => {
                        const Icon = NODE_ICONS[nodeType.type];
                        return (
                          <Button
                            key={nodeType.type}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => addNode(nodeType.type)}
                          >
                            <div className={cn('w-6 h-6 rounded flex items-center justify-center mr-2', nodeType.color)}>
                              <Icon className="h-3 w-3 text-white" />
                            </div>
                            {nodeType.label}
                          </Button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Canvas */}
                <div className="flex-1 p-6 overflow-auto bg-[radial-gradient(circle,_hsl(var(--muted))_1px,_transparent_1px)] bg-[size:20px_20px]">
                  <div className="space-y-4">
                    {selectedWorkflow.nodes.map((node, idx) => {
                      const Icon = NODE_ICONS[node.type] || Zap;
                      const nodeConfig = WORKFLOW_NODE_TYPES.find(n => n.type === node.type);
                      
                      return (
                        <div key={node.id} className="relative">
                          {idx > 0 && (
                            <div className="flex justify-center mb-2">
                              <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                            </div>
                          )}
                          <Card className="max-w-xs mx-auto">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', nodeConfig?.color || 'bg-muted')}>
                                <Icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{node.label}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {node.type}
                                </p>
                              </div>
                              {node.type !== 'trigger' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => deleteNode(node.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a workflow to edit or create a new one</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
