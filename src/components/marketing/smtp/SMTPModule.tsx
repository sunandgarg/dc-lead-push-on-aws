import { memo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Mail, BarChart2, Users, FileText, Settings } from 'lucide-react';
import { SMTPChannelConfig } from './SMTPChannelConfig';
import { SMTPCampaignBuilder } from './SMTPCampaignBuilder';
import { SMTPAnalyticsDashboard } from './SMTPAnalyticsDashboard';
import { SMTPTemplates } from './SMTPTemplates';
import { SMTPSuppressionList } from './SMTPSuppressionList';

const MemoizedSMTPChannelConfig = memo(SMTPChannelConfig);
const MemoizedSMTPCampaignBuilder = memo(SMTPCampaignBuilder);
const MemoizedSMTPAnalyticsDashboard = memo(SMTPAnalyticsDashboard);

export function SMTPModule() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" />
          SMTP Email Marketing
        </h2>
        <p className="text-muted-foreground mt-1">
          Full-featured SMTP email marketing with tracking, analytics, and multi-domain support
        </p>
      </div>

      <Tabs defaultValue="domains" className="space-y-6">
        <TabsList className="bg-card border border-border p-1 h-auto flex-wrap">
          <TabsTrigger value="domains" className="flex items-center gap-2 px-4 py-2.5">
            <Server className="h-4 w-4" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2 px-4 py-2.5">
            <Mail className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 px-4 py-2.5">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 px-4 py-2.5">
            <BarChart2 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="suppression" className="flex items-center gap-2 px-4 py-2.5">
            <Users className="h-4 w-4" />
            Suppression List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domains">
          <MemoizedSMTPChannelConfig />
        </TabsContent>

        <TabsContent value="campaigns">
          <MemoizedSMTPCampaignBuilder />
        </TabsContent>

        <TabsContent value="templates">
          <SMTPTemplates />
        </TabsContent>

        <TabsContent value="analytics">
          <MemoizedSMTPAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="suppression">
          <SMTPSuppressionList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
