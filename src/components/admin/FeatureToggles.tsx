import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown, ChevronRight, Power, Search, RefreshCw, Loader2,
  Shield, Zap, LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureToggle {
  id: string;
  feature_key: string;
  label: string;
  parent_key: string | null;
  is_enabled: boolean;
  sort_order: number;
  updated_at: string;
}

interface ToggleTree {
  toggle: FeatureToggle;
  children: ToggleTree[];
}

export function FeatureToggles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: toggles = [], isLoading } = useQuery({
    queryKey: ['feature-toggles-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_toggles')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as FeatureToggle[];
    },
  });

  // Build tree structure
  const tree = useMemo(() => {
    const roots: ToggleTree[] = [];
    const childMap = new Map<string, ToggleTree[]>();

    // Group children by parent
    toggles.forEach(t => {
      if (t.parent_key) {
        if (!childMap.has(t.parent_key)) childMap.set(t.parent_key, []);
        childMap.get(t.parent_key)!.push({ toggle: t, children: [] });
      }
    });

    // Build roots with children
    toggles.forEach(t => {
      if (!t.parent_key) {
        roots.push({
          toggle: t,
          children: childMap.get(t.feature_key) || [],
        });
      }
    });

    return roots;
  }, [toggles]);

  // Auto-expand all groups on load
  useEffect(() => {
    if (tree.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(tree.map(t => t.toggle.feature_key)));
    }
  }, [tree]);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('feature_toggles')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-toggles-admin'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const bulkToggleMutation = useMutation({
    mutationFn: async ({ parentKey, enabled }: { parentKey: string; enabled: boolean }) => {
      // Toggle parent
      const parent = toggles.find(t => t.feature_key === parentKey);
      if (parent) {
        await supabase.from('feature_toggles')
          .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
          .eq('id', parent.id);
      }
      // Toggle all children
      const children = toggles.filter(t => t.parent_key === parentKey);
      if (children.length > 0) {
        await supabase.from('feature_toggles')
          .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
          .in('id', children.map(c => c.id));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-toggles-admin'] });
      toast({ title: 'Updated', description: 'All features toggled' });
    },
  });

  const handleToggle = (id: string, enabled: boolean) => {
    toggleMutation.mutate({ id, enabled });
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();
    return tree.filter(node =>
      node.toggle.label.toLowerCase().includes(q) ||
      node.toggle.feature_key.toLowerCase().includes(q) ||
      node.children.some(c =>
        c.toggle.label.toLowerCase().includes(q) ||
        c.toggle.feature_key.toLowerCase().includes(q)
      )
    );
  }, [tree, searchQuery]);

  const stats = useMemo(() => {
    const total = toggles.length;
    const enabled = toggles.filter(t => t.is_enabled).length;
    const disabled = total - enabled;
    const parents = toggles.filter(t => !t.parent_key).length;
    return { total, enabled, disabled, parents };
  }, [toggles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Power className="h-5 w-5 text-primary" />
            Feature Toggles
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enable or disable modules and their sub-features across the entire platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['feature-toggles-admin'] })}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Modules</p>
              <p className="text-lg font-bold">{stats.parents}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Features</p>
              <p className="text-lg font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Enabled</p>
              <p className="text-lg font-bold text-primary">{stats.enabled}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Disabled</p>
              <p className="text-lg font-bold text-destructive">{stats.disabled}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search features..."
          className="pl-9"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Feature Tree */}
      <div className="space-y-3">
        {filteredTree.map(node => {
          const isExpanded = expandedGroups.has(node.toggle.feature_key);
          const hasChildren = node.children.length > 0;
          const enabledChildren = node.children.filter(c => c.toggle.is_enabled).length;
          const allChildrenEnabled = hasChildren && enabledChildren === node.children.length;
          

          return (
            <Card key={node.toggle.id} className={cn(
              "overflow-hidden transition-all",
              !node.toggle.is_enabled && "opacity-60"
            )}>
              {/* Parent row */}
              <div className="flex items-center gap-3 p-4 border-b border-border/50">
                {hasChildren ? (
                  <button
                    onClick={() => toggleGroup(node.toggle.feature_key)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    }
                  </button>
                ) : (
                  <div className="w-6" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{node.toggle.label}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {node.toggle.feature_key}
                    </Badge>
                    {hasChildren && (
                      <Badge variant="secondary" className="text-[10px]">
                        {enabledChildren}/{node.children.length} active
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {hasChildren && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => bulkToggleMutation.mutate({
                        parentKey: node.toggle.feature_key,
                        enabled: !allChildrenEnabled
                      })}
                    >
                      {allChildrenEnabled ? 'Disable All' : 'Enable All'}
                    </Button>
                  )}
                  <Switch
                    checked={node.toggle.is_enabled}
                    onCheckedChange={(checked) => handleToggle(node.toggle.id, checked)}
                  />
                </div>
              </div>

              {/* Children */}
              {hasChildren && isExpanded && (
                <div className="bg-muted/20">
                  {node.children.map(child => (
                    <div
                      key={child.toggle.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0",
                        !child.toggle.is_enabled && "opacity-50"
                      )}
                    >
                      <div className="w-6" />
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{child.toggle.label}</span>
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {child.toggle.feature_key}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={child.toggle.is_enabled}
                        onCheckedChange={(checked) => handleToggle(child.toggle.id, checked)}
                        disabled={!node.toggle.is_enabled}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredTree.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No features match your search.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
