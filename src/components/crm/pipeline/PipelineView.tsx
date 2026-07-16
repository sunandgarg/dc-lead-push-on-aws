import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  GripVertical, 
  User,
  Phone,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PipelineViewProps {
  universities: any[];
}

interface Stage {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
  course: string | null;
  stage_id: string | null;
  priority: string | null;
  created_at: string;
}

export function PipelineView({ universities }: PipelineViewProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedContact, setDraggedContact] = useState<Contact | null>(null);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const stagesRes = await supabase.from('pipeline_stages').select('*').order('sort_order');
      setStages(stagesRes.data || []);
      
      // Fetch contacts in batches to bypass 1000-row limit
      let allContacts: Contact[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('crm_contacts')
          .select('id, name, email, mobile, course, stage_id, priority, created_at')
          .order('created_at', { ascending: false })
          .range(from, from + batchSize - 1);
        if (error) throw error;
        allContacts = allContacts.concat(data || []);
        if (!data || data.length < batchSize) break;
        from += batchSize;
      }
      setContacts(allContacts);
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (contact: Contact) => {
    setDraggedContact(contact);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stageId: string) => {
    if (!draggedContact || draggedContact.stage_id === stageId) {
      setDraggedContact(null);
      return;
    }

    try {
      const newStageId = stageId || null;
      const { error } = await supabase
        .from('crm_contacts')
        .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
        .eq('id', draggedContact.id);

      if (error) throw error;

      setContacts(prev => prev.map(c => 
        c.id === draggedContact.id ? { ...c, stage_id: stageId } : c
      ));

      // Log activity
      await supabase.from('crm_activities').insert({
        contact_id: draggedContact.id,
        type: 'stage_change',
        title: 'Stage Changed',
        description: `Moved to ${stages.find(s => s.id === stageId)?.name}`,
      });

      toast({ title: 'Contact moved', description: 'Stage updated successfully' });
    } catch (error) {
      console.error('Error updating contact stage:', error);
      toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
    }

    setDraggedContact(null);
  };

  const handleEditStage = (stage: Stage) => {
    setEditingStage(stage);
    setNewStageName(stage.name);
    setNewStageColor(stage.color);
    setIsAddStageOpen(true);
  };

  const handleDeleteStage = async (stageId: string) => {
    const stageContacts = contacts.filter(c => c.stage_id === stageId);
    if (stageContacts.length > 0) {
      toast({ title: 'Cannot delete', description: `Stage has ${stageContacts.length} contacts. Move them first.`, variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('pipeline_stages').delete().eq('id', stageId);
      if (error) throw error;
      toast({ title: 'Stage deleted' });
      fetchData();
    } catch (error) {
      console.error('Error deleting stage:', error);
      toast({ title: 'Error', description: 'Failed to delete stage', variant: 'destructive' });
    }
  };

  const handleSaveStage = async () => {
    if (!newStageName.trim()) return;

    try {
      if (editingStage) {
        // Update existing stage
        const { error } = await supabase.from('pipeline_stages').update({
          name: newStageName,
          color: newStageColor,
        }).eq('id', editingStage.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Stage updated' });
      } else {
        // Add new stage
        const maxOrder = Math.max(...stages.map(s => s.sort_order), 0);
        const { error } = await supabase.from('pipeline_stages').insert({
          name: newStageName,
          color: newStageColor,
          sort_order: maxOrder + 1,
        });
        if (error) throw error;
        toast({ title: 'Success', description: 'Stage added' });
      }

      setIsAddStageOpen(false);
      setEditingStage(null);
      setNewStageName('');
      fetchData();
    } catch (error) {
      console.error('Error saving stage:', error);
      toast({ title: 'Error', description: 'Failed to save stage', variant: 'destructive' });
    }
  };

  const getContactsByStage = (stageId: string) => {
    return contacts.filter(c => c.stage_id === stageId);
  };

  const getUnassignedContacts = () => {
    return contacts.filter(c => !c.stage_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Sales Pipeline</h2>
          <p className="text-sm text-muted-foreground">Drag and drop contacts to move them between stages</p>
        </div>
        <Dialog open={isAddStageOpen} onOpenChange={(open) => {
          setIsAddStageOpen(open);
          if (!open) { setEditingStage(null); setNewStageName(''); setNewStageColor('#3b82f6'); }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStage ? 'Edit Stage' : 'Add New Stage'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Stage Name</Label>
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="e.g., Qualified"
                />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewStageColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${newStageColor === color ? 'border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <Button onClick={handleSaveStage} className="w-full">
                {editingStage ? 'Update Stage' : 'Add Stage'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Unassigned Column */}
        <div 
          className="min-w-[280px] bg-muted/30 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="font-medium">Unassigned</span>
              <Badge variant="secondary" className="ml-2">
                {getUnassignedContacts().length}
              </Badge>
            </div>
          </div>
          <div className="space-y-3">
            {getUnassignedContacts().map(contact => (
              <ContactCard 
                key={contact.id} 
                contact={contact} 
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </div>

        {/* Stage Columns */}
        {stages.map(stage => (
          <div
            key={stage.id}
            className="min-w-[280px] bg-muted/30 rounded-lg p-4"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(stage.id)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="font-medium">{stage.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {getContactsByStage(stage.id).length}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEditStage(stage)}>Edit Stage</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteStage(stage.id)}>Delete Stage</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-3">
              {getContactsByStage(stage.id).map(contact => (
                <ContactCard 
                  key={contact.id} 
                  contact={contact} 
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ContactCardProps {
  contact: Contact;
  onDragStart: (contact: Contact) => void;
}

function ContactCard({ contact, onDragStart }: ContactCardProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(contact)}
      className="bg-card rounded-lg p-4 shadow-sm border border-border cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{contact.name}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="truncate">{contact.mobile}</span>
          </div>
          {contact.course && (
            <Badge variant="secondary" className="mt-2 text-xs">
              {contact.course}
            </Badge>
          )}
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}
