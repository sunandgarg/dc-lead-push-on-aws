import { memo, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Radio, 
  FileText, 
  Link2, 
  Megaphone, 
  BarChart3,
  Users,
  GitBranch,
  Repeat,
  ArrowLeft,
  MessageSquare,
  Mail
} from 'lucide-react';
import { MarketingDashboard } from '../../marketing/dashboard/MarketingDashboard';
import { ChannelsTab } from '../../marketing/channels/ChannelsTab';
import { TemplatesTab } from '../../marketing/templates/TemplatesTab';
import { IntegrationsTab } from '../../marketing/integrations/IntegrationsTab';
import { CampaignsTab } from '../../marketing/campaigns/CampaignsTab';
import { AnalyticsTab } from '../../marketing/analytics/AnalyticsTab';
import { MarketingLeadsTab } from '../../marketing/leads/MarketingLeadsTab';
import { SequenceBuilder } from '../../marketing/automation/SequenceBuilder';
import { WorkflowBuilder } from '../../marketing/automation/WorkflowBuilder';
import { WhatsAppModule } from '../whatsapp/WhatsAppModule';
import { EmailModule } from '../../email/EmailModule';
import { appCache } from '@/hooks/useAppCache';

const subTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'channels', label: 'Channels', icon: Radio },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'sequences', label: 'Sequences', icon: Repeat },
  { id: 'workflows', label: 'Workflows', icon: GitBranch },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// Memoize heavy components
const MemoizedMarketingDashboard = memo(MarketingDashboard);
const MemoizedChannelsTab = memo(ChannelsTab);
const MemoizedTemplatesTab = memo(TemplatesTab);
const MemoizedIntegrationsTab = memo(IntegrationsTab);
const MemoizedCampaignsTab = memo(CampaignsTab);
const MemoizedAnalyticsTab = memo(AnalyticsTab);
const MemoizedMarketingLeadsTab = memo(MarketingLeadsTab);
const MemoizedSequenceBuilder = memo(SequenceBuilder);
const MemoizedWorkflowBuilder = memo(WorkflowBuilder);
const MemoizedWhatsAppModule = memo(WhatsAppModule);
const MemoizedEmailModule = memo(EmailModule);

export function MarketingAutomationModule() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract sub-tab from URL - check for whatsapp sub-routes
  const activeSubTab = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    // /crm/marketing-automation/campaigns -> parts[2] is the subtab
    if (pathParts[0] === 'crm' && pathParts[1] === 'marketing-automation' && pathParts[2]) {
      // Handle whatsapp module which has its own sub-routes
      if (pathParts[2] === 'whatsapp') {
        appCache.setMarketingSubTab('whatsapp');
        return 'whatsapp';
      }
      const validTab = subTabs.find(t => t.id === pathParts[2]);
      if (validTab) {
        appCache.setMarketingSubTab(pathParts[2]);
        return pathParts[2];
      }
    }
    return appCache.marketingSubTab || 'dashboard';
  }, [location.pathname]);

  // Sync URL on mount if needed
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'crm' && pathParts[1] === 'marketing-automation' && !pathParts[2]) {
      const cachedTab = appCache.marketingSubTab || 'dashboard';
      navigate(`/crm/marketing-automation/${cachedTab}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleSubTabChange = (tab: string) => {
    if (tab !== activeSubTab) {
      appCache.setMarketingSubTab(tab);
      navigate(`/crm/marketing-automation/${tab}`);
    }
  };

  const handleBack = () => {
    navigate('/crm');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header with back button */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBack}
          className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to CRM Hub
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-purple-500" />
          Marketing Automation
        </h1>
        <p className="text-muted-foreground">
          Multi-channel campaigns with SMS, Email, WhatsApp and automated sequences
        </p>
      </div>

      <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {activeSubTab === 'dashboard' && <MemoizedMarketingDashboard />}
        </TabsContent>

        <TabsContent value="channels" className="mt-6">
          {activeSubTab === 'channels' && <MemoizedChannelsTab />}
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          {activeSubTab === 'email' && <MemoizedEmailModule />}
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          {activeSubTab === 'whatsapp' && (
            <MemoizedWhatsAppModule onBack={() => navigate('/crm/marketing-automation/channels')} />
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {activeSubTab === 'templates' && <MemoizedTemplatesTab />}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          {activeSubTab === 'campaigns' && <MemoizedCampaignsTab />}
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          {activeSubTab === 'sequences' && <MemoizedSequenceBuilder />}
        </TabsContent>

        <TabsContent value="workflows" className="mt-6">
          {activeSubTab === 'workflows' && <MemoizedWorkflowBuilder />}
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          {activeSubTab === 'leads' && <MemoizedMarketingLeadsTab />}
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          {activeSubTab === 'integrations' && <MemoizedIntegrationsTab />}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {activeSubTab === 'analytics' && <MemoizedAnalyticsTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(MarketingAutomationModule);
