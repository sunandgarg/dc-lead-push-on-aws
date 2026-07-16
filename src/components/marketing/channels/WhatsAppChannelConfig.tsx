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
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Shield,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WHATSAPP_PROVIDERS, MarketingIntegration } from '@/types/marketing';

export function WhatsAppChannelConfig() {
  const [integrations, setIntegrations] = useState<MarketingIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    access_token: '',
    business_phone_id: '',
    business_account_id: '',
  });
  const { toast } = useToast();

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_integrations')
        .select('*')
        .eq('type', 'whatsapp')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations((data || []) as unknown as MarketingIntegration[]);
    } catch (error) {
      console.error('Error fetching integrations:', error);
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
        type: 'whatsapp' as const,
        provider: formData.provider,
        name: formData.name || `${formData.provider} WhatsApp`,
        configuration: {
          access_token: formData.access_token,
          business_phone_id: formData.business_phone_id,
          business_account_id: formData.business_account_id,
        },
        status: 'connected' as const,
        is_primary: integrations.length === 0,
      };

      const { error } = await supabase
        .from('marketing_integrations')
        .insert(integration);

      if (error) throw error;
      toast({ title: 'Success', description: 'WhatsApp integration added!' });
      setShowAddModal(false);
      setFormData({ provider: '', name: '', access_token: '', business_phone_id: '', business_account_id: '' });
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

  if (loading) {
    return <div className="animate-pulse">Loading WhatsApp configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Business Info */}
      <Card className="card-elevated border-emerald-500/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-500" />
            <CardTitle>WhatsApp Business API</CardTitle>
          </div>
          <CardDescription>
            Connect your WhatsApp Business API to send marketing messages. Templates must be pre-approved by Meta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Requirements for WhatsApp Business API:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Meta Business Suite account</li>
                  <li>Verified business (Green badge for higher limits)</li>
                  <li>WhatsApp Business API access</li>
                  <li>Pre-approved message templates</li>
                </ul>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Quality Rating</span>
                </div>
                <Badge variant="outline">Not Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Business Verification</span>
                </div>
                <Badge variant="outline">Not Verified</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Providers */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>WhatsApp Business Service Providers (BSPs)</CardTitle>
          <CardDescription>
            Choose a provider to connect your WhatsApp Business API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WHATSAPP_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-emerald-500/50 cursor-pointer transition-colors"
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
            <CardTitle>Connected WhatsApp Accounts</CardTitle>
            <CardDescription>Your active WhatsApp Business connections</CardDescription>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No WhatsApp accounts connected yet. Connect one to start sending messages.
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
                      {WHATSAPP_PROVIDERS.find(p => p.id === integration.provider)?.logo || '💬'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{integration.name}</span>
                        {integration.is_primary && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {WHATSAPP_PROVIDERS.find(p => p.id === integration.provider)?.name}
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

      {/* Template Categories Info */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>WhatsApp Template Categories</CardTitle>
          <CardDescription>
            WhatsApp requires pre-approved templates for business messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-500">Marketing</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Promotions, offers, product updates, and newsletters
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-500">Utility</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Order status, booking confirmations, shipping updates
              </p>
            </div>
            <div className="p-4 border border-border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-500">Authentication</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                OTPs and security alerts (no promotional content)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add WhatsApp Account</DialogTitle>
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
                  {WHATSAPP_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.logo} {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., My Business WhatsApp"
              />
            </div>

            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder="Enter your access token"
              />
            </div>

            <div className="space-y-2">
              <Label>Business Phone Number ID</Label>
              <Input
                value={formData.business_phone_id}
                onChange={(e) => setFormData({ ...formData, business_phone_id: e.target.value })}
                placeholder="From Meta Business Suite"
              />
            </div>

            <div className="space-y-2">
              <Label>Business Account ID</Label>
              <Input
                value={formData.business_account_id}
                onChange={(e) => setFormData({ ...formData, business_account_id: e.target.value })}
                placeholder="Your WABA ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.provider || !formData.access_token}>
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
