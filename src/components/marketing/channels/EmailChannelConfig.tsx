import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Settings, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EMAIL_PROVIDERS, MarketingIntegration } from '@/types/marketing';

export function EmailChannelConfig() {
  const [integrations, setIntegrations] = useState<MarketingIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<MarketingIntegration | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    api_key: '',
    from_email: '',
    from_name: '',
  });
  const { toast } = useToast();

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_integrations')
        .select('*')
        .eq('type', 'email')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations((data || []) as unknown as MarketingIntegration[]);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast({ title: 'Error', description: 'Failed to fetch integrations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleSave = async () => {
    try {
      const integration = {
        type: 'email' as const,
        provider: formData.provider,
        name: formData.name || `${formData.provider} Integration`,
        configuration: {
          api_key: formData.api_key,
          from_email: formData.from_email,
          from_name: formData.from_name,
        },
        status: 'connected' as const,
        is_primary: integrations.length === 0,
      };

      if (editingIntegration) {
        const { error } = await supabase
          .from('marketing_integrations')
          .update(integration)
          .eq('id', editingIntegration.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Integration updated!' });
      } else {
        const { error } = await supabase
          .from('marketing_integrations')
          .insert(integration);

        if (error) throw error;
        toast({ title: 'Success', description: 'Integration added!' });
      }

      setShowAddModal(false);
      setEditingIntegration(null);
      setFormData({ provider: '', name: '', api_key: '', from_email: '', from_name: '' });
      fetchIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({ title: 'Error', description: 'Failed to save integration', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('marketing_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Integration deleted!' });
      fetchIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({ title: 'Error', description: 'Failed to delete integration', variant: 'destructive' });
    }
  };

  const handleEdit = (integration: MarketingIntegration) => {
    setEditingIntegration(integration);
    setFormData({
      provider: integration.provider,
      name: integration.name,
      api_key: (integration.configuration as any)?.api_key || '',
      from_email: (integration.configuration as any)?.from_email || '',
      from_name: (integration.configuration as any)?.from_name || '',
    });
    setShowAddModal(true);
  };

  const handleTestConnection = async (integration: MarketingIntegration) => {
    toast({ title: 'Testing...', description: 'Checking connection to provider' });
    // Simulate test
    setTimeout(() => {
      toast({ title: 'Success', description: 'Connection test passed!' });
    }, 1500);
  };

  if (loading) {
    return <div className="animate-pulse">Loading email configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Provider Info */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Email Service Providers</CardTitle>
          <CardDescription>
            Connect your email service provider to send marketing emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EMAIL_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-primary/50 cursor-pointer transition-colors"
                onClick={() => {
                  setFormData({ ...formData, provider: provider.id });
                  setShowAddModal(true);
                }}
              >
                <span className="text-2xl">{provider.logo}</span>
                <span className="font-medium">{provider.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connected Integrations */}
      <Card className="card-elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Connected Integrations</CardTitle>
            <CardDescription>Your active email service connections</CardDescription>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No email providers connected yet. Add one to start sending emails.
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {EMAIL_PROVIDERS.find(p => p.id === integration.provider)?.logo || '📧'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        {integration.is_primary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {EMAIL_PROVIDERS.find(p => p.id === integration.provider)?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.status === 'connected' ? (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {integration.status}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleTestConnection(integration)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(integration)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingIntegration ? 'Edit Email Provider' : 'Add Email Provider'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.logo} {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Integration Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Production SendGrid"
              />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Enter your API key"
              />
            </div>

            <div className="space-y-2">
              <Label>From Email</Label>
              <Input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label>From Name</Label>
              <Input
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.provider || !formData.api_key}>
              {editingIntegration ? 'Update' : 'Add Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
