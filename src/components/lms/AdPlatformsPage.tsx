import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, CheckCircle2, Loader2, RefreshCw, Trash2, Settings2, ArrowRight, ArrowLeft, Zap, Megaphone, BarChart3, Globe, Users, Target, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

function getWebhookUrl(functionName: string, universityId?: string) {
  const base = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/${functionName}`;
  return universityId ? `${base}?university_id=${universityId}` : base;
}

interface UniversityOption { id: string; name: string; }

interface Integration {
  id: string;
  platform: string;
  subtype: string;
  name: string;
  account_name: string;
  university_id: string | null;
  university_name: string;
  is_active: boolean;
  webhook_url: string;
  webhook_key: string;
  field_mapping: Record<string, string>;
  created_at: string;
  leads_received: number;
  last_lead_at: string | null;
}

interface IncomingLead {
  id: string; name: string; email: string; mobile: string;
  source: string; campaign: string; university: string; status: string; created_at: string;
}

const DEFAULT_FB_MAPPING: Record<string, string> = {
  full_name: 'name', email: 'email', phone_number: 'mobile',
  city: 'city', state: 'state', 'what_course_are_you_interested_in?': 'course',
};
const DEFAULT_GOOGLE_MAPPING: Record<string, string> = {
  'Full Name': 'name', 'Email': 'email', 'Phone Number': 'mobile',
  'City': 'city', 'State': 'state', 'Course': 'course',
};
const DEFAULT_BING_MAPPING: Record<string, string> = {
  'FullName': 'name', 'Email': 'email', 'PhoneNumber': 'mobile',
  'City': 'city', 'State': 'state', 'Course': 'course',
};

const SYSTEM_FIELDS = ['name', 'email', 'mobile', 'city', 'state', 'course', 'specialization', 'address', 'lead_source', 'lead_medium', 'lead_campaign'];

// Integration card definitions matching NoPaperForms style
const PLATFORM_CARDS = [
  {
    id: 'facebook_lead_ad',
    platform: 'facebook',
    subtype: 'lead_ad',
    title: 'Facebook Lead Ad',
    description: 'Connect with Facebook Lead Ad to capture leads using ads. Requires Meta Business Suite verification and App Review (2026 Graph API v21+).',
    icon: '📘',
    iconBg: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    actionLabel: 'Manage Accounts',
    hasOAuth: true,
    complianceNotes: [
      'Meta Graph API v21.0+ required (older versions deprecated Jan 2026)',
      'Business Verification mandatory via Meta Business Suite',
      'App Review required for leads_retrieval & pages_manage_ads permissions',
      'Lead Access Token must be refreshed every 60 days',
      'CAPI (Conversions API) recommended alongside Pixel for iOS 18+ tracking',
      'Data Processing Agreement must be signed in Business Settings',
      'EU Digital Services Act: Consent Mode v2 integration required for EU leads',
    ],
  },
  {
    id: 'google_lead_ad',
    platform: 'google',
    subtype: 'lead_ad',
    title: 'Google Lead Ad',
    description: 'Find your webhook url and key details to connect with Google Lead Ad. Uses Google Ads API v18 (2026).',
    icon: '📊',
    iconBg: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    actionLabel: 'View Details',
    hasOAuth: false,
    complianceNotes: [
      'Google Ads API v18 (2026) – v15 sunset complete',
      'OAuth 2.0 with offline access token refresh required',
      'Consent Mode v2 mandatory for EU/EEA conversions',
      'Enhanced Conversions enabled by default – must hash PII (SHA-256)',
      'Lead Form Extensions require Google Merchant Center linking',
      'Customer Match: minimum 1,000 list size, data must be hashed',
      'Performance Max campaigns now default for lead gen – webhook auto-synced',
    ],
  },
  {
    id: 'bing_lead_ad',
    platform: 'bing',
    subtype: 'lead_ad',
    title: 'Microsoft / Bing Ads',
    description: 'Connect with Microsoft Advertising to capture leads from Bing, Edge, LinkedIn Audience Network (2026 API v14).',
    icon: '🔷',
    iconBg: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500',
    actionLabel: 'View Details',
    hasOAuth: false,
    complianceNotes: [
      'Microsoft Advertising API v14 (2026) – v13 deprecated',
      'OAuth 2.0 via Microsoft Identity Platform (MSAL)',
      'Universal Event Tracking (UET) tag required for conversions',
      'LinkedIn profile targeting available via Microsoft Audience Network',
      'Automated bidding powered by Microsoft Copilot AI signals',
      'GDPR/CCPA: Microsoft Consent Mode integration required for EU/US privacy',
      'Responsive Search Ads mandatory – expanded text ads fully sunset',
    ],
  },
  {
    id: 'facebook_offline',
    platform: 'facebook',
    subtype: 'offline_conversions',
    title: 'Facebook Offline Conversions',
    description: 'Connect with Facebook Offline Conversion to remarket the leads using ads',
    icon: '🔄',
    iconBg: 'bg-blue-600/10',
    borderColor: 'border-blue-600',
    actionLabel: 'Connect',
    hasOAuth: false,
    complianceNotes: [],
  },
  {
    id: 'facebook_custom_audiences',
    platform: 'facebook',
    subtype: 'custom_audiences',
    title: 'Facebook Custom Audiences',
    description: 'Connect with Facebook Custom Audiences to remarket the leads using ads',
    icon: '👥',
    iconBg: 'bg-blue-400/10',
    borderColor: 'border-blue-400',
    actionLabel: 'Connect',
    hasOAuth: false,
    complianceNotes: [],
  },
  {
    id: 'google_customer_list',
    platform: 'google',
    subtype: 'customer_list',
    title: 'Google Customer List',
    description: 'Connect with Google Customer List to remarket the leads using ads',
    icon: '📋',
    iconBg: 'bg-green-500/10',
    borderColor: 'border-green-500',
    actionLabel: 'Connect',
    hasOAuth: false,
    complianceNotes: [],
  },
  {
    id: 'google_offline',
    platform: 'google',
    subtype: 'offline_conversions',
    title: 'Google Offline Conversion',
    description: 'Connect with Google Offline Conversion to remarket the leads using ads',
    icon: '🔁',
    iconBg: 'bg-red-500/10',
    borderColor: 'border-red-500',
    actionLabel: 'Connect',
    hasOAuth: false,
    complianceNotes: [],
  },
];

function formatDate(iso: string) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}

function generateKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AdPlatformsPage() {
  const { toast } = useToast();
  const [universities, setUniversities] = useState<UniversityOption[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [incomingLeads, setIncomingLeads] = useState<IncomingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState('');

  // View state: 'grid' shows all cards, 'detail' shows specific platform detail
  const [activeView, setActiveView] = useState<'grid' | 'detail'>('grid');
  const [detailCard, setDetailCard] = useState<typeof PLATFORM_CARDS[0] | null>(null);
  const [activeTab, setActiveTab] = useState('integrations');

  // Setup modal
  const [showSetup, setShowSetup] = useState(false);
  const [setupPlatform, setSetupPlatform] = useState<string>('facebook');
  const [setupSubtype, setSetupSubtype] = useState<string>('lead_ad');
  const [setupName, setSetupName] = useState('');
  const [setupUniId, setSetupUniId] = useState('');
  const [setupMapping, setSetupMapping] = useState<Record<string, string>>({});
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uniRes, logsRes] = await Promise.all([
        supabase.from('universities').select('id, name').order('name'),
        supabase.from('api_logs').select('*')
          .in('source', ['Facebook Lead Ads', 'Google Lead Ads', 'Bing Lead Ads'])
          .order('created_at', { ascending: false }).limit(500),
      ]);
      if (uniRes.data) setUniversities(uniRes.data);

      const { data: settingsData } = await supabase.from('app_settings').select('*').like('key', 'ad_integration_%');
      const integrationList: Integration[] = [];
      if (settingsData) {
        for (const s of settingsData) {
          try {
            const config = JSON.parse(s.value || '{}');
            const uni = uniRes.data?.find(u => u.id === config.university_id);
            const platform = config.platform || 'facebook';
            const subtype = config.subtype || 'lead_ad';
            const functionName = platform === 'facebook' ? 'meta-ads-webhook' : 'google-ads-webhook';
            const leadCount = (logsRes.data || []).filter(l =>
              l.source === (platform === 'facebook' ? 'Facebook Lead Ads' : 'Google Lead Ads') &&
              (!config.university_id || l.university_id === config.university_id)
            ).length;
            const lastLead = (logsRes.data || []).find(l =>
              l.source === (platform === 'facebook' ? 'Facebook Lead Ads' : 'Google Lead Ads')
            );
            integrationList.push({
              id: s.id, platform, subtype,
              name: config.name || `${platform} Integration`,
              account_name: config.account_name || config.name || '',
              university_id: config.university_id || null,
              university_name: uni?.name || 'Not linked',
              is_active: config.is_active !== false,
              webhook_url: getWebhookUrl(functionName, config.university_id || undefined),
              webhook_key: config.webhook_key || '',
              field_mapping: config.field_mapping || (platform === 'facebook' ? DEFAULT_FB_MAPPING : DEFAULT_GOOGLE_MAPPING),
              created_at: s.updated_at || '', leads_received: leadCount,
              last_lead_at: lastLead?.created_at || null,
            });
          } catch { /* skip */ }
        }
      }
      setIntegrations(integrationList);

      if (logsRes.data) {
        setIncomingLeads(logsRes.data.map((l: any) => {
          const ld = typeof l.lead_data === 'object' ? l.lead_data : {};
          const uni = uniRes.data?.find(u => u.id === l.university_id);
          return {
            id: l.id, name: ld?.name || ld?.full_name || l.email || 'Unknown',
            email: l.email || ld?.email || '', mobile: l.mobile || ld?.mobile || ld?.phone || '',
            source: l.source || '', campaign: l.campaign || ld?.campaign || '',
            university: uni?.name || 'Unlinked', status: l.status, created_at: l.created_at,
          };
        }));
      }
    } catch (err) {
      console.error('Error fetching ad platform data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
    setTimeout(() => setCopiedField(''), 2000);
  };

  const CopyBtn = ({ text, field }: { text: string; field: string }) => (
    <button onClick={() => copyToClipboard(text, field)} className="inline-flex items-center justify-center h-7 w-7 rounded border border-border hover:bg-muted/50 transition-colors shrink-0">
      {copiedField === field ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );

  const openSetupForCard = (card: typeof PLATFORM_CARDS[0]) => {
    setSetupPlatform(card.platform);
    setSetupSubtype(card.subtype);
    setSetupName('');
    setSetupUniId('');
    setSetupMapping(card.platform === 'facebook' ? { ...DEFAULT_FB_MAPPING } : card.platform === 'bing' ? { ...DEFAULT_BING_MAPPING } : { ...DEFAULT_GOOGLE_MAPPING });
    setNewFieldKey(''); setNewFieldValue('');
    setShowSetup(true);
  };

  const saveIntegration = async () => {
    if (!setupName.trim()) { toast({ title: 'Error', description: 'Enter account name', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const config = {
        platform: setupPlatform, subtype: setupSubtype,
        name: setupName, account_name: setupName,
        university_id: setupUniId || null, is_active: true,
        field_mapping: setupMapping, webhook_key: generateKey(),
      };
      const key = `ad_integration_${setupPlatform}_${setupSubtype}_${Date.now()}`;
      const { error } = await supabase.from('app_settings').insert({ key, value: JSON.stringify(config) });
      if (error) throw error;
      toast({ title: 'Integration Created', description: `${setupName} connected successfully` });
      setShowSetup(false); fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const deleteIntegration = async (id: string) => {
    if (!confirm('Remove this connected account?')) return;
    await supabase.from('app_settings').delete().eq('id', id);
    fetchData();
    toast({ title: 'Account Removed' });
  };

  const addFieldMapping = () => {
    if (!newFieldKey.trim() || !newFieldValue) return;
    setSetupMapping(prev => ({ ...prev, [newFieldKey.trim()]: newFieldValue }));
    setNewFieldKey(''); setNewFieldValue('');
  };

  const removeFieldMapping = (key: string) => {
    setSetupMapping(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const getCardIntegrations = (card: typeof PLATFORM_CARDS[0]) =>
    integrations.filter(i => i.platform === card.platform && i.subtype === card.subtype);

  const openDetail = (card: typeof PLATFORM_CARDS[0]) => {
    setDetailCard(card);
    setActiveView('detail');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading integrations...</span>
      </div>
    );
  }

  // ======= DETAIL VIEW =======
  if (activeView === 'detail' && detailCard) {
    const cardIntegrations = getCardIntegrations(detailCard);
    const isGoogleWebhook = detailCard.platform === 'google' && detailCard.subtype === 'lead_ad';
    const isFacebookLeadAd = detailCard.platform === 'facebook' && detailCard.subtype === 'lead_ad';
    const isBingWebhook = detailCard.platform === 'bing' && detailCard.subtype === 'lead_ad';
    const complianceNotes = (detailCard as any).complianceNotes || [];

    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveView('grid')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">{detailCard.title}</h1>
        </div>

        {/* 2026 Compliance Notes */}
        {complianceNotes.length > 0 && (
          <Card className="p-5 border-l-4 border-primary">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              2026 Compliance & Integration Guidelines
            </h3>
            <div className="space-y-1.5">
              {complianceNotes.map((note: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {isFacebookLeadAd && (
          <p className="text-sm text-muted-foreground -mt-3 ml-12">
            Load your Facebook Ads data into your lead management system. Connect your ad accounts to capture leads automatically.
          </p>
        )}

        {isGoogleWebhook && (
          <>
            {/* Webhook Integration Section */}
            <Card className="p-5 space-y-4">
              <h3 className="font-display font-semibold border-b border-border pb-2">Webhook Integration</h3>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Integration Key</h4>
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24 shrink-0">Webhook Url :</span>
                    <code className="text-sm font-mono flex-1 break-all">{getWebhookUrl('google-ads-webhook')}</code>
                    <CopyBtn text={getWebhookUrl('google-ads-webhook')} field="google-webhook-url" />
                  </div>
                  {cardIntegrations.length > 0 && cardIntegrations[0].webhook_key && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Key :</span>
                      <code className="text-sm font-mono flex-1 break-all">{cardIntegrations[0].webhook_key}</code>
                      <CopyBtn text={cardIntegrations[0].webhook_key} field="google-webhook-key" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Sync your Google Ads data with our system</h4>
                <p className="text-sm text-muted-foreground">This will help in centralizing and nurturing your Google Ads Lead data on a real-time basis.</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Benefits of using Google Lead Form</h4>
                <div className="bg-primary/5 border-l-4 border-primary rounded-r-lg p-3 space-y-1 text-sm text-muted-foreground">
                  <p>Generate leads to an increase in sales for your service.</p>
                  <p>Drive leads & benefit your marketing funnel to help get more conversions.</p>
                  <p>Create a new remarketing list of people who show their interest in your product.</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">To Integrate Google Ads, follow below steps:</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Sign in to your Google Ads account.',
                    'In the page menu on the left, click Settings.',
                    'Click the name of the campaign that you\'d like to edit.',
                    'Next to "Lead form", click the drop-down arrow.',
                    'To edit, click the pencil icon.',
                    'From the lead delivery options, click Webhook.',
                    'Add your Webhook URL.',
                    'Add your Key.',
                    'Click Send test data.',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Sample POST payload</h4>
                <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">{JSON.stringify({
                  name: "John Doe", email: "john@example.com", phone: "9876543210",
                  city: "Delhi", course: "MBA", campaign: "Google_MBA"
                }, null, 2)}</pre>
              </div>
            </Card>

            {/* Connected accounts */}
            {cardIntegrations.length > 0 && (
              <Card className="p-5 space-y-3">
                <h3 className="font-display font-semibold">Connected Accounts</h3>
                <div className="space-y-2">
                  {cardIntegrations.map(intg => (
                    <div key={intg.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{detailCard.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{intg.account_name || intg.name}</p>
                          <p className="text-xs text-muted-foreground">→ {intg.university_name} • {intg.leads_received} leads</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { /* manage */ }}>Manage</Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => deleteIntegration(intg.id)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Button onClick={() => openSetupForCard(detailCard)}>
              <Zap className="h-4 w-4 mr-2" /> Add New Connection
            </Button>
          </>
        )}

        {isFacebookLeadAd && (
          <>
            {/* Connected accounts grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardIntegrations.map(intg => (
                <Card key={intg.id} className="p-5 text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Megaphone className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <p className="text-sm">
                    Connected with <strong>{intg.account_name || intg.name}</strong> to capture the leads using Facebook ads
                  </p>
                  <p className="text-xs text-muted-foreground">{intg.leads_received} leads • → {intg.university_name}</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm">Manage</Button>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => deleteIntegration(intg.id)}>Remove</Button>
                  </div>
                </Card>
              ))}

              {/* Connect new account card */}
              <Card className="p-5 text-center space-y-3 border-dashed flex flex-col items-center justify-center min-h-[200px]">
                <p className="text-sm text-muted-foreground">Click here to Connect with<br />new Account</p>
                <Button onClick={() => openSetupForCard(detailCard)} className="bg-blue-600 hover:bg-blue-700">
                  <span className="mr-2">f</span> Connect With Facebook
                </Button>
              </Card>
            </div>

            {/* Webhook info */}
            <Card className="p-5 space-y-3">
              <h3 className="font-display font-semibold">Webhook Details</h3>
              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-24 shrink-0">Webhook Url :</span>
                  <code className="text-sm font-mono flex-1 break-all">{getWebhookUrl('meta-ads-webhook')}</code>
                  <CopyBtn text={getWebhookUrl('meta-ads-webhook')} field="fb-webhook-url" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-24 shrink-0">Verify Token :</span>
                  <code className="text-sm font-mono">Set as META_VERIFY_TOKEN in Supabase secrets</code>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Bing / Microsoft Ads Webhook */}
        {isBingWebhook && (
          <>
            <Card className="p-5 space-y-4">
              <h3 className="font-display font-semibold border-b border-border pb-2">Microsoft Advertising Webhook</h3>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Integration Key</h4>
                <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-24 shrink-0">Webhook Url :</span>
                    <code className="text-sm font-mono flex-1 break-all">{getWebhookUrl('google-ads-webhook')}</code>
                    <CopyBtn text={getWebhookUrl('google-ads-webhook')} field="bing-webhook-url" />
                  </div>
                  {cardIntegrations.length > 0 && cardIntegrations[0].webhook_key && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-24 shrink-0">Key :</span>
                      <code className="text-sm font-mono flex-1 break-all">{cardIntegrations[0].webhook_key}</code>
                      <CopyBtn text={cardIntegrations[0].webhook_key} field="bing-webhook-key" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">To Integrate Microsoft Ads (2026 v14 API):</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Sign in to Microsoft Advertising (ads.microsoft.com).',
                    'Navigate to Tools → Conversion tracking → UET tags.',
                    'Create or select a UET tag for your campaign.',
                    'Go to your campaign\'s Lead Form Extension settings.',
                    'Under delivery, select "Webhook" and paste your URL.',
                    'Add your Key in the authentication field.',
                    'Save and send test data to verify.',
                    'Enable Audience Network to also capture LinkedIn audience leads.',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                <h4 className="text-sm font-semibold mb-2">Sample POST payload</h4>
                <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">{JSON.stringify({
                  name: "Jane Smith", email: "jane@example.com", phone: "9876543210",
                  city: "Mumbai", course: "BBA", campaign: "Bing_BBA_2026", platform: "microsoft_ads"
                }, null, 2)}</pre>
              </div>
            </Card>

            {cardIntegrations.length > 0 && (
              <Card className="p-5 space-y-3">
                <h3 className="font-display font-semibold">Connected Accounts</h3>
                <div className="space-y-2">
                  {cardIntegrations.map(intg => (
                    <div key={intg.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{detailCard.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{intg.account_name || intg.name}</p>
                          <p className="text-xs text-muted-foreground">→ {intg.university_name} • {intg.leads_received} leads</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">Manage</Button>
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => deleteIntegration(intg.id)}>Remove</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Button onClick={() => openSetupForCard(detailCard)}>
              <Zap className="h-4 w-4 mr-2" /> Add New Connection
            </Button>
          </>
        )}

        {/* Generic connect view for other types */}
        {!isGoogleWebhook && !isFacebookLeadAd && !isBingWebhook && (
          <Card className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-xl mx-auto flex items-center justify-center text-3xl bg-muted/50">{detailCard.icon}</div>
            <h3 className="font-display font-semibold text-lg">{detailCard.title}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{detailCard.description}</p>

            {cardIntegrations.length > 0 ? (
              <div className="space-y-2 max-w-md mx-auto">
                {cardIntegrations.map(intg => (
                  <div key={intg.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-left">
                    <div>
                      <p className="font-semibold text-sm">{intg.account_name}</p>
                      <p className="text-xs text-muted-foreground">→ {intg.university_name}</p>
                    </div>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteIntegration(intg.id)}>Remove</Button>
                  </div>
                ))}
              </div>
            ) : null}

            <Button onClick={() => openSetupForCard(detailCard)}>
              <Zap className="h-4 w-4 mr-2" /> Connect
            </Button>
          </Card>
        )}

        {/* Incoming Leads for this platform */}
        {incomingLeads.filter(l => l.source.toLowerCase().includes(detailCard.platform)).length > 0 && (
          <Card className="p-5 space-y-3">
            <h3 className="font-display font-semibold">Recent Leads</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead><TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Mobile</TableHead>
                    <TableHead>University</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomingLeads.filter(l => l.source.toLowerCase().includes(detailCard.platform)).slice(0, 20).map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(lead.created_at)}</TableCell>
                      <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{lead.email || '-'}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{lead.mobile || '-'}</TableCell>
                      <TableCell className="text-xs">{lead.university}</TableCell>
                      <TableCell>
                        <Badge variant={lead.status === 'Success' ? 'default' : 'destructive'}
                          className={lead.status === 'Success' ? 'bg-success/20 text-success border-success/30 text-xs' : 'text-xs'}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ======= GRID VIEW (main) =======
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Ads Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect your ad platforms to capture leads automatically</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="integrations">Integration</TabsTrigger>
          <TabsTrigger value="leads">Incoming Leads ({incomingLeads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="mt-6">
          {/* NoPaperForms-style card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PLATFORM_CARDS.map(card => {
              const connected = getCardIntegrations(card);
              const isConnected = connected.length > 0;
              return (
                <Card key={card.id} className="p-5 flex flex-col items-center text-center space-y-3 hover:shadow-md transition-shadow">
                  {/* Icon */}
                  <div className={`h-16 w-16 rounded-xl ${card.iconBg} flex items-center justify-center text-3xl`}>
                    {card.id === 'facebook_lead_ad' && <Megaphone className="h-8 w-8 text-primary" />}
                    {card.id === 'google_lead_ad' && <Target className="h-8 w-8 text-primary" />}
                    {card.id === 'bing_lead_ad' && <Shield className="h-8 w-8 text-primary" />}
                    {card.id === 'facebook_offline' && <BarChart3 className="h-8 w-8 text-primary" />}
                    {card.id === 'facebook_custom_audiences' && <Users className="h-8 w-8 text-primary" />}
                    {card.id === 'google_customer_list' && <Globe className="h-8 w-8 text-primary" />}
                    {card.id === 'google_offline' && <ArrowRight className="h-8 w-8 text-primary" />}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {card.description.split(card.title.split(' ').slice(-2).join(' ')).map((part, i, arr) =>
                      i === arr.length - 1 ? part : (
                        <span key={i}>{part}<strong className="text-foreground">{card.title.split(' ').slice(-2).join(' ')}</strong></span>
                      )
                    )}
                  </p>

                  {/* Connected badge */}
                  {isConnected && (
                    <Badge className="bg-success/10 text-success border-success/30 text-xs">
                      {connected.length} account{connected.length > 1 ? 's' : ''} connected
                    </Badge>
                  )}

                  {/* Action button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto"
                    onClick={() => openDetail(card)}
                  >
                    {isConnected ? card.actionLabel : card.actionLabel}
                  </Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Incoming Leads Tab */}
        <TabsContent value="leads" className="mt-4">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead><TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Mobile</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="hidden md:table-cell">Campaign</TableHead>
                    <TableHead>University</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomingLeads.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No leads received yet. Connect a platform and incoming leads will appear here.
                    </TableCell></TableRow>
                  ) : incomingLeads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-xs whitespace-nowrap">{formatDate(lead.created_at)}</TableCell>
                      <TableCell className="font-medium text-sm">{lead.name}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{lead.email || '-'}</TableCell>
                      <TableCell className="text-xs hidden sm:table-cell">{lead.mobile || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {lead.source.includes('Facebook') ? '📘' : '📊'} {lead.source.replace(' Lead Ads', '')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs hidden md:table-cell">{lead.campaign || '-'}</TableCell>
                      <TableCell className="text-xs">{lead.university}</TableCell>
                      <TableCell>
                        <Badge variant={lead.status === 'Success' ? 'default' : 'destructive'}
                          className={lead.status === 'Success' ? 'bg-success/20 text-success border-success/30 text-xs' : 'text-xs'}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Setup Modal */}
      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Connect {setupPlatform === 'facebook' ? 'Facebook' : setupPlatform === 'bing' ? 'Microsoft / Bing' : 'Google'} Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Account / Integration Name *</Label>
              <Input value={setupName} onChange={e => setSetupName(e.target.value)} placeholder="e.g. My Business Page" />
            </div>

            <div>
              <Label>Route Leads to University</Label>
              <Select value={setupUniId || '__none__'} onValueChange={v => setSetupUniId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select university..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Store only (no auto-push)</SelectItem>
                  {universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Leads will be automatically pushed to this university's API</p>
            </div>

            <div>
              <Label className="flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" /> Field Mapping</Label>
              <p className="text-xs text-muted-foreground mb-2">Map ad platform field names to your system fields</p>
              <div className="space-y-1">
                {Object.entries(setupMapping).map(([from, to]) => (
                  <div key={from} className="flex items-center gap-2 text-sm">
                    <code className="flex-1 bg-muted/50 px-2 py-1 rounded text-xs font-mono truncate">{from}</code>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Select value={to} onValueChange={v => setSetupMapping(prev => ({ ...prev, [from]: v }))}>
                      <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{SYSTEM_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFieldMapping(from)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input className="h-8 text-xs" placeholder="Ad field name" value={newFieldKey} onChange={e => setNewFieldKey(e.target.value)} />
                <Select value={newFieldValue || '__pick__'} onValueChange={v => setNewFieldValue(v === '__pick__' ? '' : v)}>
                  <SelectTrigger className="h-8 w-[140px]"><SelectValue placeholder="Map to..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__">Select field...</SelectItem>
                    {SYSTEM_FIELDS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8" onClick={addFieldMapping}>Add</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetup(false)}>Cancel</Button>
            <Button onClick={saveIntegration} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Connect Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
