import { memo, useState } from 'react';
import { Star, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PresetManagerProps {
  presets: any[];
  universities: any[];
  selectedIds: string[];
  onApply: (preset: any) => void;
  onChange: () => void;
}

export const PresetManager = memo(function PresetManager({
  presets,
  universities,
  selectedIds,
  onApply,
  onChange,
}: PresetManagerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const saveCurrent = async () => {
    if (!name.trim() || !selectedIds.length) {
      toast({ title: 'Name and selection required', variant: 'destructive' });
      return;
    }
    if (isDefault) {
      // unset other defaults
      await supabase.from('multi_push_presets').update({ is_default: false }).eq('is_default', true);
    }
    const { error } = await supabase.from('multi_push_presets').insert({
      name: name.trim(),
      university_ids: selectedIds,
      is_default: isDefault,
    });
    if (error) {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
      return;
    }
    setName('');
    setIsDefault(false);
    setOpen(false);
    onChange();
    toast({ title: 'Preset saved', description: `${selectedIds.length} universities · ${name}` });
  };

  const deletePreset = async (id: string) => {
    await supabase.from('multi_push_presets').delete().eq('id', id);
    onChange();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase text-muted-foreground">Saved Presets</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!selectedIds.length}>
              <Plus className="h-3 w-3 mr-1" /> Save current as preset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Preset name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Top 5 Engineering" />
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedIds.length} universities will be saved.
              </p>
              <div className="flex items-center gap-2">
                <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} id="def" />
                <Label htmlFor="def" className="text-sm">Make default (auto-load on open)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveCurrent}>
                <Save className="h-4 w-4 mr-2" /> Save Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {presets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No presets yet - select universities and save your first preset.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <div key={p.id} className="inline-flex items-center gap-1 border rounded-md pl-2 pr-1 py-1 bg-muted/40">
              <button
                className="text-sm font-medium flex items-center gap-1.5"
                onClick={() => onApply(p)}
                type="button"
              >
                {p.is_default && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />}
                {p.name}
                <Badge variant="secondary" className="text-[10px] h-4">{p.university_ids?.length || 0}</Badge>
              </button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deletePreset(p.id)}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
