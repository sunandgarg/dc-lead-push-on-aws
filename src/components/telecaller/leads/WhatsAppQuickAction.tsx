import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MessageCircle, Send, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TEMPLATES = [
  { id: '1', name: 'Welcome Message', entity: 'IIT Delhi', body: 'Hello {{Name}}, welcome to {{College}}! We are excited to have you explore our programs. Reply YES to learn more.' },
  { id: '2', name: 'Follow-up Reminder', entity: 'All', body: 'Hi {{Name}}, this is a reminder about your application to {{College}}. The deadline is approaching. Need help? Call us at 1800-XXX-XXXX.' },
  { id: '3', name: 'Document Request', entity: 'BITS Pilani', body: 'Dear {{Name}}, please submit your documents for admission at {{College}}. Upload here: {{Link}}' },
  { id: '4', name: 'Offer Letter', entity: 'VIT Vellore', body: 'Congratulations {{Name}}! 🎉 You have received an offer from {{College}}. Check your email for details.' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { name: string; phone: string; entity: string };
}

export function WhatsAppQuickAction({ open, onOpenChange, lead }: Props) {
  const [selectedEntity, setSelectedEntity] = useState(lead.entity);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { toast } = useToast();

  const template = TEMPLATES.find(t => t.id === selectedTemplate);
  const preview = template?.body
    .replace('{{Name}}', lead.name)
    .replace('{{College}}', selectedEntity)
    .replace('{{Link}}', 'https://apply.college.edu/upload') || '';

  const filteredTemplates = TEMPLATES.filter(t => t.entity === 'All' || t.entity === selectedEntity);

  const handleSend = () => {
    const encoded = encodeURIComponent(preview);
    const phone = lead.phone.startsWith('+') ? lead.phone.replace(/\D/g, '') : `91${lead.phone}`;
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
    toast({ title: 'WhatsApp Opened', description: `Message ready to send to ${lead.name}` });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-green-600" />Send WhatsApp to {lead.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Entity / College</Label>
            <Select value={selectedEntity} onValueChange={setSelectedEntity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['IIT Delhi', 'BITS Pilani', 'VIT Vellore', 'SRM Chennai', 'NIT Trichy', 'Manipal University', 'Amity University'].map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Select Template</Label>
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
              <SelectContent>
                {filteredTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {preview && (
            <div>
              <Label className="mb-2 block">Message Preview</Label>
              <div className="flex justify-center">
                <div className="w-64 bg-gradient-to-b from-[#e5ddd5] to-[#d4c9b7] rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#c5baa8]">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium">{lead.phone}</span>
                  </div>
                  <div className="bg-[#dcf8c6] rounded-lg p-3 text-sm leading-relaxed shadow-sm">
                    {preview}
                    <p className="text-[10px] text-right text-gray-500 mt-1">now ✓✓</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSend} disabled={!selectedTemplate}>
              <Send className="h-4 w-4 mr-2" />Send via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
