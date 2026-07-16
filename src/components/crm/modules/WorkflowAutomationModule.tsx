import { memo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ReactFlow, {
  addEdge, useNodesState, useEdgesState, Controls, Background, MiniMap,
  Connection, Edge, Node, Handle, Position, MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Zap, GitBranch, Play, Clock, Mail, MessageSquare, Phone,
  UserPlus, Filter, Save, Plus, Trash2, Copy, Search, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Custom Node Components ────────────────────────────────
const TriggerNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 rounded-xl border-2 border-green-500 bg-green-500/10 shadow-lg min-w-[180px]">
    <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    <div className="flex items-center gap-2 mb-1">
      <Zap className="h-4 w-4 text-green-500" />
      <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Trigger</span>
    </div>
    <p className="text-sm font-medium text-foreground">{data.label}</p>
    {data.description && <p className="text-xs text-muted-foreground mt-1">{data.description}</p>}
  </div>
);

const ConditionNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 rounded-xl border-2 border-amber-500 bg-amber-500/10 shadow-lg min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
    <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    <div className="flex items-center gap-2 mb-1">
      <Filter className="h-4 w-4 text-amber-500" />
      <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Condition</span>
    </div>
    <p className="text-sm font-medium text-foreground">{data.label}</p>
    {data.description && <p className="text-xs text-muted-foreground mt-1">{data.description}</p>}
  </div>
);

const ActionNode = ({ data }: { data: any }) => {
  const iconMap: Record<string, any> = { email: Mail, whatsapp: MessageSquare, sms: Phone, assign: UserPlus };
  const Icon = iconMap[data.actionType] || Play;
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-blue-500 bg-blue-500/10 shadow-lg min-w-[180px]">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-blue-500" />
        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Action</span>
      </div>
      <p className="text-sm font-medium text-foreground">{data.label}</p>
      {data.description && <p className="text-xs text-muted-foreground mt-1">{data.description}</p>}
    </div>
  );
};

const DelayNode = ({ data }: { data: any }) => (
  <div className="px-4 py-3 rounded-xl border-2 border-purple-500 bg-purple-500/10 shadow-lg min-w-[180px]">
    <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
    <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    <div className="flex items-center gap-2 mb-1">
      <Clock className="h-4 w-4 text-purple-500" />
      <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Delay</span>
    </div>
    <p className="text-sm font-medium text-foreground">{data.label}</p>
  </div>
);

const nodeTypes = { trigger: TriggerNode, condition: ConditionNode, action: ActionNode, delay: DelayNode };

const defaultNewNodes: Node[] = [
  { id: '1', type: 'trigger', position: { x: 250, y: 0 }, data: { label: 'New Lead Created', description: 'When a lead is added' } },
  { id: '2', type: 'delay', position: { x: 250, y: 130 }, data: { label: 'Wait 5 Minutes' } },
  { id: '3', type: 'action', position: { x: 250, y: 250 }, data: { label: 'Send Welcome Message', actionType: 'whatsapp' } },
];
const defaultNewEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
  { id: 'e2-3', source: '2', target: '3', animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
];

const PALETTE_ITEMS = [
  { type: 'trigger', label: 'New Lead', icon: Zap, color: 'text-green-500 bg-green-500/10 border-green-500/30' },
  { type: 'trigger', label: 'Stage Changed', icon: GitBranch, color: 'text-green-500 bg-green-500/10 border-green-500/30' },
  { type: 'condition', label: 'Check Email Open', icon: Filter, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { type: 'action', label: 'Send WhatsApp', icon: MessageSquare, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { type: 'action', label: 'Send Email', icon: Mail, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { type: 'action', label: 'Assign', icon: UserPlus, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { type: 'delay', label: 'Delay / Wait', icon: Clock, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
];

export function WorkflowAutomationModule() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNewNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultNewEdges);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Fetch workflows from DB
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['marketing-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_workflows')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Save workflow mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: selectedWorkflow?.name || 'New Workflow',
        description: selectedWorkflow?.description || '',
        trigger_type: 'lead_created',
        status: 'draft' as const,
        nodes: nodes as any,
        edges: edges as any,
      };
      if (selectedWorkflow?.id) {
        const { error } = await supabase.from('marketing_workflows').update(payload).eq('id', selectedWorkflow.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('marketing_workflows').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-workflows'] });
      toast({ title: 'Workflow Saved' });
    },
    onError: () => toast({ title: 'Error saving workflow', variant: 'destructive' }),
  });

  // Delete workflow
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_workflows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-workflows'] });
      toast({ title: 'Workflow Deleted' });
    },
  });

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }, []);
  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow-type');
    const label = event.dataTransfer.getData('application/reactflow-label');
    if (!type) return;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = { x: event.clientX - bounds.left - 90, y: event.clientY - bounds.top - 25 };
    setNodes((nds) => [...nds, { id: `${Date.now()}`, type, position, data: { label, actionType: type === 'action' ? 'email' : undefined } }]);
  }, [setNodes]);

  const onDragStart = (event: React.DragEvent, type: string, label: string) => {
    event.dataTransfer.setData('application/reactflow-type', type);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const openWorkflow = (wf: any) => {
    setSelectedWorkflow(wf);
    const savedNodes = Array.isArray(wf.nodes) && wf.nodes.length > 0 ? wf.nodes : defaultNewNodes;
    const savedEdges = Array.isArray(wf.edges) && wf.edges.length > 0 ? wf.edges : defaultNewEdges;
    setNodes(savedNodes);
    setEdges(savedEdges);
    setView('builder');
  };

  const filteredWorkflows = workflows.filter(w => {
    const matchSearch = w.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (view === 'list') {
    const activeCount = workflows.filter(w => w.status === 'active').length;
    const draftCount = workflows.filter(w => w.status === 'draft').length;
    const totalRuns = workflows.reduce((s, w) => s + (w.execution_count || 0), 0);

    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/crm')} className="mb-3 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to CRM Hub
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><GitBranch className="h-6 w-6 text-orange-500" /> Visual Workflow Builder</h1>
              <p className="text-muted-foreground">Create automated workflows with drag-and-drop</p>
            </div>
            <Button onClick={() => { setSelectedWorkflow(null); setNodes(defaultNewNodes); setEdges(defaultNewEdges); setView('builder'); }} className="gap-2">
              <Plus className="h-4 w-4" /> New Workflow
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Workflows', value: workflows.length, color: 'text-foreground' },
            { label: 'Active', value: activeCount, color: 'text-green-500' },
            { label: 'Draft', value: draftCount, color: 'text-amber-500' },
            { label: 'Total Runs', value: totalRuns.toLocaleString(), color: 'text-blue-500' },
          ].map((stat, i) => (
            <Card key={i}><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search workflows..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : filteredWorkflows.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No workflows yet</p>
            <p className="text-sm">Create your first automated workflow</p>
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Trigger</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Total Runs</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Last Run</th>
                  <th className="text-right p-3 font-medium text-muted-foreground"></th>
                </tr></thead>
                <tbody>
                  {filteredWorkflows.map(w => (
                    <tr key={w.id} className="border-b hover:bg-muted/20 cursor-pointer" onClick={() => openWorkflow(w)}>
                      <td className="p-3 font-medium">{w.name}</td>
                      <td className="p-3">
                        <Badge variant={w.status === 'active' ? 'default' : 'secondary'} className={cn(
                          w.status === 'active' && 'bg-green-500/10 text-green-600 border-green-500/20',
                        )}>{w.status}</Badge>
                      </td>
                      <td className="p-3 text-xs">{w.trigger_type?.replace(/_/g, ' ')}</td>
                      <td className="p-3">{(w.execution_count || 0).toLocaleString()}</td>
                      <td className="p-3 text-muted-foreground text-xs">{w.last_executed_at ? new Date(w.last_executed_at).toLocaleDateString() : 'Never'}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); deleteMutation.mutate(w.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{selectedWorkflow?.name || 'New Workflow'}</h2>
            <p className="text-xs text-muted-foreground">Drag nodes from the panel to the canvas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r bg-card p-3 overflow-y-auto shrink-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Drag to Canvas</p>
          <div className="space-y-2">
            {PALETTE_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className={cn("flex items-center gap-2 p-2.5 rounded-lg border cursor-grab text-sm font-medium transition-all hover:shadow-md", item.color)} draggable onDragStart={(e) => onDragStart(e, item.type, item.label)}>
                  <Icon className="h-4 w-4 shrink-0" />{item.label}
                </div>
              );
            })}
          </div>
        </div>
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
            onConnect={onConnect} onDragOver={onDragOver} onDrop={onDrop}
            nodeTypes={nodeTypes} fitView className="bg-background"
          >
            <Controls className="!bg-card !border-border !shadow-md" />
            <MiniMap className="!bg-card !border-border" nodeStrokeWidth={3} />
            <Background gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default memo(WorkflowAutomationModule);
