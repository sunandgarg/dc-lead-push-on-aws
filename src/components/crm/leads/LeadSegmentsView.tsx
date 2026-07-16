import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Users,
  Filter,
  Layers,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LeadSegment, SegmentCondition } from '@/types/leadManagement';

const FIELD_OPTIONS = [
  { value: 'lead_score', label: 'Lead Score', type: 'number' },
  { value: 'lead_quality', label: 'Lead Quality', type: 'select', options: ['hot', 'warm', 'cold', 'unscored'] },
  { value: 'source', label: 'Lead Source', type: 'text' },
  { value: 'course', label: 'Course Interest', type: 'text' },
  { value: 'city', label: 'City', type: 'text' },
  { value: 'state', label: 'State', type: 'text' },
  { value: 'stage_id', label: 'Pipeline Stage', type: 'select' },
  { value: 'university_id', label: 'University', type: 'select' },
  { value: 'created_at', label: 'Created Date', type: 'date' },
  { value: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
];

const OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'in', label: 'Is One Of' },
];

export function LeadSegmentsView() {
  const [segments, setSegments] = useState<LeadSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();

  const [newSegment, setNewSegment] = useState({
    name: '',
    description: '',
    segment_type: 'dynamic' as 'dynamic' | 'static',
    conditions: [] as SegmentCondition[],
    logic: 'AND' as 'AND' | 'OR',
  });

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_segments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calculate lead counts sequentially to avoid overwhelming the DB
      const segments = data || [];
      const segmentsWithCounts = [];
      for (const segment of segments) {
        const count = await calculateSegmentCount(segment.filter_config);
        segmentsWithCounts.push({ 
          ...segment, 
          lead_count: count,
          filter_config: segment.filter_config as unknown as { conditions: SegmentCondition[]; logic: 'AND' | 'OR' },
        });
      }
      
      setSegments(segmentsWithCounts as unknown as LeadSegment[]);
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSegmentCount = async (filterConfig: any): Promise<number> => {
    try {
      // Simple count based on filter - in production this would be more sophisticated
      let query = supabase.from('crm_contacts').select('id', { count: 'exact', head: true });
      
      const conditions = filterConfig?.conditions || [];
      for (const cond of conditions) {
        if (cond.field === 'lead_quality' && cond.operator === 'equals') {
          query = query.eq('lead_quality', cond.value);
        } else if (cond.field === 'lead_score' && cond.operator === 'greater_than') {
          query = query.gt('lead_score', cond.value);
        }
      }
      
      const { count } = await query;
      return count || 0;
    } catch {
      return 0;
    }
  };

  const addCondition = () => {
    setNewSegment(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: 'lead_score', operator: 'greater_than', value: 0 }
      ]
    }));
  };

  const updateCondition = (index: number, updates: Partial<SegmentCondition>) => {
    setNewSegment(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => 
        i === index ? { ...c, ...updates } : c
      )
    }));
  };

  const removeCondition = (index: number) => {
    setNewSegment(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  };

  const handleAddSegment = async () => {
    if (!newSegment.name) {
      toast({ title: 'Error', description: 'Segment name is required', variant: 'destructive' });
      return;
    }

    try {
      const insertData = {
        name: newSegment.name,
        description: newSegment.description || null,
        segment_type: newSegment.segment_type,
        filter_config: JSON.parse(JSON.stringify({
          conditions: newSegment.conditions,
          logic: newSegment.logic,
        })),
        is_active: true,
      };

      const { error } = await supabase.from('lead_segments').insert([insertData]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Segment created' });
      setIsAddOpen(false);
      setNewSegment({
        name: '',
        description: '',
        segment_type: 'dynamic',
        conditions: [],
        logic: 'AND',
      });
      fetchSegments();
    } catch (error) {
      console.error('Error adding segment:', error);
      toast({ title: 'Error', description: 'Failed to create segment', variant: 'destructive' });
    }
  };

  const deleteSegment = async (segmentId: string) => {
    try {
      const { error } = await supabase
        .from('lead_segments')
        .delete()
        .eq('id', segmentId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Segment deleted' });
      fetchSegments();
    } catch (error) {
      console.error('Error deleting segment:', error);
      toast({ title: 'Error', description: 'Failed to delete segment', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading segments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lead Segments</h2>
          <p className="text-sm text-muted-foreground">
            Group leads by behavior, attributes, and engagement
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Lead Segment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Segment Name *</Label>
                  <Input
                    value={newSegment.name}
                    onChange={(e) => setNewSegment(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Hot Leads - MBA"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select 
                    value={newSegment.segment_type}
                    onValueChange={(v) => setNewSegment(prev => ({ ...prev, segment_type: v as 'dynamic' | 'static' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dynamic">Dynamic (auto-updates)</SelectItem>
                      <SelectItem value="static">Static (manual)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newSegment.description}
                  onChange={(e) => setNewSegment(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this segment..."
                />
              </div>

              {/* Filter Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Filter Conditions</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Match</span>
                    <Select 
                      value={newSegment.logic}
                      onValueChange={(v) => setNewSegment(prev => ({ ...prev, logic: v as 'AND' | 'OR' }))}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND">All</SelectItem>
                        <SelectItem value="OR">Any</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">conditions</span>
                  </div>
                </div>

                {newSegment.conditions.map((condition, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={condition.field}
                      onValueChange={(v) => updateCondition(index, { field: v })}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(v) => updateCondition(index, { operator: v as any })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1"
                    />

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button variant="outline" onClick={addCondition} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </Button>
              </div>

              <Button onClick={handleAddSegment} className="w-full">
                Create Segment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Segments</p>
          <p className="text-2xl font-bold">{segments.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Dynamic</p>
          <p className="text-2xl font-bold text-blue-600">
            {segments.filter(s => s.segment_type === 'dynamic').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Static</p>
          <p className="text-2xl font-bold text-purple-600">
            {segments.filter(s => s.segment_type === 'static').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-bold text-green-600">
            {segments.reduce((acc, s) => acc + s.lead_count, 0)}
          </p>
        </Card>
      </div>

      {/* Segments List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.length === 0 ? (
          <Card className="p-12 text-center col-span-full">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Segments</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first segment to group and target leads
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Segment
            </Button>
          </Card>
        ) : (
          segments.map(segment => (
            <Card key={segment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${segment.segment_type === 'dynamic' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                      {segment.segment_type === 'dynamic' ? (
                        <RefreshCw className="h-5 w-5" />
                      ) : (
                        <Users className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{segment.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {segment.segment_type}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Leads
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteSegment(segment.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {segment.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {segment.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{segment.lead_count} leads</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>{(segment.filter_config as any)?.conditions?.length || 0} filters</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
