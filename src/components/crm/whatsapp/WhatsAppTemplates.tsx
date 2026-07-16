 import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import {
   Plus,
   Search,
   Eye,
   Copy,
   RefreshCw,
   FileText,
   CheckCircle,
   Clock,
   XCircle,
   AlertTriangle
 } from 'lucide-react';
 import { useToast } from '@/hooks/use-toast';
 
 interface WhatsAppTemplate {
   id: string;
   name: string;
   language: string;
   category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
   status: 'APPROVED' | 'PENDING' | 'REJECTED';
   components: {
     header?: { type: string; text?: string; format?: string };
     body: { text: string; variables?: string[] };
     footer?: { text: string };
     buttons?: Array<{ type: string; text: string; url?: string; phone?: string }>;
   };
   createdAt: string;
   usageCount: number;
 }
 
 // Mock templates for demo
 const mockTemplates: WhatsAppTemplate[] = [
   {
     id: '1',
     name: 'welcome_message',
     language: 'en',
     category: 'MARKETING',
     status: 'APPROVED',
     components: {
       header: { type: 'text', text: 'Welcome to {{1}}!' },
       body: { text: 'Hi {{1}}, thank you for your interest in our courses. We would love to help you with your education journey. Reply to this message to connect with our counselor.', variables: ['name'] },
       footer: { text: 'Reply STOP to opt-out' },
     },
     createdAt: '2025-01-15',
     usageCount: 1250,
   },
   {
     id: '2',
     name: 'course_inquiry',
     language: 'en',
     category: 'MARKETING',
     status: 'APPROVED',
     components: {
       body: { text: 'Hello {{1}}! You showed interest in {{2}}. Our admission window is open. Book a free counseling session today. Click below:', variables: ['name', 'course'] },
       buttons: [{ type: 'url', text: 'Book Session', url: 'https://example.com/book' }],
     },
     createdAt: '2025-01-20',
     usageCount: 890,
   },
   {
     id: '3',
     name: 'application_status',
     language: 'en',
     category: 'UTILITY',
     status: 'APPROVED',
     components: {
       body: { text: 'Dear {{1}}, your application #{{2}} has been {{3}}. Log in to check details.', variables: ['name', 'app_id', 'status'] },
     },
     createdAt: '2025-01-25',
     usageCount: 450,
   },
   {
     id: '4',
     name: 'new_promo_template',
     language: 'en',
     category: 'MARKETING',
     status: 'PENDING',
     components: {
       header: { type: 'image', format: 'IMAGE' },
       body: { text: 'Exciting news! Get {{1}}% off on all courses. Limited time offer!', variables: ['discount'] },
     },
     createdAt: '2025-02-01',
     usageCount: 0,
   },
 ];
 
 export function WhatsAppTemplates() {
   const [templates, setTemplates] = useState<WhatsAppTemplate[]>(mockTemplates);
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState<string>('all');
   const [categoryFilter, setCategoryFilter] = useState<string>('all');
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [showPreviewModal, setShowPreviewModal] = useState(false);
   const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
   const [loading, setLoading] = useState(false);
   const { toast } = useToast();
 
   const filteredTemplates = templates.filter(t => {
     const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
     const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
     return matchesSearch && matchesStatus && matchesCategory;
   });
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case 'APPROVED':
         return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
       case 'PENDING':
         return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
       case 'REJECTED':
         return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   const getCategoryBadge = (category: string) => {
     switch (category) {
       case 'MARKETING':
         return <Badge variant="outline" className="border-blue-500 text-blue-500">Marketing</Badge>;
       case 'UTILITY':
         return <Badge variant="outline" className="border-green-500 text-green-500">Utility</Badge>;
       case 'AUTHENTICATION':
         return <Badge variant="outline" className="border-purple-500 text-purple-500">Authentication</Badge>;
       default:
         return <Badge variant="outline">{category}</Badge>;
     }
   };
 
   const syncTemplates = async () => {
     setLoading(true);
     try {
       // Simulate API call
       await new Promise(resolve => setTimeout(resolve, 1500));
       toast({ title: 'Synced', description: 'Templates synced with WhatsApp' });
     } finally {
       setLoading(false);
     }
   };
 
   const previewTemplate = (template: WhatsAppTemplate) => {
     setSelectedTemplate(template);
     setShowPreviewModal(true);
   };
 
   return (
     <div className="space-y-6">
       {/* Stats Cards */}
       <div className="grid gap-4 sm:grid-cols-4">
         {[
           { label: 'Total Templates', value: templates.length, color: 'text-foreground' },
           { label: 'Approved', value: templates.filter(t => t.status === 'APPROVED').length, color: 'text-green-500' },
           { label: 'Pending', value: templates.filter(t => t.status === 'PENDING').length, color: 'text-yellow-500' },
           { label: 'Rejected', value: templates.filter(t => t.status === 'REJECTED').length, color: 'text-red-500' },
         ].map((stat, i) => (
           <Card key={i} className="card-elevated">
             <CardContent className="pt-6">
               <p className="text-sm text-muted-foreground">{stat.label}</p>
               <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* Filters and Actions */}
       <Card className="card-elevated">
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle>Message Templates</CardTitle>
             <CardDescription>Manage your WhatsApp approved message templates</CardDescription>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={syncTemplates} disabled={loading}>
               <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
               Sync
             </Button>
             <Button onClick={() => setShowCreateModal(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Create Template
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           <div className="flex flex-wrap gap-4 mb-6">
             <div className="flex-1 min-w-[200px]">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Search templates..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9"
                 />
               </div>
             </div>
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-[150px]">
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Status</SelectItem>
                 <SelectItem value="APPROVED">Approved</SelectItem>
                 <SelectItem value="PENDING">Pending</SelectItem>
                 <SelectItem value="REJECTED">Rejected</SelectItem>
               </SelectContent>
             </Select>
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
               <SelectTrigger className="w-[150px]">
                 <SelectValue placeholder="Category" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">All Categories</SelectItem>
                 <SelectItem value="MARKETING">Marketing</SelectItem>
                 <SelectItem value="UTILITY">Utility</SelectItem>
                 <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
               </SelectContent>
             </Select>
           </div>
 
           {/* Templates List */}
           <div className="space-y-4">
             {filteredTemplates.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground">
                 <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                 <p>No templates found</p>
               </div>
             ) : (
               filteredTemplates.map((template) => (
                 <div
                   key={template.id}
                   className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                 >
                   <div className="flex-1">
                     <div className="flex items-center gap-3 mb-2">
                       <span className="font-medium">{template.name}</span>
                       {getStatusBadge(template.status)}
                       {getCategoryBadge(template.category)}
                     </div>
                     <p className="text-sm text-muted-foreground line-clamp-1">
                       {template.components.body.text}
                     </p>
                     <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                       <span>Language: {template.language.toUpperCase()}</span>
                       <span>Used: {template.usageCount.toLocaleString()} times</span>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <Button variant="ghost" size="icon" onClick={() => previewTemplate(template)}>
                       <Eye className="h-4 w-4" />
                     </Button>
                     <Button variant="ghost" size="icon">
                       <Copy className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
               ))
             )}
           </div>
         </CardContent>
       </Card>
 
       {/* Preview Modal */}
       <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
         <DialogContent className="sm:max-w-lg">
           <DialogHeader>
             <DialogTitle>Template Preview</DialogTitle>
           </DialogHeader>
           {selectedTemplate && (
             <div className="py-4">
               <div className="bg-[#ECE5DD] rounded-lg p-4">
                 <div className="bg-white rounded-lg p-3 shadow-sm max-w-[80%]">
                   {selectedTemplate.components.header?.text && (
                     <p className="font-bold mb-2">{selectedTemplate.components.header.text}</p>
                   )}
                   <p className="text-sm">{selectedTemplate.components.body.text}</p>
                   {selectedTemplate.components.footer && (
                     <p className="text-xs text-gray-500 mt-2">{selectedTemplate.components.footer.text}</p>
                   )}
                   {selectedTemplate.components.buttons && (
                     <div className="mt-3 space-y-2">
                       {selectedTemplate.components.buttons.map((btn, i) => (
                         <div key={i} className="text-center text-blue-500 text-sm py-2 border-t border-gray-200">
                           {btn.text}
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               </div>
               <div className="mt-4 space-y-2">
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Status</span>
                   {getStatusBadge(selectedTemplate.status)}
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground">Category</span>
                   {getCategoryBadge(selectedTemplate.category)}
                 </div>
                 {selectedTemplate.components.body.variables && (
                   <div className="text-sm">
                     <span className="text-muted-foreground">Variables: </span>
                     {selectedTemplate.components.body.variables.map((v, i) => (
                       <Badge key={i} variant="outline" className="ml-1">{`{{${i + 1}}} = ${v}`}</Badge>
                     ))}
                   </div>
                 )}
               </div>
             </div>
           )}
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowPreviewModal(false)}>Close</Button>
             <Button disabled={selectedTemplate?.status !== 'APPROVED'}>Use in Campaign</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
 
       {/* Create Template Modal */}
       <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
         <DialogContent className="sm:max-w-2xl">
           <DialogHeader>
             <DialogTitle>Create New Template</DialogTitle>
           </DialogHeader>
           <div className="py-4 space-y-4">
             <Alert>
               <AlertTriangle className="h-4 w-4" />
               <AlertDescription>
                 Templates must be approved by Meta before use. This typically takes 24-48 hours.
               </AlertDescription>
             </Alert>
             <div className="grid gap-4 sm:grid-cols-2">
               <div className="space-y-2">
                 <Label>Template Name</Label>
                 <Input placeholder="e.g., welcome_message" />
                 <p className="text-xs text-muted-foreground">Lowercase, underscores only</p>
               </div>
               <div className="space-y-2">
                 <Label>Category</Label>
                 <Select defaultValue="MARKETING">
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="MARKETING">Marketing</SelectItem>
                     <SelectItem value="UTILITY">Utility</SelectItem>
                     <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
             <div className="space-y-2">
               <Label>Message Body</Label>
               <Textarea 
                 placeholder="Enter your message. Use {{1}}, {{2}} for variables..."
                 rows={4}
               />
               <p className="text-xs text-muted-foreground">Max 1024 characters. Variables: {`{{1}}, {{2}}, {{3}}`}</p>
             </div>
             <div className="space-y-2">
               <Label>Footer (Optional)</Label>
               <Input placeholder="e.g., Reply STOP to opt-out" />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
             <Button>Submit for Approval</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }