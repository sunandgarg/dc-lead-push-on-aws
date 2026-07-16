import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Zap, 
  TrendingUp, 
  TrendingDown,
  Mail,
  MousePointer,
  Globe,
  FileText,
  Phone,
  Calendar,
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
import type { LeadScoringRule } from '@/types/leadManagement';

const CONDITION_TYPES = [
  { value: 'email_opened', label: 'Email Opened', icon: Mail, category: 'engagement' },
  { value: 'email_clicked', label: 'Email Link Clicked', icon: MousePointer, category: 'engagement' },
  { value: 'page_visited', label: 'Page Visited', icon: Globe, category: 'behavior' },
  { value: 'form_submitted', label: 'Form Submitted', icon: FileText, category: 'behavior' },
  { value: 'call_completed', label: 'Call Completed', icon: Phone, category: 'engagement' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', icon: Calendar, category: 'engagement' },
  { value: 'course_match', label: 'Course Match', icon: Zap, category: 'fit' },
  { value: 'location_match', label: 'Location Match', icon: Globe, category: 'demographic' },
  { value: 'score_threshold', label: 'Score Threshold', icon: TrendingUp, category: 'fit' },
  { value: 'inactive_days', label: 'Days Inactive', icon: TrendingDown, category: 'behavior' },
];

const CATEGORIES = [
  { value: 'engagement', label: 'Engagement', color: 'bg-blue-500' },
  { value: 'behavior', label: 'Behavior', color: 'bg-green-500' },
  { value: 'demographic', label: 'Demographic', color: 'bg-purple-500' },
  { value: 'fit', label: 'Lead Fit', color: 'bg-orange-500' },
];

export function LeadScoringView() {
  const [rules, setRules] = useState<LeadScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    category: 'engagement',
    condition_type: 'email_opened',
    condition_config: {} as Record<string, any>,
    score_value: 10,
    is_active: true,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRules((data || []) as LeadScoringRule[]);
    } catch (error) {
      console.error('Error fetching scoring rules:', error);
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
      const { error } = await supabase.from('lead_scoring_rules').insert({
        name: newRule.name,
        description: newRule.description || null,
        category: newRule.category,
        condition_type: newRule.condition_type,
        condition_config: newRule.condition_config,
        score_value: newRule.score_value,
        is_active: newRule.is_active,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Scoring rule created' });
      setIsAddOpen(false);
      setNewRule({
        name: '',
        description: '',
        category: 'engagement',
        condition_type: 'email_opened',
        condition_config: {},
        score_value: 10,
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
        .from('lead_scoring_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;
      fetchRules();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast({ title: 'Error', description: 'Failed to update rule', variant: 'destructive' });
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('lead_scoring_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Rule deleted' });
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast({ title: 'Error', description: 'Failed to delete rule', variant: 'destructive' });
    }
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-500';
  };

  const getConditionIcon = (conditionType: string) => {
    const condition = CONDITION_TYPES.find(c => c.value === conditionType);
    return condition?.icon || Zap;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading scoring rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lead Scoring Rules</h2>
          <p className="text-sm text-muted-foreground">
            Automatically score leads based on their behavior and attributes
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
              <DialogTitle>Create Scoring Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={newRule.name}
                  onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Email Engagement Bonus"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe when this rule applies..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={newRule.category}
                    onValueChange={(v) => setNewRule(prev => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                            {cat.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Condition</Label>
                  <Select 
                    value={newRule.condition_type}
                    onValueChange={(v) => setNewRule(prev => ({ ...prev, condition_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_TYPES.map(cond => (
                        <SelectItem key={cond.value} value={cond.value}>
                          <div className="flex items-center gap-2">
                            <cond.icon className="h-4 w-4" />
                            {cond.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Score Points</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={newRule.score_value}
                    onChange={(e) => setNewRule(prev => ({ ...prev, score_value: parseInt(e.target.value) || 0 }))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    {newRule.score_value > 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" /> Increases score
                      </span>
                    ) : newRule.score_value < 0 ? (
                      <span className="text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" /> Decreases score
                      </span>
                    ) : (
                      'No effect'
                    )}
                  </span>
                </div>
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
          <p className="text-sm text-muted-foreground">Positive Rules</p>
          <p className="text-2xl font-bold text-blue-600">
            {rules.filter(r => r.score_value > 0).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Negative Rules</p>
          <p className="text-2xl font-bold text-red-600">
            {rules.filter(r => r.score_value < 0).length}
          </p>
        </Card>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <Card className="p-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Scoring Rules</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first scoring rule to start automatically scoring leads
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </Card>
        ) : (
          rules.map(rule => {
            const Icon = getConditionIcon(rule.condition_type);
            return (
              <Card key={rule.id} className={`${!rule.is_active ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${getCategoryColor(rule.category)} bg-opacity-10`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{rule.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORIES.find(c => c.value === rule.category)?.label}
                          </Badge>
                          {!rule.is_active && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Trigger: {CONDITION_TYPES.find(c => c.value === rule.condition_type)?.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${rule.score_value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {rule.score_value > 0 ? '+' : ''}{rule.score_value}
                        </p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
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
