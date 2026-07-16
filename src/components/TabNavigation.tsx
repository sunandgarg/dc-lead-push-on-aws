import { useState } from 'react';
import { LayoutDashboard, Users, Zap, Settings, Link2, ClipboardList, Plug, BotMessageSquare, Headset, Building2, ChevronDown } from 'lucide-react';
import { useFeatureToggles } from '@/hooks/useFeatureToggles';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
}

const tabs = [
  { id: 'all-leads', label: 'All Leads', icon: ClipboardList, featureKey: 'lms' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, featureKey: null },
  { id: 'crm', label: 'CRM', icon: Users, featureKey: 'crm' },
  { id: 'lead-push', label: 'Lead Push', icon: Zap, featureKey: 'lead_push' },
  { id: 'connections', label: 'Connections', icon: Plug, featureKey: 'connections' },
  { id: 'automation', label: 'Automation', icon: BotMessageSquare, featureKey: 'automation' },
  { id: 'url-shortener', label: 'URL Shortener', icon: Link2, featureKey: 'url_shortener' },
  { id: 'telecaller-mgmt', label: 'Telecaller', icon: Headset, featureKey: 'telecaller' },
  { id: 'uni-tracker', label: 'Uni Tracker', icon: Building2, featureKey: null, adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings, featureKey: null },
];

export function TabNavigation({ activeTab, onTabChange, isAdmin = false }: TabNavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isFeatureEnabled } = useFeatureToggles();

  const getActiveTabId = () => {
    if (['universities', 'upload', 'history', 'logs'].includes(activeTab)) return 'lead-push';
    if (activeTab === 'marketing') return 'crm';
    return activeTab;
  };
  
  const currentTabId = getActiveTabId();
  const visibleTabs = tabs.filter(tab => {
    if (!isAdmin) return tab.id === 'lead-push';
    if (tab.adminOnly && !isAdmin) return false;
    // Admins always see all tabs; non-admins respect feature toggles
    if (!isAdmin && tab.featureKey && !isFeatureEnabled(tab.featureKey)) return false;
    return true;
  });
  const activeTabObj = visibleTabs.find(t => t.id === currentTabId) || visibleTabs[0];
  const ActiveIcon = activeTabObj?.icon || LayoutDashboard;

  return (
    <nav className="border-b border-border bg-card">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Desktop: horizontal scrollable tabs */}
        <div className="hidden md:flex gap-1 overflow-x-auto scrollbar-hide">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTabId === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all
                  border-b-2 -mb-px whitespace-nowrap
                  ${isActive 
                    ? 'border-primary text-primary bg-primary/5' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Mobile: dropdown-style navigation */}
        <div className="md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-between w-full py-3 text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <ActiveIcon className="h-4 w-4 text-primary" />
              <span className="text-primary font-semibold">{activeTabObj?.label}</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
          </button>

          {mobileOpen && (
            <div className="pb-2 grid grid-cols-3 gap-1">
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTabId === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setMobileOpen(false);
                    }}
                    className={`
                      flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all
                      ${isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate w-full text-center">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
