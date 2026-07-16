import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, FileText, Edit, Trash2, Copy, Eye, Code } from 'lucide-react';
import DOMPurify from 'dompurify';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SMTPTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subject_line: string | null;
  html_content: string;
  text_content: string | null;
  variables: string[];
  is_system: boolean;
  created_at: string;
}

export function SMTPTemplates() {
  const [templates, setTemplates] = useState<SMTPTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SMTPTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SMTPTemplate | null>(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    subject_line: '',
    html_content: '',
    text_content: '',
    variables: '',
  });
  const { toast } = useToast();

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('smtp_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async () => {
    try {
      const variablesArray = formData.variables
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);

      const template = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        subject_line: formData.subject_line || null,
        html_content: formData.html_content,
        text_content: formData.text_content || null,
        variables: variablesArray,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('smtp_templates')
          .update(template)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Template updated!' });
      } else {
        const { error } = await supabase
          .from('smtp_templates')
          .insert(template);

        if (error) throw error;
        toast({ title: 'Success', description: 'Template created!' });
      }

      setShowCreateModal(false);
      setEditingTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save', variant: 'destructive' });
    }
  };

  const handleEdit = (template: SMTPTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category,
      subject_line: template.subject_line || '',
      html_content: template.html_content,
      text_content: template.text_content || '',
      variables: template.variables.join(', '),
    });
    setShowCreateModal(true);
  };

  const handleDuplicate = async (template: SMTPTemplate) => {
    try {
      const { error } = await supabase
        .from('smtp_templates')
        .insert({
          name: `${template.name} (Copy)`,
          description: template.description,
          category: template.category,
          subject_line: template.subject_line,
          html_content: template.html_content,
          text_content: template.text_content,
          variables: template.variables,
          is_system: false,
        });

      if (error) throw error;
      toast({ title: 'Duplicated', description: 'Template copied successfully' });
      fetchTemplates();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({ title: 'Error', description: 'Failed to duplicate', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this template?');
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('smtp_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Deleted', description: 'Template removed' });
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'general',
      subject_line: '',
      html_content: '',
      text_content: '',
      variables: '',
    });
  };

  const categories = ['all', 'general', 'marketing', 'transactional', 'onboarding', 'retention'];
  const filteredTemplates = filter === 'all' 
    ? templates 
    : templates.filter(t => t.category === filter);

  if (loading) {
    return <div className="animate-pulse">Loading templates...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold">Email Templates</h2>
          <p className="text-muted-foreground">Reusable email templates for campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setEditingTemplate(null); setShowCreateModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No Templates Found</h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'all' ? 'Create your first email template' : `No templates in ${filter} category`}
            </p>
            <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="card-elevated hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {template.description || 'No description'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    {template.is_system && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {template.subject_line && (
                  <p className="text-sm text-muted-foreground mb-3 truncate">
                    Subject: {template.subject_line}
                  </p>
                )}
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.variables.slice(0, 4).map((v) => (
                      <Badge key={v} variant="outline" className="text-xs font-mono">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                    {template.variables.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.variables.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSelectedTemplate(template); setShowPreviewModal(true); }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!template.is_system && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Welcome Email"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="retention">Retention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the template"
              />
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                value={formData.subject_line}
                onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                placeholder="Welcome to {{company_name}}!"
              />
            </div>

            <div className="space-y-2">
              <Label>Variables (comma-separated)</Label>
              <Input
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                placeholder="first_name, company_name, cta_link"
              />
              <p className="text-xs text-muted-foreground">
                Use in content as {"{{variable_name}}"}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                HTML Content
              </Label>
              <Textarea
                value={formData.html_content}
                onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                placeholder="<html><body>Your email content with {{variables}}...</body></html>"
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Plain Text (fallback)</Label>
              <Textarea
                value={formData.text_content}
                onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                placeholder="Plain text version..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.html_content}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="p-4 bg-muted border-b">
                <p className="text-sm"><strong>Subject:</strong> {selectedTemplate.subject_line || 'N/A'}</p>
              </div>
              <div 
                className="p-4"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedTemplate.html_content) }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
