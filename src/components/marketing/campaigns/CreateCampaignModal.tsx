import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Megaphone, 
  Mail, 
  MessageSquare, 
  Send, 
  Calendar,
  Users,
  Clock,
  Target
} from 'lucide-react';
import { format } from 'date-fns';

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateCampaignModal({ open, onClose }: CreateCampaignModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    channels: [] as string[],
    template_id: '',
    recipient_filter: {
      type: 'all' as 'all' | 'segment' | 'query',
      segment_id: '',
    },
    send_at: '',
    timezone: 'Asia/Kolkata',
    recurrence: 'once' as 'once' | 'daily' | 'weekly' | 'monthly',
  });

  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['marketing-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_templates')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return data;
    },
  });

  // Fetch segments
  const { data: segments = [] } = useQuery({
    queryKey: ['lead-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_segments')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch recipient count
  const { data: recipientCount = 0 } = useQuery({
    queryKey: ['recipient-count', formData.recipient_filter],
    queryFn: async () => {
      if (formData.recipient_filter.type === 'all') {
        const { count } = await supabase
          .from('crm_contacts')
          .select('*', { count: 'exact', head: true });
        return count || 0;
      }
      if (formData.recipient_filter.type === 'segment' && formData.recipient_filter.segment_id) {
        const { count } = await supabase
          .from('lead_segment_members')
          .select('*', { count: 'exact', head: true })
          .eq('segment_id', formData.recipient_filter.segment_id);
        return count || 0;
      }
      return 0;
    },
    enabled: open,
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const campaignData = {
        name: formData.name,
        description: formData.description,
        channels: formData.channels,
        template_id: formData.template_id || null,
        recipient_filter: formData.recipient_filter,
        recipient_count: recipientCount,
        send_at: formData.send_at ? new Date(formData.send_at).toISOString() : null,
        timezone: formData.timezone,
        recurrence: formData.recurrence,
        status: formData.send_at ? 'scheduled' : 'draft',
      };

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert([campaignData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast.success('Campaign created successfully');
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create campaign: ' + error.message);
    },
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      description: '',
      channels: [],
      template_id: '',
      recipient_filter: { type: 'all', segment_id: '' },
      send_at: '',
      timezone: 'Asia/Kolkata',
      recurrence: 'once',
    });
  };

  const toggleChannel = (channel: string) => {
    if (formData.channels.includes(channel)) {
      setFormData({
        ...formData,
        channels: formData.channels.filter(c => c !== channel),
      });
    } else {
      setFormData({
        ...formData,
        channels: [...formData.channels, channel],
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Create Campaign
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex items-center ${s < 3 ? 'flex-1' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Basic Info & Channels */}
        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Admission Drive 2025"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the campaign..."
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Select Channels</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => toggleChannel('email')}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    formData.channels.includes('email') 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <Mail className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                  <p className="text-sm font-medium">Email</p>
                </button>

                <button
                  onClick={() => toggleChannel('sms')}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    formData.channels.includes('sms') 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <MessageSquare className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-medium">SMS</p>
                </button>

                <button
                  onClick={() => toggleChannel('whatsapp')}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    formData.channels.includes('whatsapp') 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <Send className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-medium">WhatsApp</p>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!formData.name || formData.channels.length === 0}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Audience & Template */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Audience
              </Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, recipient_filter: { type: 'all', segment_id: '' } })}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    formData.recipient_filter.type === 'all' 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium">All Contacts</p>
                  <p className="text-xs text-muted-foreground">Send to everyone</p>
                </button>

                <button
                  onClick={() => setFormData({ ...formData, recipient_filter: { type: 'segment', segment_id: '' } })}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    formData.recipient_filter.type === 'segment' 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium">Segment</p>
                  <p className="text-xs text-muted-foreground">Use saved segment</p>
                </button>

                <button
                  onClick={() => setFormData({ ...formData, recipient_filter: { type: 'query', segment_id: '' } })}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    formData.recipient_filter.type === 'query' 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium">Custom Query</p>
                  <p className="text-xs text-muted-foreground">Filter leads</p>
                </button>
              </div>

              {formData.recipient_filter.type === 'segment' && (
                <Select
                  value={formData.recipient_filter.segment_id}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    recipient_filter: { ...formData.recipient_filter, segment_id: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a segment" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((segment: any) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name} ({segment.lead_count} leads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{recipientCount}</strong> recipients will receive this campaign
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Template (Optional)</Label>
              <Select
                value={formData.template_id}
                onValueChange={(value) => setFormData({ ...formData, template_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template or skip" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.channel})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Scheduling */}
        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                When to Send
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormData({ ...formData, send_at: '' })}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    !formData.send_at 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <p className="font-medium">Send Now</p>
                  <p className="text-xs text-muted-foreground">Start immediately</p>
                </button>

                <button
                  onClick={() => setFormData({ ...formData, send_at: format(new Date(), "yyyy-MM-dd'T'HH:mm") })}
                  className={`p-4 border rounded-lg text-left transition-all ${
                    formData.send_at 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  <Clock className="h-5 w-5 mb-1" />
                  <p className="font-medium">Schedule</p>
                  <p className="text-xs text-muted-foreground">Pick date & time</p>
                </button>
              </div>

              {formData.send_at && (
                <div className="space-y-3">
                  <Input
                    type="datetime-local"
                    value={formData.send_at}
                    onChange={(e) => setFormData({ ...formData, send_at: e.target.value })}
                  />
                  
                  <div className="space-y-2">
                    <Label>Recurrence</Label>
                    <Select
                      value={formData.recurrence}
                      onValueChange={(value: any) => setFormData({ ...formData, recurrence: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">One Time</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
              <h4 className="font-semibold">Campaign Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-muted-foreground">Name:</span> {formData.name}</p>
                <p><span className="text-muted-foreground">Channels:</span> {formData.channels.join(', ')}</p>
                <p><span className="text-muted-foreground">Recipients:</span> {recipientCount}</p>
                <p><span className="text-muted-foreground">Schedule:</span> {formData.send_at ? 'Scheduled' : 'Immediate'}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createCampaignMutation.mutate()}
                  disabled={createCampaignMutation.isPending}
                >
                  {formData.send_at ? 'Schedule Campaign' : 'Launch Campaign'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}