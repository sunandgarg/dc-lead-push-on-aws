import { memo, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, ExternalLink, Copy, Search, Edit2, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UTMLinksViewProps {
  universities: any[];
  onRefresh?: () => void;
}

export function UTMLinksView({ universities, onRefresh }: UTMLinksViewProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { withUtm, withoutUtm } = useMemo(() => {
    const term = search.toLowerCase().trim();
    const all = universities.filter(u => {
      if (!term) return true;
      return u.name?.toLowerCase().includes(term) || u.utm_link?.toLowerCase().includes(term);
    });
    return {
      withUtm: all.filter(u => u.utm_link?.trim()),
      withoutUtm: all.filter(u => !u.utm_link?.trim()),
    };
  }, [universities, search]);

  const startEdit = useCallback((uni: any) => {
    setEditingId(uni.id);
    setEditValue(uni.utm_link || '');
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  const saveUtmLink = useCallback(async (uniId: string) => {
    setSaving(true);
    const { error } = await supabase
      .from('universities')
      .update({ utm_link: editValue.trim() || null })
      .eq('id', uniId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: 'Failed to save UTM link', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'UTM link updated' });
      setEditingId(null);
      setEditValue('');
      onRefresh?.();
    }
  }, [editValue, toast, onRefresh]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'UTM link copied to clipboard' });
  };

  const renderRow = (uni: any) => {
    const isEditing = editingId === uni.id;

    return (
      <tr key={uni.id} className="border-b border-border hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <p className="font-medium text-foreground">{uni.name}</p>
        </td>
        <td className="px-4 py-3">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="https://example.com/?utm_source=..."
                className="text-sm h-8"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => saveUtmLink(uni.id)} disabled={saving}>
                <Check className="h-3.5 w-3.5 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={cancelEdit}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : uni.utm_link?.trim() ? (
            <code className="text-xs bg-muted px-2 py-1 rounded truncate block max-w-md">
              {uni.utm_link}
            </code>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {!isEditing && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(uni)}>
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {uni.utm_link?.trim() && !isEditing && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(uni.utm_link)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={uni.utm_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/lead-push')}
        className="text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Lead Push
      </Button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            UTM Links
          </h1>
          <p className="text-muted-foreground">
            {withUtm.length} of {universities.length} universities have UTM links
          </p>
        </div>
        {withoutUtm.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show only with UTM' : `Show all (${withoutUtm.length} without UTM)`}
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search universities or UTM links..."
          className="pl-10"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">University</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">UTM Link</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {withUtm.map(renderRow)}
            {showAll && withoutUtm.length > 0 && (
              <>
                {withUtm.length > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 bg-muted/30">
                      <Badge variant="outline" className="text-xs">Without UTM Link</Badge>
                    </td>
                  </tr>
                )}
                {withoutUtm.map(renderRow)}
              </>
            )}
            {withUtm.length === 0 && !showAll && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No UTM links configured yet. Click "Show all" to add UTM links to universities.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(UTMLinksView);
