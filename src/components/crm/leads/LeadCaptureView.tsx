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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  FileText,
  Eye,
  Copy,
  Edit,
  Trash2,
  MoreVertical,
  Code,
  ExternalLink,
  GripVertical,
  Type,
  Mail,
  Phone,
  Calendar,
  List,
  AlignLeft,
  CheckSquare,
  Upload
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CaptureForm {
  id: string;
  name: string;
  description: string | null;
  form_config: {
    fields: FormField[];
  };
  university_id: string | null;
  is_active: boolean;
  submissions_count: number;
  created_at: string;
}

interface FormField {
  id: string;
  type: string;
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  order: number;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'textarea', label: 'Text Area', icon: AlignLeft },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'file', label: 'File Upload', icon: Upload },
];

interface LeadCaptureViewProps {
  universities: any[];
}

export function LeadCaptureView({ universities }: LeadCaptureViewProps) {
  const [forms, setForms] = useState<CaptureForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<CaptureForm | null>(null);
  const { toast } = useToast();

  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
    university_id: '',
    fields: [
      { id: '1', type: 'text', label: 'Full Name', name: 'name', placeholder: 'Enter your name', required: true, order: 1 },
      { id: '2', type: 'email', label: 'Email', name: 'email', placeholder: 'Enter your email', required: true, order: 2 },
      { id: '3', type: 'phone', label: 'Mobile', name: 'mobile', placeholder: 'Enter your mobile', required: true, order: 3 },
    ] as FormField[],
  });

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_capture_forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms((data || []) as unknown as CaptureForm[]);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const addField = () => {
    const newField: FormField = {
      id: Date.now().toString(),
      type: 'text',
      label: 'New Field',
      name: `field_${Date.now()}`,
      placeholder: '',
      required: false,
      order: newForm.fields.length + 1,
    };
    setNewForm(prev => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setNewForm(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    }));
  };

  const removeField = (fieldId: string) => {
    setNewForm(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }));
  };

  const handleCreateForm = async () => {
    if (!newForm.name) {
      toast({ title: 'Error', description: 'Form name is required', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('lead_capture_forms').insert([{
        name: newForm.name,
        description: newForm.description || null,
        university_id: newForm.university_id || null,
        form_config: JSON.parse(JSON.stringify({ fields: newForm.fields })),
        is_active: true,
      }]);

      if (error) throw error;

      toast({ title: 'Success', description: 'Form created successfully' });
      setIsAddOpen(false);
      setNewForm({
        name: '',
        description: '',
        university_id: '',
        fields: [
          { id: '1', type: 'text', label: 'Full Name', name: 'name', placeholder: 'Enter your name', required: true, order: 1 },
          { id: '2', type: 'email', label: 'Email', name: 'email', placeholder: 'Enter your email', required: true, order: 2 },
          { id: '3', type: 'phone', label: 'Mobile', name: 'mobile', placeholder: 'Enter your mobile', required: true, order: 3 },
        ],
      });
      fetchForms();
    } catch (error) {
      console.error('Error creating form:', error);
      toast({ title: 'Error', description: 'Failed to create form', variant: 'destructive' });
    }
  };

  const toggleFormActive = async (formId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_capture_forms')
        .update({ is_active: isActive })
        .eq('id', formId);

      if (error) throw error;
      fetchForms();
    } catch (error) {
      console.error('Error toggling form:', error);
    }
  };

  const deleteForm = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('lead_capture_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Form deleted' });
      fetchForms();
    } catch (error) {
      console.error('Error deleting form:', error);
    }
  };

  const copyEmbedCode = (formId: string) => {
    const embedCode = `<iframe src="${window.location.origin}/form/${formId}" width="100%" height="500" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    toast({ title: 'Copied!', description: 'Embed code copied to clipboard' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading forms...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Lead Capture Forms</h2>
          <p className="text-sm text-muted-foreground">
            Create embeddable forms to capture leads from your website
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Lead Capture Form</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="settings" className="mt-4">
              <TabsList>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="fields">Form Fields</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div>
                  <Label>Form Name *</Label>
                  <Input
                    value={newForm.name}
                    onChange={(e) => setNewForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., MBA Inquiry Form"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newForm.description}
                    onChange={(e) => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe this form..."
                  />
                </div>
                <div>
                  <Label>University (Optional)</Label>
                  <Select 
                    value={newForm.university_id}
                    onValueChange={(v) => setNewForm(prev => ({ ...prev, university_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select university" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map(uni => (
                        <SelectItem key={uni.id} value={uni.id}>{uni.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="fields" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {newForm.fields.map((field, index) => {
                    const FieldIcon = FIELD_TYPES.find(f => f.value === field.type)?.icon || Type;
                    return (
                      <div key={field.id} className="flex gap-2 items-start p-3 border rounded-lg">
                        <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <Select
                            value={field.type}
                            onValueChange={(v) => updateField(field.id, { type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center gap-2">
                                    <type.icon className="h-4 w-4" />
                                    {type.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            placeholder="Label"
                          />
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="Placeholder"
                          />
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={field.required}
                              onCheckedChange={(v) => updateField(field.id, { required: v })}
                            />
                            <span className="text-sm">Required</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button variant="outline" onClick={addField} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">{newForm.name || 'Form Preview'}</h3>
                  <div className="space-y-4">
                    {newForm.fields.map(field => (
                      <div key={field.id}>
                        <Label>
                          {field.label} {field.required && <span className="text-destructive">*</span>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea placeholder={field.placeholder} disabled />
                        ) : field.type === 'select' ? (
                          <Select disabled>
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder || 'Select...'} />
                            </SelectTrigger>
                          </Select>
                        ) : field.type === 'checkbox' ? (
                          <div className="flex items-center gap-2">
                            <input type="checkbox" disabled />
                            <span className="text-sm">{field.label}</span>
                          </div>
                        ) : (
                          <Input 
                            type={field.type === 'phone' ? 'tel' : field.type}
                            placeholder={field.placeholder} 
                            disabled 
                          />
                        )}
                      </div>
                    ))}
                    <Button className="w-full" disabled>Submit</Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

            <Button onClick={handleCreateForm} className="w-full mt-4">
              Create Form
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Forms</p>
          <p className="text-2xl font-bold">{forms.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active Forms</p>
          <p className="text-2xl font-bold text-green-600">
            {forms.filter(f => f.is_active).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Submissions</p>
          <p className="text-2xl font-bold text-blue-600">
            {forms.reduce((acc, f) => acc + f.submissions_count, 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg per Form</p>
          <p className="text-2xl font-bold text-purple-600">
            {forms.length > 0 ? Math.round(forms.reduce((acc, f) => acc + f.submissions_count, 0) / forms.length) : 0}
          </p>
        </Card>
      </div>

      {/* Forms List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forms.length === 0 ? (
          <Card className="p-12 text-center col-span-full">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No Lead Capture Forms</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first form to start capturing leads
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </Card>
        ) : (
          forms.map(form => (
            <Card key={form.id} className={`${!form.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{form.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {(form.form_config?.fields || []).length} fields
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyEmbedCode(form.id)}>
                        <Code className="h-4 w-4 mr-2" />
                        Copy Embed Code
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteForm(form.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {form.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {form.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t">
                  <Badge variant={form.is_active ? 'default' : 'secondary'}>
                    {form.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {form.submissions_count} submissions
                  </span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(v) => toggleFormActive(form.id, v)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.is_active ? 'Form is live' : 'Form is disabled'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
