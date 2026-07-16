import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  name: string;
  entity: string;
  category: 'Utility' | 'Marketing';
  status: boolean;
  editable: boolean;
  body: string;
}

const MOCK_TEMPLATES: Template[] = [
  { id: '1', name: 'Welcome Message', entity: 'IIT Delhi', category: 'Utility', status: true, editable: true, body: 'Hello {{Name}}, welcome to {{College}}! We are excited to have you explore our programs.' },
  { id: '2', name: 'Follow-up Reminder', entity: 'BITS Pilani', category: 'Marketing', status: true, editable: true, body: 'Hi {{Name}}, this is a reminder about your application to {{College}}. Deadline approaching!' },
  { id: '3', name: 'Document Request', entity: 'VIT Vellore', category: 'Utility', status: true, editable: false, body: 'Dear {{Name}}, please submit your documents for {{College}}. Upload: {{Link}}' },
  { id: '4', name: 'Offer Letter', entity: 'SRM Chennai', category: 'Marketing', status: false, editable: true, body: 'Congratulations {{Name}}! 🎉 You received an offer from {{College}}.' },
  { id: '5', name: 'Payment Reminder', entity: 'Manipal University', category: 'Utility', status: true, editable: true, body: '{{Name}}, your fee payment for {{College}} is due on {{Date}}. Pay now: {{Link}}' },
  { id: '6', name: 'Event Invite', entity: 'Amity University', category: 'Marketing', status: true, editable: false, body: 'Hi {{Name}}! Join us at {{College}} Open Day on {{Date}}. Register: {{Link}}' },
];

const ENTITIES = ['IIT Delhi', 'BITS Pilani', 'VIT Vellore', 'SRM Chennai', 'Manipal University', 'Amity University', 'NIT Trichy'];

export function WhatsAppTemplateManager() {
  const [templates, setTemplates] = useState<Template[]>(MOCK_TEMPLATES);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', entity: '', category: 'Utility' as const, status: true, editable: true, body: '' });
  const { toast } = useToast();

  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.entity.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = () => {
    if (!newTemplate.name || !newTemplate.entity || !newTemplate.body) {
      toast({ title: 'Error', description: 'Fill all required fields', variant: 'destructive' });
      return;
    }
    setTemplates(prev => [...prev, { ...newTemplate, id: String(prev.length + 1) }]);
    toast({ title: 'Template Added', description: `${newTemplate.name} created successfully` });
    setNewTemplate({ name: '', entity: '', category: 'Utility', status: true, editable: true, body: '' });
    setAddOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <CardTitle className="text-xl">WhatsApp Template Manager</CardTitle>
              <Badge variant="secondary">{templates.length} Templates</Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Template</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Entity/College</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Editable</TableHead>
                  <TableHead className="max-w-xs">Template Body</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t, idx) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm">{t.entity}</TableCell>
                    <TableCell><Badge variant="outline" className={t.category === 'Marketing' ? 'border-purple-200 text-purple-700' : 'border-blue-200 text-blue-700'}>{t.category}</Badge></TableCell>
                    <TableCell><Badge className={t.status ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>{t.status ? 'Enabled' : 'Disabled'}</Badge></TableCell>
                    <TableCell><Badge variant="secondary">{t.editable ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground truncate">{t.body}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add New WhatsApp Template</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input placeholder="e.g., Welcome Message" value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <Label>Entity/College *</Label>
              <Select value={newTemplate.entity} onValueChange={v => setNewTemplate(p => ({ ...p, entity: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ENTITIES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Status</Label>
                <Switch checked={newTemplate.status} onCheckedChange={v => setNewTemplate(p => ({ ...p, status: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Editable</Label>
                <Switch checked={newTemplate.editable} onCheckedChange={v => setNewTemplate(p => ({ ...p, editable: v }))} />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newTemplate.category} onValueChange={v => setNewTemplate(p => ({ ...p, category: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Utility">Utility</SelectItem><SelectItem value="Marketing">Marketing</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template Body *</Label>
              <Textarea rows={5} placeholder="Type your message template..." value={newTemplate.body} onChange={e => setNewTemplate(p => ({ ...p, body: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Use dynamic variables: {'{{Name}}'}, {'{{College}}'}, {'{{Date}}'}, {'{{Link}}'}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Save Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
