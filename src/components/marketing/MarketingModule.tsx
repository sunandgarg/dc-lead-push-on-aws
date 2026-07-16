import { memo, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  Radio, 
  FileText, 
  Link2, 
  Megaphone, 
  BarChart3,
  Users
} from 'lucide-react';
import { MarketingDashboard } from './dashboard/MarketingDashboard';
import { ChannelsTab } from './channels/ChannelsTab';
import { TemplatesTab } from './templates/TemplatesTab';
import { IntegrationsTab } from './integrations/IntegrationsTab';
import { CampaignsTab } from './campaigns/CampaignsTab';
import { AnalyticsTab } from './analytics/AnalyticsTab';
import { MarketingLeadsTab } from './leads/MarketingLeadsTab';
import { appCache } from '@/hooks/useAppCache';

const subTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'channels', label: 'Channels', icon: Radio },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'leads', label: 'Leads', icon: Users },
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

export function MarketingModule() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract sub-tab from URL
  const activeSubTab = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'marketing' && pathParts[1]) {
      const validTab = subTabs.find(t => t.id === pathParts[1]);
      if (validTab) {
        appCache.setMarketingSubTab(pathParts[1]);
        return pathParts[1];
      }
    }
    return appCache.marketingSubTab || 'dashboard';
  }, [location.pathname]);

  // Sync URL on mount if needed
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'marketing' && !pathParts[1]) {
      const cachedTab = appCache.marketingSubTab || 'dashboard';
      navigate(`/marketing/${cachedTab}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleSubTabChange = (tab: string) => {
    if (tab !== activeSubTab) {
      appCache.setMarketingSubTab(tab);
      navigate(`/marketing/${tab}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground">Marketing Automation</h1>
        <p className="text-muted-foreground mt-1">
          Multi-channel campaigns with SMS, Email, and WhatsApp
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

        <TabsContent value="templates" className="mt-6">
          {activeSubTab === 'templates' && <MemoizedTemplatesTab />}
        </TabsContent>

        <TabsContent value="integrations" className="mt-6">
          {activeSubTab === 'integrations' && <MemoizedIntegrationsTab />}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          {activeSubTab === 'campaigns' && <MemoizedCampaignsTab />}
        </TabsContent>

        <TabsContent value="leads" className="mt-6">
          {activeSubTab === 'leads' && <MemoizedMarketingLeadsTab />}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {activeSubTab === 'analytics' && <MemoizedAnalyticsTab />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
