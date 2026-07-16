 import { memo, useMemo, useEffect } from 'react';
 import { useNavigate, useLocation } from 'react-router-dom';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Button } from '@/components/ui/button';
 import { 
   Settings,
   FileText,
   Users,
   Megaphone,
   Inbox,
   BarChart3,
   DollarSign,
   Shield,
   ArrowLeft,
   MessageSquare
 } from 'lucide-react';
 import { appCache } from '@/hooks/useAppCache';
 import { WhatsAppSettings } from './WhatsAppSettings';
 import { WhatsAppTemplates } from './WhatsAppTemplates';
 import { WhatsAppContacts } from './WhatsAppContacts';
 import { WhatsAppCampaigns } from './WhatsAppCampaigns';
 import { WhatsAppInbox } from './WhatsAppInbox';
 import { WhatsAppAnalytics } from './WhatsAppAnalytics';
 import { WhatsAppCosts } from './WhatsAppCosts';
 import { WhatsAppCompliance } from './WhatsAppCompliance';
 
 const subTabs = [
   { id: 'settings', label: 'Settings', icon: Settings },
   { id: 'templates', label: 'Templates', icon: FileText },
   { id: 'contacts', label: 'Contacts', icon: Users },
   { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
   { id: 'inbox', label: 'Inbox', icon: Inbox },
   { id: 'analytics', label: 'Analytics', icon: BarChart3 },
   { id: 'costs', label: 'Costs', icon: DollarSign },
   { id: 'compliance', label: 'Compliance', icon: Shield },
 ];
 
 // Memoize components
 const MemoizedWhatsAppSettings = memo(WhatsAppSettings);
 const MemoizedWhatsAppTemplates = memo(WhatsAppTemplates);
 const MemoizedWhatsAppContacts = memo(WhatsAppContacts);
 const MemoizedWhatsAppCampaigns = memo(WhatsAppCampaigns);
 const MemoizedWhatsAppInbox = memo(WhatsAppInbox);
 const MemoizedWhatsAppAnalytics = memo(WhatsAppAnalytics);
 const MemoizedWhatsAppCosts = memo(WhatsAppCosts);
 const MemoizedWhatsAppCompliance = memo(WhatsAppCompliance);
 
 interface WhatsAppModuleProps {
   onBack?: () => void;
 }
 
 export function WhatsAppModule({ onBack }: WhatsAppModuleProps) {
   const navigate = useNavigate();
   const location = useLocation();
 
   // Extract sub-tab from URL: /crm/marketing-automation/whatsapp/settings
   const activeSubTab = useMemo(() => {
     const pathParts = location.pathname.split('/').filter(Boolean);
     // /crm/marketing-automation/whatsapp/settings -> parts[3] is the subtab
     if (pathParts[0] === 'crm' && pathParts[1] === 'marketing-automation' && pathParts[2] === 'whatsapp' && pathParts[3]) {
       const validTab = subTabs.find(t => t.id === pathParts[3]);
       if (validTab) {
         return pathParts[3];
       }
     }
     return 'settings';
   }, [location.pathname]);
 
   // Sync URL on mount if needed
   useEffect(() => {
     const pathParts = location.pathname.split('/').filter(Boolean);
     if (pathParts[0] === 'crm' && pathParts[1] === 'marketing-automation' && pathParts[2] === 'whatsapp' && !pathParts[3]) {
       navigate(`/crm/marketing-automation/whatsapp/settings`, { replace: true });
     }
   }, [location.pathname, navigate]);
 
   const handleSubTabChange = (tab: string) => {
     if (tab !== activeSubTab) {
       navigate(`/crm/marketing-automation/whatsapp/${tab}`);
     }
   };
 
   const handleBack = () => {
     if (onBack) {
       onBack();
     } else {
       navigate('/crm/marketing-automation/channels');
     }
   };
 
   return (
     <div className="space-y-6">
       {/* Header with back button */}
       <div>
         <Button 
           variant="ghost" 
           size="sm" 
           onClick={handleBack}
           className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
         >
           <ArrowLeft className="h-4 w-4 mr-1" />
           Back to Channels
         </Button>
         <div className="flex items-center gap-3">
           <div className="p-2 rounded-lg bg-emerald-500/10">
             <MessageSquare className="h-6 w-6 text-emerald-500" />
           </div>
           <div>
             <h1 className="text-2xl font-bold text-foreground">WhatsApp Marketing</h1>
             <p className="text-muted-foreground">Business API Integration & Campaign Management</p>
           </div>
         </div>
       </div>
 
       <Tabs value={activeSubTab} onValueChange={handleSubTabChange} className="space-y-6">
         <div className="overflow-x-auto pb-2">
           <TabsList className="inline-flex w-auto min-w-full lg:w-auto bg-card border border-border p-1">
             {subTabs.map((tab) => {
               const Icon = tab.icon;
               return (
                 <TabsTrigger
                   key={tab.id}
                   value={tab.id}
                   className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white whitespace-nowrap"
                 >
                   <Icon className="h-4 w-4" />
                   <span className="hidden sm:inline">{tab.label}</span>
                 </TabsTrigger>
               );
             })}
           </TabsList>
         </div>
 
         <TabsContent value="settings" className="mt-6">
           {activeSubTab === 'settings' && <MemoizedWhatsAppSettings />}
         </TabsContent>
 
         <TabsContent value="templates" className="mt-6">
           {activeSubTab === 'templates' && <MemoizedWhatsAppTemplates />}
         </TabsContent>
 
         <TabsContent value="contacts" className="mt-6">
           {activeSubTab === 'contacts' && <MemoizedWhatsAppContacts />}
         </TabsContent>
 
         <TabsContent value="campaigns" className="mt-6">
           {activeSubTab === 'campaigns' && <MemoizedWhatsAppCampaigns />}
         </TabsContent>
 
         <TabsContent value="inbox" className="mt-6">
           {activeSubTab === 'inbox' && <MemoizedWhatsAppInbox />}
         </TabsContent>
 
         <TabsContent value="analytics" className="mt-6">
           {activeSubTab === 'analytics' && <MemoizedWhatsAppAnalytics />}
         </TabsContent>
 
         <TabsContent value="costs" className="mt-6">
           {activeSubTab === 'costs' && <MemoizedWhatsAppCosts />}
         </TabsContent>
 
         <TabsContent value="compliance" className="mt-6">
           {activeSubTab === 'compliance' && <MemoizedWhatsAppCompliance />}
         </TabsContent>
       </Tabs>
     </div>
   );
 }
 
 export default memo(WhatsAppModule);