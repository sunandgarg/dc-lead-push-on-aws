import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Code,
  Settings,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomIntegration {
  id: string;
  name: string;
  channel: string;
  base_url: string;
  method: string;
  headers: any;
  auth_type: string;
  auth_config: any;
  request_body_template: any;
  response_success_path: string | null;
  response_message_path: string | null;
  is_active: boolean | null;
  test_payload: any;
  created_at: string;
}

const AUTH_TYPES = [
  { value: 'none', label: 'No Authentication' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth (Username/Password)' },
  { value: 'api_key', label: 'API Key in Header' },
  { value: 'custom_header', label: 'Custom Header' },
];

const DEFAULT_INTEGRATION: Partial<CustomIntegration> = {
  name: '',
  channel: 'sms',
  base_url: '',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  auth_type: 'none',
  auth_config: {},
  request_body_template: {},
  response_success_path: '',
  response_message_path: '',
  is_active: true,
  test_payload: {},
};

export function CustomIntegrationBuilder() {
  const [integrations, setIntegrations] = useState<CustomIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CustomIntegration>>(DEFAULT_INTEGRATION);
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');
  const [bodyTemplate, setBodyTemplate] = useState('{}');
  const [testPayload, setTestPayload] = useState('{}');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_custom_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (integration?: CustomIntegration) => {
    if (integration) {
      setEditingId(integration.id);
      setFormData(integration);
      setBodyTemplate(JSON.stringify(integration.request_body_template, null, 2));
      setTestPayload(JSON.stringify(integration.test_payload, null, 2));
    } else {
      setEditingId(null);
      setFormData(DEFAULT_INTEGRATION);
      setBodyTemplate('{}');
      setTestPayload('{}');
    }
    setTestResult(null);
    setShowModal(true);
  };

  const handleAddHeader = () => {
    if (!headerKey.trim()) return;
    setFormData(prev => ({
      ...prev,
      headers: { ...(prev.headers || {}), [headerKey]: headerValue },
    }));
    setHeaderKey('');
    setHeaderValue('');
  };

  const handleRemoveHeader = (key: string) => {
    const newHeaders = { ...formData.headers };
    delete newHeaders[key];
    setFormData(prev => ({ ...prev, headers: newHeaders }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.base_url) {
      toast({ title: 'Name and URL required', variant: 'destructive' });
      return;
    }

    let parsedBody = {};
    let parsedTestPayload = {};

    try {
      parsedBody = JSON.parse(bodyTemplate);
      parsedTestPayload = JSON.parse(testPayload);
    } catch {
      toast({ title: 'Invalid JSON in templates', variant: 'destructive' });
      return;
    }

    const payload = {
      name: formData.name,
      channel: formData.channel,
      base_url: formData.base_url,
      method: formData.method,
      headers: formData.headers,
      auth_type: formData.auth_type,
      auth_config: formData.auth_config,
      request_body_template: parsedBody,
      response_success_path: formData.response_success_path || null,
      response_message_path: formData.response_message_path || null,
      is_active: formData.is_active,
      test_payload: parsedTestPayload,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('marketing_custom_integrations')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Integration updated' });
      } else {
        const { error } = await supabase
          .from('marketing_custom_integrations')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Integration created' });
      }

      setShowModal(false);
      fetchIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketing_custom_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Integration deleted' });
      fetchIntegrations();
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      let parsedBody = {};
      let parsedTestPayload = {};
      
      try {
        parsedBody = JSON.parse(bodyTemplate);
      } catch (e) {
        setTestResult({ success: false, message: 'Invalid request body JSON' });
        setIsTesting(false);
        return;
      }
      
      try {
        parsedTestPayload = JSON.parse(testPayload);
      } catch (e) {
        setTestResult({ success: false, message: 'Invalid test payload JSON' });
        setIsTesting(false);
        return;
      }

      // Build auth config for the edge function
      const authConfig: Record<string, string> = {};
      if (formData.auth_type === 'bearer' && formData.auth_config?.token) {
        authConfig.apiKey = formData.auth_config.token;
      } else if (formData.auth_type === 'basic' && formData.auth_config?.username) {
        authConfig.username = formData.auth_config.username;
        authConfig.password = formData.auth_config.password || '';
      } else if (formData.auth_type === 'api_key' && formData.auth_config?.key_name) {
        authConfig.apiKey = formData.auth_config.key_value || '';
        authConfig.headerName = formData.auth_config.key_name;
      } else if (formData.auth_type === 'custom_header' && formData.auth_config?.header_name) {
        authConfig.customKey = formData.auth_config.header_name;
        authConfig.customValue = formData.auth_config.header_value || '';
      }

      // Make the test request via edge function
      const { data, error } = await supabase.functions.invoke('test-custom-integration', {
        body: {
          baseUrl: formData.base_url,
          method: formData.method,
          headers: formData.headers || {},
          authType: formData.auth_type === 'custom_header' ? 'custom' : formData.auth_type,
          authConfig,
          requestBodyTemplate: parsedBody,
          testPayload: parsedTestPayload,
          responseSuccessPath: formData.response_success_path,
          responseMessagePath: formData.response_message_path,
        },
      });

      if (error) {
        setTestResult({ success: false, message: error.message });
      } else {
        setTestResult({
          success: data.success,
          message: data.message || (data.success ? 'Request successful!' : 'Request failed'),
        });
      }
    } catch (err) {
      setTestResult({ success: false, message: String(err) });
    } finally {
      setIsTesting(false);
    }
  };

  const getChannelBadge = (channel: string) => {
    const colors = {
      email: 'bg-blue-500/10 text-blue-500',
      sms: 'bg-green-500/10 text-green-500',
      whatsapp: 'bg-emerald-500/10 text-emerald-500',
    };
    return <Badge className={colors[channel as keyof typeof colors] || ''}>{channel.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold">Custom API Integrations</h3>
          <p className="text-muted-foreground text-sm">
            Connect any HTTP API for sending messages. Configure your own endpoints.
          </p>
        </div>
        <Button onClick={() => openEditModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Custom API
        </Button>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No custom integrations yet. Add your own API endpoints.
            </p>
            <Button onClick={() => openEditModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <Card key={integration.id} className={!integration.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                      {integration.base_url}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getChannelBadge(integration.channel)}
                    {integration.is_active ? (
                      <Badge className="bg-green-500/10 text-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Code className="h-4 w-4" />
                    {integration.method} • {integration.auth_type}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(integration)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Integration' : 'Create Custom Integration'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Integration Name *</Label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My SMS Gateway"
                />
              </div>
              <div>
                <Label>Channel *</Label>
                <Select
                  value={formData.channel}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, channel: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* API Endpoint */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label>API URL *</Label>
                <Input
                  value={formData.base_url || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                  placeholder="https://api.provider.com/send"
                />
              </div>
              <div>
                <Label>Method</Label>
                <Select
                  value={formData.method}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {/* Authentication */}
              <AccordionItem value="auth">
                <AccordionTrigger>Authentication</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div>
                    <Label>Auth Type</Label>
                    <Select
                      value={formData.auth_type}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, auth_type: v, auth_config: {} }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTH_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.auth_type === 'bearer' && (
                    <div>
                      <Label>Bearer Token</Label>
                      <Input
                        type="password"
                        value={formData.auth_config?.token || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          auth_config: { ...prev.auth_config, token: e.target.value },
                        }))}
                        placeholder="Your API token"
                      />
                    </div>
                  )}

                  {formData.auth_type === 'basic' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Username</Label>
                        <Input
                          value={formData.auth_config?.username || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            auth_config: { ...prev.auth_config, username: e.target.value },
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Password</Label>
                        <Input
                          type="password"
                          value={formData.auth_config?.password || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            auth_config: { ...prev.auth_config, password: e.target.value },
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  {formData.auth_type === 'api_key' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Header Name</Label>
                        <Input
                          value={formData.auth_config?.key_name || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            auth_config: { ...prev.auth_config, key_name: e.target.value },
                          }))}
                          placeholder="X-API-Key"
                        />
                      </div>
                      <div>
                        <Label>API Key Value</Label>
                        <Input
                          type="password"
                          value={formData.auth_config?.key_value || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            auth_config: { ...prev.auth_config, key_value: e.target.value },
                          }))}
                        />
                      </div>
                    </div>
                  )}

                  {formData.auth_type === 'custom_header' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Custom Header Name</Label>
                        <Input
                          value={formData.auth_config?.header_name || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            auth_config: { ...prev.auth_config, header_name: e.target.value },
                          }))}
                        />
                      </div>
                      <div>
                        <Label>Header Value</Label>
                        <Input
                          type="password"
                          value={formData.auth_config?.header_value || ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            auth_config: { ...prev.auth_config, header_value: e.target.value },
                          }))}
                        />
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Custom Headers */}
              <AccordionItem value="headers">
                <AccordionTrigger>Custom Headers</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Header name"
                      value={headerKey}
                      onChange={(e) => setHeaderKey(e.target.value)}
                    />
                    <Input
                      placeholder="Header value"
                      value={headerValue}
                      onChange={(e) => setHeaderValue(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleAddHeader}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {Object.entries(formData.headers || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-2 py-1 rounded">{key}</code>
                      <span>:</span>
                      <code className="bg-muted px-2 py-1 rounded flex-1 truncate">{String(value)}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveHeader(key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>

              {/* Request Body Template */}
              <AccordionItem value="body">
                <AccordionTrigger>Request Body Template</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use {'{{variable}}'} placeholders. Example: {'{{mobile}}'}, {'{{message}}'}
                  </p>
                  <Textarea
                    value={bodyTemplate}
                    onChange={(e) => setBodyTemplate(e.target.value)}
                    className="font-mono text-sm min-h-[150px]"
                    placeholder='{"to": "{{mobile}}", "message": "{{message}}"}'
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Response Parsing */}
              <AccordionItem value="response">
                <AccordionTrigger>Response Parsing</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <div>
                    <Label>Success Path (JSON path)</Label>
                    <Input
                      value={formData.response_success_path || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, response_success_path: e.target.value }))}
                      placeholder="data.success or status"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Path to check for success (truthy value)
                    </p>
                  </div>
                  <div>
                    <Label>Message Path (JSON path)</Label>
                    <Input
                      value={formData.response_message_path || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, response_message_path: e.target.value }))}
                      placeholder="data.message or error.message"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Test Payload */}
              <AccordionItem value="test">
                <AccordionTrigger>Test Configuration</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Sample values for testing. These replace the placeholders.
                  </p>
                  <Textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="font-mono text-sm min-h-[100px]"
                    placeholder='{"mobile": "9876543210", "message": "Test message"}'
                  />
                  <Button
                    onClick={handleTest}
                    disabled={isTesting}
                    variant="outline"
                    className="w-full"
                  >
                    {isTesting ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Test Integration
                  </Button>
                  {testResult && (
                    <div className={`p-3 rounded-lg flex items-center gap-2 ${
                      testResult.success ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                      <span className="text-sm">{testResult.message}</span>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingId ? 'Save Changes' : 'Create Integration'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
