import { memo, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CRMModuleHub } from './CRMModuleHub';
import { LeadManagementModule } from './modules/LeadManagementModule';
import { MarketingAutomationModule } from './modules/MarketingAutomationModule';
import { WorkflowAutomationModule } from './modules/WorkflowAutomationModule';
import { ApplicationManagementModule } from './modules/ApplicationManagementModule';
import { AIFeaturesModule } from './modules/AIFeaturesModule';
import { AnalyticsReportingModule } from './modules/AnalyticsReportingModule';
import { PaymentBillingModule } from './modules/PaymentBillingModule';
import { OmnichannelCampaignHub } from './modules/OmnichannelCampaignHub';
import { CRMConfigSettings } from './modules/CRMConfigSettings';
import { FunnelCampaignModule } from './funnel/FunnelCampaignModule';
import { appCache } from '@/hooks/useAppCache';

interface CRMModuleProps {
  universities: any[];
}

export function CRMModule({ universities }: CRMModuleProps) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { activeModule, subTab, detailId } = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts[0] === 'crm') {
      return {
        activeModule: parts[1] || 'hub',
        subTab: parts[2] || null,
        detailId: parts[3] || null,
      };
    }
    return { activeModule: 'hub', subTab: null, detailId: null };
  }, [location.pathname]);

  // Persist the CRM sub-tab to cache
  useEffect(() => {
    if (activeModule !== 'hub') {
      appCache.setCrmSubTab(activeModule);
    }
  }, [activeModule]);

  switch (activeModule) {
    case 'lead-management':
      return <LeadManagementModule universities={universities} />;
    case 'marketing-automation':
      return <MarketingAutomationModule />;
    case 'workflow-automation':
      return <WorkflowAutomationModule />;
    case 'application-management':
      return <ApplicationManagementModule />;
    case 'ai-features':
      return <AIFeaturesModule />;
    case 'analytics-reporting':
      return <AnalyticsReportingModule />;
    case 'payment-billing':
      return <PaymentBillingModule />;
    case 'omnichannel':
      return <OmnichannelCampaignHub />;
    case 'funnel-campaigns':
      return <FunnelCampaignModule />;
    case 'crm-settings':
      return <CRMConfigSettings />;
    case 'hub':
    default:
      return <CRMModuleHub universities={universities} />;
  }
}

export default memo(CRMModule);
