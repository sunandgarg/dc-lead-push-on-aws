import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { toast } from 'sonner';
import { Mail, MessageSquare, Send, X, Plus, FileText, Layout } from 'lucide-react';

interface CreateTemplateModalProps {
  open: boolean;
  onClose: () => void;
}

type TemplateType = 'email' | 'sms' | 'whatsapp' | 'landing_page';

export function CreateTemplateModal({ open, onClose }: CreateTemplateModalProps) {
  const [step, setStep] = useState(1);
  const [templateType, setTemplateType] = useState<TemplateType>('email');
  const [formData, setFormData] = useState({
    name: '',
    subject_line: '',
    channel: 'email',
    type: 'email',
    status: 'draft',
    content: {
      body: '',
      html: '',
    },
    variables: [] as string[],
  });
  const [newVariable, setNewVariable] = useState('');

  const queryClient = useQueryClient();

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const templateData = {
        name: formData.name,
        type: formData.type,
        channel: formData.channel,
        subject_line: templateType === 'email' ? formData.subject_line : null,
        content: formData.content,
        variables: formData.variables,
        status: 'draft',
      };

      const { data, error } = await supabase
        .from('marketing_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-templates'] });
      toast.success('Template created successfully');
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });

  const resetForm = () => {
    setStep(1);
    setTemplateType('email');
    setFormData({
      name: '',
      subject_line: '',
      channel: 'email',
      type: 'email',
      status: 'draft',
      content: { body: '', html: '' },
      variables: [],
    });
  };

  const addVariable = () => {
    if (newVariable && !formData.variables.includes(newVariable)) {
      setFormData({
        ...formData,
        variables: [...formData.variables, newVariable],
      });
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter(v => v !== variable),
    });
  };

  const handleTypeSelect = (type: TemplateType) => {
    setTemplateType(type);
    setFormData({
      ...formData,
      type,
      channel: type === 'landing_page' ? 'email' : type,
    });
  };

  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      content: {
        ...formData.content,
        body: formData.content.body + `{{${variable}}}`,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); resetForm(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Template
            {step === 2 && (
              <Badge variant="outline" className="ml-2">
                {templateType === 'email' && 'Email'}
                {templateType === 'sms' && 'SMS'}
                {templateType === 'whatsapp' && 'WhatsApp'}
                {templateType === 'landing_page' && 'Landing Page'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <p className="text-muted-foreground">Select the type of template you want to create</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTypeSelect('email')}
                className={`p-6 border rounded-lg text-left transition-all hover:border-primary ${
                  templateType === 'email' ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Mail className="h-8 w-8 text-blue-500 mb-3" />
                <h3 className="font-semibold">Email Template</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Rich HTML emails with drag-drop builder
                </p>
              </button>

              <button
                onClick={() => handleTypeSelect('sms')}
                className={`p-6 border rounded-lg text-left transition-all hover:border-primary ${
                  templateType === 'sms' ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <MessageSquare className="h-8 w-8 text-green-500 mb-3" />
                <h3 className="font-semibold">SMS Template</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  DLT compliant SMS templates
                </p>
              </button>

              <button
                onClick={() => handleTypeSelect('whatsapp')}
                className={`p-6 border rounded-lg text-left transition-all hover:border-primary ${
                  templateType === 'whatsapp' ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Send className="h-8 w-8 text-emerald-500 mb-3" />
                <h3 className="font-semibold">WhatsApp Template</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Business approved WhatsApp messages
                </p>
              </button>

              <button
                onClick={() => handleTypeSelect('landing_page')}
                className={`p-6 border rounded-lg text-left transition-all hover:border-primary ${
                  templateType === 'landing_page' ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <Layout className="h-8 w-8 text-purple-500 mb-3" />
                <h3 className="font-semibold">Landing Page</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Lead capture landing pages
                </p>
              </button>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Welcome Email, Application Reminder"
                  />
                </div>

                {templateType === 'email' && (
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      value={formData.subject_line}
                      onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                      placeholder="e.g., Welcome to {{university_name}}!"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {"{{variable}}"} syntax for personalization
                    </p>
                  </div>
                )}

                {templateType === 'sms' && (
                  <div className="space-y-2">
                    <Label>DLT Template ID (Optional)</Label>
                    <Input placeholder="Enter registered DLT template ID" />
                    <p className="text-xs text-muted-foreground">
                      Required for India SMS compliance
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Message Content</Label>
                    {templateType === 'sms' && (
                      <span className="text-xs text-muted-foreground">
                        {formData.content.body.length}/160 characters
                      </span>
                    )}
                  </div>
                  <Textarea
                    value={formData.content.body}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      content: { ...formData.content, body: e.target.value } 
                    })}
                    placeholder={
                      templateType === 'email' 
                        ? 'Write your email content here...'
                        : templateType === 'sms'
                        ? 'Hi {{name}}, Thank you for your interest in {{course}}...'
                        : 'Hello {{name}}! Welcome to our admissions portal...'
                    }
                    className="min-h-[200px]"
                  />
                </div>

                {formData.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label>Quick Insert Variables</Label>
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable) => (
                        <Button
                          key={variable}
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(variable)}
                        >
                          {`{{${variable}}}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="variables" className="space-y-4">
                <div className="space-y-2">
                  <Label>Add Custom Variables</Label>
                  <p className="text-sm text-muted-foreground">
                    Variables will be replaced with lead data when sending
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newVariable}
                      onChange={(e) => setNewVariable(e.target.value)}
                      placeholder="e.g., name, email, course"
                      onKeyPress={(e) => e.key === 'Enter' && addVariable()}
                    />
                    <Button onClick={addVariable} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {/* Default variables */}
                    {['name', 'email', 'mobile', 'course', 'university'].map((v) => (
                      <Badge key={v} variant="secondary" className="gap-1">
                        {v}
                        <span className="text-xs text-muted-foreground">(default)</span>
                      </Badge>
                    ))}
                    {/* Custom variables */}
                    {formData.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="gap-1">
                        {variable}
                        <button onClick={() => removeVariable(variable)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => createTemplateMutation.mutate()}
                  disabled={!formData.name || createTemplateMutation.isPending}
                >
                  Create Template
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}