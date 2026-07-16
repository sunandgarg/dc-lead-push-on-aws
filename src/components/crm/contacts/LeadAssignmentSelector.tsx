import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Check, User } from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  current_lead_count: number;
  max_leads: number;
  is_active: boolean;
}

interface LeadAssignmentSelectorProps {
  contactId: string;
  currentAssignee: string | null;
  onAssigned: () => void;
  compact?: boolean;
}

export function LeadAssignmentSelector({ 
  contactId, 
  currentAssignee, 
  onAssigned,
  compact = false 
}: LeadAssignmentSelectorProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>(currentAssignee || '');
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setTeamMembers((data || []) as TeamMember[]);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (memberId: string) => {
    if (memberId === currentAssignee) return;
    
    setAssigning(true);
    try {
      const member = teamMembers.find(m => m.id === memberId);
      
      // Update contact
      const { error } = await supabase
        .from('crm_contacts')
        .update({ 
          assigned_to: memberId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (error) throw error;

      // Log assignment history
      if (memberId) {
        await supabase.from('lead_assignment_history').insert({
          contact_id: contactId,
          assigned_to: memberId,
          assigned_from: currentAssignee || null,
          reason: 'Manual assignment'
        });

        // Log activity
        await supabase.from('crm_activities').insert({
          contact_id: contactId,
          type: 'assignment',
          title: `Assigned to ${member?.full_name}`,
          description: 'Lead manually assigned'
        });

        // Update team member lead count
        if (member) {
          await supabase
            .from('team_members')
            .update({ current_lead_count: member.current_lead_count + 1 })
            .eq('id', memberId);
        }

        // Decrement previous assignee count
        if (currentAssignee) {
          const prevMember = teamMembers.find(m => m.id === currentAssignee);
          if (prevMember && prevMember.current_lead_count > 0) {
            await supabase
              .from('team_members')
              .update({ current_lead_count: prevMember.current_lead_count - 1 })
              .eq('id', currentAssignee);
          }
        }
      }

      toast({ title: 'Success', description: memberId ? `Assigned to ${member?.full_name}` : 'Assignment removed' });
      setSelectedMember(memberId);
      onAssigned();
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast({ title: 'Error', description: 'Failed to assign lead', variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  };

  const currentMember = teamMembers.find(m => m.id === currentAssignee);

  if (compact) {
    return (
      <Select 
        value={selectedMember || '__unassigned__'} 
        onValueChange={(v) => handleAssign(v === '__unassigned__' ? '' : v)}
        disabled={loading || assigning}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={loading ? "Loading..." : "Assign to..."}>
            {currentMember ? (
              <div className="flex items-center gap-2">
                <User className="h-3 w-3" />
                {currentMember.full_name}
              </div>
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unassigned__">
            <span className="text-muted-foreground">Unassigned</span>
          </SelectItem>
          {teamMembers.map(member => (
            <SelectItem 
              key={member.id} 
              value={member.id}
              disabled={member.current_lead_count >= member.max_leads}
            >
              <div className="flex items-center justify-between gap-3 w-full">
                <span>{member.full_name}</span>
                <span className="text-xs text-muted-foreground">
                  {member.current_lead_count}/{member.max_leads}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Assign Lead</span>
      </div>
      
      {currentMember && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium">
              {currentMember.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{currentMember.full_name}</p>
            <p className="text-xs text-muted-foreground">{currentMember.role}</p>
          </div>
          <Check className="h-4 w-4 text-green-500" />
        </div>
      )}

      <Select 
        value={selectedMember || '__unassigned__'} 
        onValueChange={(v) => handleAssign(v === '__unassigned__' ? '' : v)}
        disabled={loading || assigning}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading team members..." : "Select team member"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__unassigned__">
            <span className="text-muted-foreground">Remove assignment</span>
          </SelectItem>
          {teamMembers.map(member => (
            <SelectItem 
              key={member.id} 
              value={member.id}
              disabled={member.current_lead_count >= member.max_leads}
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {member.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.current_lead_count}/{member.max_leads} leads • {member.role}
                  </p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
