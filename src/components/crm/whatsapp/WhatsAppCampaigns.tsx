 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Progress } from '@/components/ui/progress';
 import {
   Plus,
   Play,
   Pause,
   Eye,
   Copy,
   Trash2,
   BarChart3,
   Clock,
   CheckCircle,
   XCircle,
   AlertTriangle,
   Megaphone,
   Users,
   Send
 } from 'lucide-react';
 
 interface Campaign {
   id: string;
   name: string;
   status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'failed';
   templateName: string;
   totalRecipients: number;
   messagesSent: number;
   messagesDelivered: number;
   messagesRead: number;
   messagesFailed: number;
   scheduledAt?: string;
   startedAt?: string;
   completedAt?: string;
   estimatedCost: number;
 }
 
 const mockCampaigns: Campaign[] = [
   {
     id: '1',
     name: 'MBA Admission 2025',
     status: 'completed',
     templateName: 'welcome_message',
     totalRecipients: 5000,
     messagesSent: 5000,
     messagesDelivered: 4850,
     messagesRead: 3200,
     messagesFailed: 150,
     startedAt: '2025-01-20T10:00:00Z',
     completedAt: '2025-01-20T12:30:00Z',
     estimatedCost: 250,
   },
   {
     id: '2',
     name: 'Course Inquiry Follow-up',
     status: 'active',
     templateName: 'course_inquiry',
     totalRecipients: 2500,
     messagesSent: 1200,
     messagesDelivered: 1150,
     messagesRead: 800,
     messagesFailed: 50,
     startedAt: '2025-02-01T09:00:00Z',
     estimatedCost: 125,
   },
   {
     id: '3',
     name: 'Scholarship Announcement',
     status: 'scheduled',
     templateName: 'new_promo_template',
     totalRecipients: 10000,
     messagesSent: 0,
     messagesDelivered: 0,
     messagesRead: 0,
     messagesFailed: 0,
     scheduledAt: '2025-02-10T08:00:00Z',
     estimatedCost: 500,
   },
   {
     id: '4',
     name: 'Test Campaign',
     status: 'draft',
     templateName: 'welcome_message',
     totalRecipients: 100,
     messagesSent: 0,
     messagesDelivered: 0,
     messagesRead: 0,
     messagesFailed: 0,
     estimatedCost: 5,
   },
 ];
 
 export function WhatsAppCampaigns() {
   const [campaigns] = useState<Campaign[]>(mockCampaigns);
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case 'completed':
         return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
       case 'active':
         return <Badge className="bg-blue-500"><Play className="h-3 w-3 mr-1" />Active</Badge>;
       case 'scheduled':
         return <Badge className="bg-purple-500"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
       case 'paused':
         return <Badge className="bg-yellow-500"><Pause className="h-3 w-3 mr-1" />Paused</Badge>;
       case 'failed':
         return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
       case 'draft':
         return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Draft</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   const stats = {
     total: campaigns.length,
     active: campaigns.filter(c => c.status === 'active').length,
     completed: campaigns.filter(c => c.status === 'completed').length,
     totalSent: campaigns.reduce((acc, c) => acc + c.messagesSent, 0),
   };
 
   return (
     <div className="space-y-6">
       {/* Stats */}
       <div className="grid gap-4 sm:grid-cols-4">
         <Card className="card-elevated">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <Megaphone className="h-5 w-5 text-muted-foreground" />
               <span className="text-sm text-muted-foreground">Total Campaigns</span>
             </div>
             <p className="text-3xl font-bold mt-2">{stats.total}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <Play className="h-5 w-5 text-blue-500" />
               <span className="text-sm text-muted-foreground">Active</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-blue-500">{stats.active}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <CheckCircle className="h-5 w-5 text-green-500" />
               <span className="text-sm text-muted-foreground">Completed</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-green-500">{stats.completed}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <Send className="h-5 w-5 text-emerald-500" />
               <span className="text-sm text-muted-foreground">Messages Sent</span>
             </div>
             <p className="text-3xl font-bold mt-2">{stats.totalSent.toLocaleString()}</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Campaigns List */}
       <Card className="card-elevated">
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle>Campaigns</CardTitle>
             <CardDescription>Create and manage WhatsApp marketing campaigns</CardDescription>
           </div>
           <Button>
             <Plus className="h-4 w-4 mr-2" />
             Create Campaign
           </Button>
         </CardHeader>
         <CardContent>
           <div className="space-y-4">
             {campaigns.map((campaign) => (
               <div
                 key={campaign.id}
                 className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
               >
                 <div className="flex items-start justify-between mb-4">
                   <div>
                     <div className="flex items-center gap-3 mb-1">
                       <h3 className="font-medium">{campaign.name}</h3>
                       {getStatusBadge(campaign.status)}
                     </div>
                     <p className="text-sm text-muted-foreground">
                       Template: {campaign.templateName} • Recipients: {campaign.totalRecipients.toLocaleString()}
                     </p>
                   </div>
                   <div className="flex gap-2">
                     {campaign.status === 'active' && (
                       <Button size="sm" variant="outline">
                         <Pause className="h-4 w-4 mr-1" />
                         Pause
                       </Button>
                     )}
                     {campaign.status === 'paused' && (
                       <Button size="sm" variant="outline">
                         <Play className="h-4 w-4 mr-1" />
                         Resume
                       </Button>
                     )}
                     {campaign.status === 'draft' && (
                       <Button size="sm">
                         <Play className="h-4 w-4 mr-1" />
                         Start
                       </Button>
                     )}
                     <Button size="sm" variant="ghost">
                       <Eye className="h-4 w-4" />
                     </Button>
                     <Button size="sm" variant="ghost">
                       <BarChart3 className="h-4 w-4" />
                     </Button>
                     <Button size="sm" variant="ghost">
                       <Copy className="h-4 w-4" />
                     </Button>
                     <Button size="sm" variant="ghost" className="text-destructive">
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
 
                 {/* Progress for active campaigns */}
                 {(campaign.status === 'active' || campaign.status === 'completed') && (
                   <div className="space-y-3">
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-muted-foreground">Progress</span>
                       <span className="font-medium">
                         {campaign.messagesSent} / {campaign.totalRecipients} ({Math.round((campaign.messagesSent / campaign.totalRecipients) * 100)}%)
                       </span>
                     </div>
                     <Progress value={(campaign.messagesSent / campaign.totalRecipients) * 100} />
                     
                     <div className="grid grid-cols-4 gap-4 text-center text-sm">
                       <div>
                         <p className="text-muted-foreground">Sent</p>
                         <p className="font-medium">{campaign.messagesSent.toLocaleString()}</p>
                       </div>
                       <div>
                         <p className="text-muted-foreground">Delivered</p>
                         <p className="font-medium text-green-500">{campaign.messagesDelivered.toLocaleString()}</p>
                       </div>
                       <div>
                         <p className="text-muted-foreground">Read</p>
                         <p className="font-medium text-blue-500">{campaign.messagesRead.toLocaleString()}</p>
                       </div>
                       <div>
                         <p className="text-muted-foreground">Failed</p>
                         <p className="font-medium text-red-500">{campaign.messagesFailed.toLocaleString()}</p>
                       </div>
                     </div>
                   </div>
                 )}
 
                 {/* Scheduled info */}
                 {campaign.status === 'scheduled' && campaign.scheduledAt && (
                   <div className="flex items-center gap-2 text-sm text-muted-foreground">
                     <Clock className="h-4 w-4" />
                     Scheduled for: {new Date(campaign.scheduledAt).toLocaleString()}
                   </div>
                 )}
 
                 {/* Cost info */}
                 <div className="mt-3 text-sm text-muted-foreground">
                   Estimated cost: ₹{campaign.estimatedCost.toLocaleString()}
                 </div>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }