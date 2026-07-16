import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  PhoneMissed,
  Clock,
  Save,
  MessageSquare,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  mobile: string;
}

interface CallLog {
  id: string;
  type: string;
  title: string;
  description: string | null;
  outcome: string | null;
  duration_minutes: number | null;
  created_at: string;
}

interface LeadCallLoggerProps {
  contact: Contact;
  onCallLogged: () => void;
}

const CALL_OUTCOMES = [
  { value: 'connected', label: 'Connected', icon: CheckCircle2, color: 'text-green-600' },
  { value: 'no_answer', label: 'No Answer', icon: PhoneMissed, color: 'text-yellow-600' },
  { value: 'busy', label: 'Busy', icon: PhoneOff, color: 'text-orange-600' },
  { value: 'wrong_number', label: 'Wrong Number', icon: XCircle, color: 'text-red-600' },
  { value: 'voicemail', label: 'Voicemail', icon: MessageSquare, color: 'text-blue-600' },
  { value: 'callback_requested', label: 'Callback Requested', icon: Calendar, color: 'text-purple-600' },
  { value: 'not_interested', label: 'Not Interested', icon: AlertCircle, color: 'text-gray-600' },
  { value: 'interested', label: 'Interested', icon: CheckCircle2, color: 'text-green-600' },
];

export function LeadCallLogger({ contact, onCallLogged }: LeadCallLoggerProps) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Call form state
  const [callData, setCallData] = useState({
    outcome: '',
    duration: '',
    notes: '',
    nextFollowUp: '',
  });

  useEffect(() => {
    fetchCallLogs();
  }, [contact.id]);

  const fetchCallLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('contact_id', contact.id)
        .eq('type', 'call')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCallLogs(data || []);
    } catch (error) {
      console.error('Error fetching call logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateCall = () => {
    // Open phone dialer
    window.location.href = `tel:${contact.mobile}`;
    setIsLogging(true);
  };

  const handleSaveCallLog = async () => {
    if (!callData.outcome) {
      toast({ title: 'Error', description: 'Please select a call outcome', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const outcome = CALL_OUTCOMES.find(o => o.value === callData.outcome);
      
      // Log the call activity
      await supabase.from('crm_activities').insert({
        contact_id: contact.id,
        type: 'call',
        title: `Call: ${outcome?.label || callData.outcome}`,
        description: callData.notes || null,
        outcome: callData.outcome,
        duration_minutes: callData.duration ? parseInt(callData.duration) : null,
        metadata: { 
          mobile: contact.mobile,
          next_follow_up: callData.nextFollowUp || null,
        },
      });

      // Update contact's last contacted and next follow up
      const updateData: any = { 
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      if (callData.nextFollowUp) {
        updateData.next_follow_up = callData.nextFollowUp;
      }

      await supabase
        .from('crm_contacts')
        .update(updateData)
        .eq('id', contact.id);

      toast({ title: 'Success', description: 'Call logged successfully' });
      
      // Reset form
      setCallData({ outcome: '', duration: '', notes: '', nextFollowUp: '' });
      setIsLogging(false);
      fetchCallLogs();
      onCallLogged();
    } catch (error) {
      console.error('Error saving call log:', error);
      toast({ title: 'Error', description: 'Failed to save call log', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getOutcomeInfo = (outcome: string) => {
    return CALL_OUTCOMES.find(o => o.value === outcome);
  };

  return (
    <div className="space-y-6">
      {/* Quick Call Button */}
      <Card className="border-2 border-green-200 dark:border-green-900">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-600" />
                Call {contact.name}
              </h3>
              <p className="text-sm text-muted-foreground">{contact.mobile}</p>
            </div>
            <Button 
              onClick={initiateCall}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <PhoneCall className="h-5 w-5 mr-2" />
              Start Call
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Call Logging Form */}
      {isLogging && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Save className="h-4 w-4" />
              Log Call Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Call Outcome *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {CALL_OUTCOMES.map(outcome => {
                  const Icon = outcome.icon;
                  return (
                    <Button
                      key={outcome.value}
                      variant={callData.outcome === outcome.value ? 'default' : 'outline'}
                      className="justify-start h-auto py-3"
                      onClick={() => setCallData({ ...callData, outcome: outcome.value })}
                    >
                      <Icon className={`h-4 w-4 mr-2 ${outcome.color}`} />
                      <span className="text-xs">{outcome.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={callData.duration}
                  onChange={(e) => setCallData({ ...callData, duration: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
              <div>
                <Label>Schedule Follow-up</Label>
                <Input
                  type="datetime-local"
                  value={callData.nextFollowUp}
                  onChange={(e) => setCallData({ ...callData, nextFollowUp: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={callData.notes}
                onChange={(e) => setCallData({ ...callData, notes: e.target.value })}
                placeholder="What was discussed? Any important details?"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsLogging(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCallLog}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save Call Log'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Log Button */}
      {!isLogging && (
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setIsLogging(true)}
        >
          <Save className="h-4 w-4 mr-2" />
          Log a Call Manually
        </Button>
      )}

      {/* Call History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Call History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6 text-muted-foreground">Loading...</div>
          ) : callLogs.length > 0 ? (
            <div className="space-y-3">
              {callLogs.map(log => {
                const outcomeInfo = getOutcomeInfo(log.outcome || '');
                const OutcomeIcon = outcomeInfo?.icon || Phone;
                
                return (
                  <div 
                    key={log.id} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full bg-background ${outcomeInfo?.color || 'text-muted-foreground'}`}>
                      <OutcomeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{log.title}</span>
                        {log.duration_minutes && (
                          <Badge variant="secondary" className="text-xs">
                            {formatDuration(log.duration_minutes)}
                          </Badge>
                        )}
                      </div>
                      {log.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {log.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No call history yet</p>
              <p className="text-sm">Start by making a call above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
