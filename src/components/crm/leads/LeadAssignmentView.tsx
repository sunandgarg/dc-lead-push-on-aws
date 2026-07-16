import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Users,
  Shuffle,
  Scale,
  UserCheck,
  Filter,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AssignmentRule {
  id: string;
  name: string;
  description: string | null;
  assignment_type: string;
  criteria_config: Record<string, any>;
  assignee_config: Record<string, any>;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const ASSIGNMENT_TYPES = [
  { value: 'round_robin', label: 'Round Robin', icon: Shuffle, description: 'Distribute leads equally among team members' },
  { value: 'load_balanced', label: 'Load Balanced', icon: Scale, description: 'Assign based on current workload' },
  { value: 'criteria_based', label: 'Criteria Based', icon: Filter, description: 'Match leads to counselors based on rules' },
  { value: 'manual', label: 'Manual', icon: UserCheck, description: 'Assign leads manually' },
];

export function LeadAssignmentView() {
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    assignment_type: 'round_robin',
    priority: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_assignment_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules((data || []) as AssignmentRule[]);
    } catch (error) {
      console.error('Error fetching assignment rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!newRule.name) {
      toast({ title: 'Error', description: 'Rule name is required', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('lead_assignment_rules').insert([{
        name: newRule.name,
        description: newRule.description || null,
        assignment_type: newRule.assignment_type,
        priority: newRule.priority,
        is_active: newRule.is_active,
        criteria_config: {},
        assignee_config: { assignees: [] },
      }]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Assignment rule created' });
      setIsAddOpen(false);
      setNewRule({
        name: '',
        description: '',
        assignment_type: 'round_robin',
        priority: 0,
        is_active: true,
      });
      fetchRules();
    } catch (error) {
      console.error('Error adding rule:', error);
      toast({ title: 'Error', description: 'Failed to create rule', variant: 'destructive' });
    }
  };

  const toggleRuleActive = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_assignment_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('lead_assignment_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Rule deleted' });
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const getTypeInfo = (type: string) => {
    return ASSIGNMENT_TYPES.find(t => t.value === type) || ASSIGNMENT_TYPES[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading assignment rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lead Assignment Rules</h2>
          <p className="text-sm text-muted-foreground">
            Automatically distribute leads to your team
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Assignment Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., MBA Leads - Team A"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this assignment rule..."
                />
              </div>

              <div>
                <Label>Assignment Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ASSIGNMENT_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setNewRule(prev => ({ ...prev, assignment_type: type.value }))}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          newRule.assignment_type === type.value 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium text-sm">{type.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Priority (higher = runs first)</Label>
                <Input
                  type="number"
                  value={newRule.priority}
                  onChange={(e) => setNewRule(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={newRule.is_active}
                  onCheckedChange={(v) => setNewRule(prev => ({ ...prev, is_active: v }))}
                />
                <Label>Active</Label>
              </div>

              <Button onClick={handleAddRule} className="w-full">
                Create Rule
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Rules</p>
          <p className="text-2xl font-bold">{rules.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Rules</p>
          <p className="text-2xl font-bold text-green-600">
            {rules.filter(r => r.is_active).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Round Robin</p>
          <p className="text-2xl font-bold text-blue-600">
            {rules.filter(r => r.assignment_type === 'round_robin').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Load Balanced</p>
          <p className="text-2xl font-bold text-purple-600">
            {rules.filter(r => r.assignment_type === 'load_balanced').length}
          </p>
        </Card>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Assignment Rules</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first rule to start automatically assigning leads
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </Card>
        ) : (
          rules.map(rule => {
            const typeInfo = getTypeInfo(rule.assignment_type);
            const Icon = typeInfo.icon;
            return (
              <Card key={rule.id} className={`${!rule.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{rule.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {typeInfo.label}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Priority: {rule.priority}
                          </Badge>
                          {!rule.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(v) => toggleRuleActive(rule.id, v)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteRule(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
