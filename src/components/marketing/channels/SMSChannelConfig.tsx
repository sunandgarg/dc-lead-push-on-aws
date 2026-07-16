import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SMS_PROVIDERS, DLT_PLATFORMS, MarketingIntegration } from '@/types/marketing';

export function SMSChannelConfig() {
  const [integrations, setIntegrations] = useState<MarketingIntegration[]>([]);
  const [dltEntities, setDltEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDLTModal, setShowDLTModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<MarketingIntegration | null>(null);
  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    api_key: '',
    api_secret: '',
    sender_id: '',
    entity_id: '',
  });
  const [dltFormData, setDltFormData] = useState({
    platform: '',
    entity_id: '',
    entity_name: '',
    sender_ids: '',
  });
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [integrationsRes, dltRes] = await Promise.all([
        supabase
          .from('marketing_integrations')
          .select('*')
          .eq('type', 'sms')
          .order('created_at', { ascending: false }),
        supabase
          .from('dlt_entities')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (integrationsRes.error) throw integrationsRes.error;
      if (dltRes.error) throw dltRes.error;

      setIntegrations((integrationsRes.data || []) as unknown as MarketingIntegration[]);
      setDltEntities(dltRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveIntegration = async () => {
    try {
      const integration = {
        type: 'sms' as const,
        provider: formData.provider,
        name: formData.name || `${formData.provider} Integration`,
        configuration: {
          api_key: formData.api_key,
          api_secret: formData.api_secret,
          sender_id: formData.sender_id,
          entity_id: formData.entity_id,
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
      setFormData({ provider: '', name: '', api_key: '', api_secret: '', sender_id: '', entity_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({ title: 'Error', description: 'Failed to save integration', variant: 'destructive' });
    }
  };

  const handleSaveDLT = async () => {
    try {
      const { error } = await supabase
        .from('dlt_entities')
        .insert({
          platform: dltFormData.platform,
          entity_id: dltFormData.entity_id,
          entity_name: dltFormData.entity_name,
          sender_ids: dltFormData.sender_ids.split(',').map(s => s.trim()).filter(Boolean),
          status: 'pending',
        });

      if (error) throw error;
      toast({ title: 'Success', description: 'DLT entity added!' });
      setShowDLTModal(false);
      setDltFormData({ platform: '', entity_id: '', entity_name: '', sender_ids: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving DLT entity:', error);
      toast({ title: 'Error', description: 'Failed to save DLT entity', variant: 'destructive' });
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
      fetchData();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({ title: 'Error', description: 'Failed to delete integration', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading SMS configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* DLT Compliance Section */}
      <Card className="card-elevated border-warning/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-warning" />
            <CardTitle>DLT/TRAI Compliance (India)</CardTitle>
          </div>
          <CardDescription>
            Required for bulk SMS in India. Register your entity and templates with a DLT platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dltEntities.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <p className="text-sm">
                  No DLT entity registered. You need to register with a DLT platform to send promotional SMS.
                </p>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                {DLT_PLATFORMS.map((platform) => (
                  <a
                    key={platform.id}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <span className="font-medium">{platform.name}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </div>

              <Button onClick={() => setShowDLTModal(true)} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add DLT Entity Registration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {dltEntities.map((entity) => (
                <div
                  key={entity.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entity.entity_name}</span>
                      <Badge variant={entity.status === 'approved' ? 'default' : 'secondary'}>
                        {entity.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entity.platform} • Entity ID: {entity.entity_id}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sender IDs: {entity.sender_ids?.join(', ') || 'None'}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={() => setShowDLTModal(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Entity
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMS Providers */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>SMS Gateway Providers</CardTitle>
          <CardDescription>
            Connect your SMS gateway to send messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SMS_PROVIDERS.map((provider) => (
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
            <CardTitle>Connected SMS Providers</CardTitle>
            <CardDescription>Your active SMS gateway connections</CardDescription>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No SMS providers connected yet. Add one to start sending SMS.
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
                      {SMS_PROVIDERS.find(p => p.id === integration.provider)?.logo || '📱'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        {integration.is_primary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {SMS_PROVIDERS.find(p => p.id === integration.provider)?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={integration.status === 'connected' ? 'bg-success text-success-foreground' : ''}>
                      {integration.status === 'connected' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" />Connected</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" />{integration.status}</>
                      )}
                    </Badge>
                    <Button variant="ghost" size="icon">
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

      {/* Add Provider Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add SMS Provider</DialogTitle>
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
                  {SMS_PROVIDERS.map((provider) => (
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
                placeholder="e.g., Production Twilio"
              />
            </div>

            <div className="space-y-2">
              <Label>API Key / Account SID</Label>
              <Input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Enter your API key"
              />
            </div>

            <div className="space-y-2">
              <Label>API Secret / Auth Token</Label>
              <Input
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                placeholder="Enter your API secret"
              />
            </div>

            <div className="space-y-2">
              <Label>Sender ID / Phone Number</Label>
              <Input
                value={formData.sender_id}
                onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
                placeholder="e.g., MYCOMP or +1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label>DLT Entity ID (India)</Label>
              <Input
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                placeholder="Your DLT entity ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveIntegration} disabled={!formData.provider || !formData.api_key}>
              Add Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add DLT Entity Modal */}
      <Dialog open={showDLTModal} onOpenChange={setShowDLTModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add DLT Entity Registration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>DLT Platform</Label>
              <Select
                value={dltFormData.platform}
                onValueChange={(value) => setDltFormData({ ...dltFormData, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {DLT_PLATFORMS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entity ID</Label>
              <Input
                value={dltFormData.entity_id}
                onChange={(e) => setDltFormData({ ...dltFormData, entity_id: e.target.value })}
                placeholder="Your DLT entity ID"
              />
            </div>

            <div className="space-y-2">
              <Label>Entity Name</Label>
              <Input
                value={dltFormData.entity_name}
                onChange={(e) => setDltFormData({ ...dltFormData, entity_name: e.target.value })}
                placeholder="Your registered business name"
              />
            </div>

            <div className="space-y-2">
              <Label>Sender IDs (comma-separated)</Label>
              <Input
                value={dltFormData.sender_ids}
                onChange={(e) => setDltFormData({ ...dltFormData, sender_ids: e.target.value })}
                placeholder="MYCOMP, MYAPP"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDLTModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDLT} disabled={!dltFormData.platform || !dltFormData.entity_id}>
              Add Entity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
