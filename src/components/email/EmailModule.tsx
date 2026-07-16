import { memo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, Megaphone, FileText, Settings } from 'lucide-react';
import { EmailDashboard } from './EmailDashboard';
import { EmailCampaignList } from './EmailCampaignList';
import { EmailTemplateList } from './EmailTemplateList';
import { EmailSettings } from './EmailSettings';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaign', label: 'Campaign', icon: Megaphone },
  { id: 'template', label: 'Template', icon: FileText },
];

function EmailModuleInner() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) {
    return <EmailSettings onBack={() => setShowSettings(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Email Communication</h2>
          <p className="text-muted-foreground text-sm">Manage email campaigns, templates, and analytics via Netcore</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Email Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border p-1">
          {tabs.map((tab) => {
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
          {activeTab === 'dashboard' && <EmailDashboard />}
        </TabsContent>
        <TabsContent value="campaign" className="mt-6">
          {activeTab === 'campaign' && <EmailCampaignList />}
        </TabsContent>
        <TabsContent value="template" className="mt-6">
          {activeTab === 'template' && <EmailTemplateList />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const EmailModule = memo(EmailModuleInner);
export default EmailModule;
