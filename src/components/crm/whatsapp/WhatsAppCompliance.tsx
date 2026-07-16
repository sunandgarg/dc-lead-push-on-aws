 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Badge } from '@/components/ui/badge';
 import { Switch } from '@/components/ui/switch';
 import { Label } from '@/components/ui/label';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import {
   Shield,
   FileText,
   Download,
   AlertTriangle,
   CheckCircle,
   History,
   Users,
   XCircle
 } from 'lucide-react';
 
 const auditLogs = [
   { id: '1', action: 'Campaign Started', entity: 'MBA Admission 2025', user: 'admin@example.com', timestamp: '2025-02-01 10:00:00' },
   { id: '2', action: 'Template Created', entity: 'welcome_message', user: 'admin@example.com', timestamp: '2025-01-28 14:30:00' },
   { id: '3', action: 'Bulk Opt-Out', entity: '150 contacts', user: 'admin@example.com', timestamp: '2025-01-25 09:15:00' },
   { id: '4', action: 'API Credentials Updated', entity: 'WhatsApp Config', user: 'admin@example.com', timestamp: '2025-01-20 11:45:00' },
 ];
 
 const optOutRequests = [
   { phone: '+91 98765 XXXXX', requestedAt: '2025-02-01', source: 'Reply STOP', status: 'processed' },
   { phone: '+91 87654 XXXXX', requestedAt: '2025-01-30', source: 'Manual', status: 'processed' },
   { phone: '+91 76543 XXXXX', requestedAt: '2025-01-28', source: 'Reply STOP', status: 'processed' },
 ];
 
 export function WhatsAppCompliance() {
   const [autoOptOut, setAutoOptOut] = useState(true);
   const [contentCheck, setContentCheck] = useState(true);
 
   const stats = {
     totalOptedIn: 12500,
     totalOptedOut: 850,
     pendingConsent: 320,
     optOutRate: 6.4,
   };
 
   return (
     <div className="space-y-6">
       {/* Compliance Overview */}
       <div className="grid gap-4 sm:grid-cols-4">
         <Card className="card-elevated border-green-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <CheckCircle className="h-5 w-5 text-green-500" />
               <span className="text-sm text-muted-foreground">Opted In</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-green-500">{stats.totalOptedIn.toLocaleString()}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated border-red-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <XCircle className="h-5 w-5 text-red-500" />
               <span className="text-sm text-muted-foreground">Opted Out</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-red-500">{stats.totalOptedOut.toLocaleString()}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated border-yellow-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-yellow-500" />
               <span className="text-sm text-muted-foreground">Pending Consent</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-yellow-500">{stats.pendingConsent.toLocaleString()}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <Users className="h-5 w-5 text-muted-foreground" />
               <span className="text-sm text-muted-foreground">Opt-Out Rate</span>
             </div>
             <p className="text-3xl font-bold mt-2">{stats.optOutRate}%</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Compliance Settings */}
       <Card className="card-elevated">
         <CardHeader>
           <div className="flex items-center gap-2">
             <Shield className="h-5 w-5 text-emerald-500" />
             <CardTitle>Compliance Settings</CardTitle>
           </div>
           <CardDescription>Configure opt-in/opt-out handling and content guidelines</CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
           <div className="flex items-center justify-between p-4 border border-border rounded-lg">
             <div className="flex-1">
               <Label className="font-medium">Automatic Opt-Out Processing</Label>
               <p className="text-sm text-muted-foreground">
                 Automatically process "STOP" replies and mark contacts as opted out
               </p>
             </div>
             <Switch checked={autoOptOut} onCheckedChange={setAutoOptOut} />
           </div>
 
           <div className="flex items-center justify-between p-4 border border-border rounded-lg">
             <div className="flex-1">
               <Label className="font-medium">Pre-Send Content Check</Label>
               <p className="text-sm text-muted-foreground">
                 Validate message content against WhatsApp guidelines before sending
               </p>
             </div>
             <Switch checked={contentCheck} onCheckedChange={setContentCheck} />
           </div>
 
           <div className="p-4 bg-muted rounded-lg">
             <h4 className="font-medium mb-2 flex items-center gap-2">
               <AlertTriangle className="h-4 w-4 text-yellow-500" />
               WhatsApp Content Guidelines
             </h4>
             <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
               <li>No misleading or deceptive content</li>
               <li>No adult content or gambling promotions</li>
               <li>Must include opt-out instructions</li>
               <li>Templates must be pre-approved by Meta</li>
               <li>Honor all opt-out requests within 24 hours</li>
             </ul>
           </div>
         </CardContent>
       </Card>
 
       {/* Recent Opt-Out Requests */}
       <Card className="card-elevated">
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle>Recent Opt-Out Requests</CardTitle>
             <CardDescription>Track and manage opt-out requests</CardDescription>
           </div>
           <Button variant="outline">
             <Download className="h-4 w-4 mr-2" />
             Export Report
           </Button>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Phone Number</TableHead>
                 <TableHead>Requested At</TableHead>
                 <TableHead>Source</TableHead>
                 <TableHead>Status</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {optOutRequests.map((req, i) => (
                 <TableRow key={i}>
                   <TableCell className="font-mono">{req.phone}</TableCell>
                   <TableCell>{req.requestedAt}</TableCell>
                   <TableCell>
                     <Badge variant="outline">{req.source}</Badge>
                   </TableCell>
                   <TableCell>
                     <Badge className="bg-green-500">
                       <CheckCircle className="h-3 w-3 mr-1" />
                       {req.status}
                     </Badge>
                   </TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       {/* Audit Logs */}
       <Card className="card-elevated">
         <CardHeader className="flex flex-row items-center justify-between">
           <div className="flex items-center gap-2">
             <History className="h-5 w-5" />
             <div>
               <CardTitle>Audit Logs</CardTitle>
               <CardDescription>Track all WhatsApp marketing activities</CardDescription>
             </div>
           </div>
           <Button variant="outline">
             <Download className="h-4 w-4 mr-2" />
             Export Audit Trail
           </Button>
         </CardHeader>
         <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Action</TableHead>
                 <TableHead>Entity</TableHead>
                 <TableHead>User</TableHead>
                 <TableHead>Timestamp</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
               {auditLogs.map((log) => (
                 <TableRow key={log.id}>
                   <TableCell className="font-medium">{log.action}</TableCell>
                   <TableCell>{log.entity}</TableCell>
                   <TableCell className="text-muted-foreground">{log.user}</TableCell>
                   <TableCell className="text-muted-foreground">{log.timestamp}</TableCell>
                 </TableRow>
               ))}
             </TableBody>
           </Table>
         </CardContent>
       </Card>
 
       {/* Compliance Reports */}
       <Card className="card-elevated">
         <CardHeader>
           <div className="flex items-center gap-2">
             <FileText className="h-5 w-5" />
             <CardTitle>Compliance Reports</CardTitle>
           </div>
         </CardHeader>
         <CardContent>
           <div className="grid gap-4 sm:grid-cols-2">
             <div className="p-4 border border-border rounded-lg flex items-center justify-between">
               <div>
                 <p className="font-medium">GDPR Compliance Report</p>
                 <p className="text-sm text-muted-foreground">Data processing and consent records</p>
               </div>
               <Button variant="outline" size="sm">
                 <Download className="h-4 w-4 mr-2" />
                 Download
               </Button>
             </div>
             <div className="p-4 border border-border rounded-lg flex items-center justify-between">
               <div>
                 <p className="font-medium">TCPA Compliance Report</p>
                 <p className="text-sm text-muted-foreground">Telemarketing consent documentation</p>
               </div>
               <Button variant="outline" size="sm">
                 <Download className="h-4 w-4 mr-2" />
                 Download
               </Button>
             </div>
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }