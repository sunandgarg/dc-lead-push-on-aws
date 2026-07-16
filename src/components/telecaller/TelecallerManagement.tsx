import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UsersTable } from './users/UsersTable';
import { LeadsTable } from './leads/LeadsTable';
import { WhatsAppTemplateManager } from './whatsapp/WhatsAppTemplateManager';
import { LeadSourceAnalytics } from './analytics/LeadSourceAnalytics';
import { Users, Contact, MessageCircle, BarChart3 } from 'lucide-react';

export function TelecallerManagement() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Telecalling & Lead Management</h1>
        <p className="text-muted-foreground text-sm">Manage users, leads, WhatsApp templates, and analytics</p>
      </div>

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="users" className="flex items-center gap-2 text-xs sm:text-sm py-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2 text-xs sm:text-sm py-2">
            <Contact className="h-4 w-4" />
            <span className="hidden sm:inline">All Leads</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2 text-xs sm:text-sm py-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs sm:text-sm py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4"><UsersTable /></TabsContent>
        <TabsContent value="leads" className="mt-4"><LeadsTable /></TabsContent>
        <TabsContent value="whatsapp" className="mt-4"><WhatsAppTemplateManager /></TabsContent>
        <TabsContent value="analytics" className="mt-4"><LeadSourceAnalytics /></TabsContent>
      </Tabs>
    </div>
  );
}
