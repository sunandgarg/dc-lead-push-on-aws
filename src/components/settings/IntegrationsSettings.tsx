import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase, supabaseProjectUrl } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Phone, 
  Wallet, 
  Megaphone, 
  Mail, 
  Bell, 
  Puzzle,
  CheckCircle2,
  Settings2,
  ExternalLink,
  Search,
  Copy,
  Loader2,
  AlertCircle,
  Globe
} from 'lucide-react';
import React from 'react';

// Get the Supabase project URL for webhooks
const SUPABASE_URL = supabaseProjectUrl;

// Integration categories based on Meritto/Automateazy
const INTEGRATION_CATEGORIES = {
  ads: {
    label: 'Ads Integration',
    icon: Megaphone,
    integrations: [
      { 
        id: 'facebook-lead', 
        name: 'Facebook Lead Ads', 
        description: 'Capture leads from Facebook/Meta Lead Forms',
        webhook: `${SUPABASE_URL}/functions/v1/meta-ads-webhook`,
        fields: ['page_id', 'form_id', 'access_token'],
        instructions: [
          '1. Go to Meta Business Suite → All Tools → Leads Center',
          '2. Click on "CRM Integration" and select "Connect a new CRM"',
          '3. Choose "Custom Integration" and paste the webhook URL below',
          '4. Copy your Page Access Token from Meta Business settings',
        ]
      },
      { 
        id: 'google-lead', 
        name: 'Google Lead Ads', 
        description: 'Webhook for Google Lead Form Extensions',
        webhook: `${SUPABASE_URL}/functions/v1/google-ads-webhook`,
        fields: ['customer_id', 'campaign_id'],
        instructions: [
          '1. In Google Ads, go to Tools → Linked accounts',
          '2. Under "Other connections", find "Webhooks"',
          '3. Create a new webhook and paste the URL below',
          '4. Select the Lead Form Extension campaigns to connect',
        ]
      },
      { 
        id: 'facebook-offline', 
        name: 'Facebook Offline Conversion', 
        description: 'Track offline conversions for better ad optimization',
        fields: ['pixel_id', 'access_token', 'event_set_id'],
        instructions: [
          '1. Go to Events Manager in Meta Business Suite',
          '2. Create an Offline Event Set',
          '3. Copy the Event Set ID and Access Token',
        ]
      },
      { 
        id: 'google-offline', 
        name: 'Google Offline Conversion', 
        description: 'Import offline conversions to Google Ads',
        fields: ['customer_id', 'conversion_action_id'],
        instructions: [
          '1. In Google Ads, go to Tools → Conversions',
          '2. Create a new conversion action for "Import"',
          '3. Copy the Conversion Action ID',
        ]
      },
    ]
  },
  telephony: {
    label: 'Telephony',
    icon: Phone,
    integrations: [
      { id: 'exotel', name: 'Exotel', description: 'Cloud telephony for calls', fields: ['api_key', 'api_token', 'subdomain', 'caller_id'] },
      { id: 'servetel', name: 'Servetel', description: 'IVR and call tracking', fields: ['api_key', 'secret_key', 'agent_id'] },
      { id: 'knowlarity', name: 'Knowlarity', description: 'Cloud communications', fields: ['api_key', 'sr_number', 'caller_id'] },
      { id: 'ozonetel', name: 'Ozonetel', description: 'Contact center solution', fields: ['api_key', 'username', 'campaign_name'] },
    ]
  },
  govtWallet: {
    label: 'GOI Digital Wallet',
    icon: Wallet,
    integrations: [
      { id: 'ugc-deb', name: 'UGC DEB', description: 'Fetch details from UGC Distance Education Bureau', fields: ['api_key', 'institution_id'] },
      { id: 'digilocker', name: 'DigiLocker', description: 'Enable document fetch for applicants', fields: ['client_id', 'client_secret'] },
    ]
  },
  email: {
    label: 'Email Connect',
    icon: Mail,
    integrations: [
      { id: 'gmail', name: 'Gmail', description: 'Connect Gmail for lead capture', fields: ['oauth_token'], oauth: true },
      { id: 'outlook', name: 'Outlook', description: 'Connect Outlook for lead capture', fields: ['oauth_token'], oauth: true },
      { id: 'sendgrid', name: 'SendGrid', description: 'Email delivery service', fields: ['api_key', 'from_email', 'from_name'] },
      { id: 'mailgun', name: 'Mailgun', description: 'Transactional email API', fields: ['api_key', 'domain'] },
    ]
  },
  push: {
    label: 'Push Notification',
    icon: Bell,
    integrations: [
      { id: 'onesignal', name: 'OneSignal', description: 'Browser push notifications', fields: ['app_id', 'rest_api_key'] },
      { id: 'firebase', name: 'Firebase', description: 'Mobile push notifications', fields: ['server_key', 'project_id'] },
    ]
  },
  zapier: {
    label: 'Automation',
    icon: Puzzle,
    integrations: [
      { id: 'zapier', name: 'Zapier', description: 'Connect to 5000+ apps', fields: ['webhook_url'] },
      { id: 'pabbly', name: 'Pabbly Connect', description: 'Workflow automation', fields: ['webhook_url'] },
      { id: 'make', name: 'Make (Integromat)', description: 'Visual automation platform', fields: ['webhook_url'] },
    ]
  },
};

interface Integration {
  id: string;
  name: string;
  provider: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  configuration: Record<string, any>;
  webhook_url?: string;
  last_synced?: string;
}

export function IntegrationsSettings() {
  const [activeCategory, setActiveCategory] = useState('ads');
  const [searchTerm, setSearchTerm] = useState('');
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing integrations from database
  const { data: savedIntegrations = [] } = useQuery({
    queryKey: ['marketing-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_integrations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Integration[];
    },
  });

  // Save integration mutation
  const saveIntegration = useMutation({
    mutationFn: async (data: { 
      id?: string;
      name: string; 
      provider: string; 
      type: string;
      configuration: Record<string, any>;
      webhook_url?: string;
      status: string;
    }) => {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('marketing_integrations')
          .update({
            configuration: data.configuration,
            webhook_url: data.webhook_url,
            status: data.status,
            last_synced: new Date().toISOString(),
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('marketing_integrations')
          .insert([{
            name: data.name,
            provider: data.provider,
            type: data.type,
            configuration: data.configuration,
            webhook_url: data.webhook_url,
            status: data.status,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-integrations'] });
      toast({ 
        title: 'Integration Saved', 
        description: `${selectedIntegration?.name} configuration saved successfully` 
      });
      setConfigOpen(false);
      setFormData({});
    },
    onError: (error) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Delete integration mutation
  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_integrations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-integrations'] });
      toast({ title: 'Integration Disconnected' });
    },
  });

  const handleConnect = (integration: any, category: string) => {
    setSelectedIntegration({ ...integration, category });
    
    // Load existing config if available
    const existing = savedIntegrations.find(s => s.provider === integration.id);
    if (existing) {
      setFormData(existing.configuration as Record<string, string>);
    } else {
      setFormData({});
    }
    
    setConfigOpen(true);
  };

  const handleSaveConfig = () => {
    const existing = savedIntegrations.find(s => s.provider === selectedIntegration.id);
    
    saveIntegration.mutate({
      id: existing?.id,
      name: selectedIntegration.name,
      provider: selectedIntegration.id,
      type: selectedIntegration.category,
      configuration: formData,
      webhook_url: selectedIntegration.webhook,
      status: 'connected',
    });
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsTestingConnection(false);
    toast({
      title: 'Connection Successful',
      description: 'Your integration is configured correctly.',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  const isConnected = (integrationId: string) => {
    return savedIntegrations.some(s => s.provider === integrationId && s.status === 'connected');
  };

  const filteredIntegrations = Object.entries(INTEGRATION_CATEGORIES).reduce((acc, [key, category]) => {
    const filtered = category.integrations.filter(i => 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[key] = { ...category, integrations: filtered };
    }
    return acc;
  }, {} as typeof INTEGRATION_CATEGORIES);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Integrations</h2>
          <p className="text-muted-foreground">Connect third-party services and ad platforms</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search integrations..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Connected Integrations Summary */}
      {savedIntegrations.filter(s => s.status === 'connected').length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Connected Integrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {savedIntegrations.filter(s => s.status === 'connected').map(integration => (
                <Badge key={integration.id} variant="outline" className="text-green-600 border-green-600">
                  {integration.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {Object.entries(INTEGRATION_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const connectedCount = savedIntegrations.filter(
              s => category.integrations.some(i => i.id === s.provider) && s.status === 'connected'
            ).length;
            return (
              <TabsTrigger key={key} value={key} className="gap-2">
                <Icon className="h-4 w-4" />
                {category.label}
                {connectedCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {connectedCount}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.entries(filteredIntegrations).map(([key, category]) => (
          <TabsContent key={key} value={key} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.integrations.map(integration => {
                const connected = isConnected(integration.id);
                return (
                  <Card key={integration.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          {React.createElement(category.icon, { className: "h-6 w-6 text-primary" })}
                        </div>
                        {connected && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{integration.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
                      
                      {/* Show webhook URL for ad integrations */}
                      {integration.webhook && (
                        <div className="mb-4 p-2 bg-muted rounded text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Webhook URL</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(integration.webhook!)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="font-mono truncate mt-1">{integration.webhook}</p>
                        </div>
                      )}
                      
                      <Button 
                        variant={connected ? "outline" : "default"}
                        size="sm"
                        className="w-full"
                        onClick={() => handleConnect(integration, key)}
                      >
                        {connected ? (
                          <>
                            <Settings2 className="h-4 w-4 mr-2" />
                            Configure
                          </>
                        ) : 'Connect'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Set up your {selectedIntegration?.name} integration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Instructions */}
            {selectedIntegration?.instructions && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">Setup Instructions:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {selectedIntegration.instructions.map((instruction: string, idx: number) => (
                      <li key={idx}>{instruction}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Webhook URL */}
            {selectedIntegration?.webhook && (
              <div>
                <Label>Webhook URL</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={selectedIntegration.webhook} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(selectedIntegration.webhook)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use this URL in your {selectedIntegration.name} settings
                </p>
              </div>
            )}

            {/* Dynamic Fields */}
            {selectedIntegration?.fields?.map((field: string) => (
              <div key={field}>
                <Label className="capitalize">{field.replace(/_/g, ' ')}</Label>
                <Input 
                  type={field.includes('token') || field.includes('secret') || field.includes('key') ? 'password' : 'text'}
                  value={formData[field] || ''}
                  onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                />
              </div>
            ))}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ExternalLink className="h-4 w-4" />
              <a href="#" className="hover:underline">View setup documentation</a>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setConfigOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveConfig}
              disabled={saveIntegration.isPending}
            >
              {saveIntegration.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
