 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Checkbox } from '@/components/ui/checkbox';
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from '@/components/ui/table';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from '@/components/ui/dropdown-menu';
 import {
   Plus,
   Upload,
   Search,
   Download,
   MoreVertical,
   Tag,
   CheckCircle,
   XCircle,
   Clock,
   Users,
   Filter
 } from 'lucide-react';
 import { useToast } from '@/hooks/use-toast';
 
 interface WhatsAppContact {
   id: string;
   phone: string;
   name: string;
   email?: string;
   optInStatus: 'opted_in' | 'opted_out' | 'pending';
   optInDate?: string;
   optInSource?: string;
   tags: string[];
   lastMessageDate?: string;
   totalMessagesReceived: number;
   totalMessagesSent: number;
 }
 
 // Mock contacts
 const mockContacts: WhatsAppContact[] = [
   {
     id: '1',
     phone: '+91 98765 43210',
     name: 'Rahul Sharma',
     email: 'rahul@example.com',
     optInStatus: 'opted_in',
     optInDate: '2025-01-15',
     optInSource: 'website',
     tags: ['MBA', 'Delhi'],
     lastMessageDate: '2025-02-01',
     totalMessagesReceived: 5,
     totalMessagesSent: 12,
   },
   {
     id: '2',
     phone: '+91 87654 32109',
     name: 'Priya Patel',
     email: 'priya@example.com',
     optInStatus: 'opted_in',
     optInDate: '2025-01-20',
     optInSource: 'manual',
     tags: ['Engineering', 'Mumbai'],
     lastMessageDate: '2025-01-28',
     totalMessagesReceived: 3,
     totalMessagesSent: 8,
   },
   {
     id: '3',
     phone: '+91 76543 21098',
     name: 'Amit Kumar',
     optInStatus: 'pending',
     tags: ['BCA'],
     totalMessagesReceived: 0,
     totalMessagesSent: 1,
   },
   {
     id: '4',
     phone: '+91 65432 10987',
     name: 'Sneha Gupta',
     email: 'sneha@example.com',
     optInStatus: 'opted_out',
     optInDate: '2025-01-10',
     optInSource: 'imported',
     tags: ['Medical'],
     lastMessageDate: '2025-01-10',
     totalMessagesReceived: 2,
     totalMessagesSent: 5,
   },
 ];
 
 export function WhatsAppContacts() {
   const [contacts, setContacts] = useState<WhatsAppContact[]>(mockContacts);
   const [searchTerm, setSearchTerm] = useState('');
   const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
   const [showImportModal, setShowImportModal] = useState(false);
   const [showAddModal, setShowAddModal] = useState(false);
   const { toast } = useToast();
 
   const filteredContacts = contacts.filter(c => 
     c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.phone.includes(searchTerm) ||
     c.email?.toLowerCase().includes(searchTerm.toLowerCase())
   );
 
   const getOptInBadge = (status: string) => {
     switch (status) {
       case 'opted_in':
         return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Opted In</Badge>;
       case 'opted_out':
         return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" />Opted Out</Badge>;
       case 'pending':
         return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   const toggleSelectAll = () => {
     if (selectedContacts.size === filteredContacts.length) {
       setSelectedContacts(new Set());
     } else {
       setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
     }
   };
 
   const toggleSelect = (id: string) => {
     const newSelected = new Set(selectedContacts);
     if (newSelected.has(id)) {
       newSelected.delete(id);
     } else {
       newSelected.add(id);
     }
     setSelectedContacts(newSelected);
   };
 
   const stats = {
     total: contacts.length,
     optedIn: contacts.filter(c => c.optInStatus === 'opted_in').length,
     optedOut: contacts.filter(c => c.optInStatus === 'opted_out').length,
     pending: contacts.filter(c => c.optInStatus === 'pending').length,
   };
 
   return (
     <div className="space-y-6">
       {/* Stats */}
       <div className="grid gap-4 sm:grid-cols-4">
         <Card className="card-elevated">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <Users className="h-5 w-5 text-muted-foreground" />
               <span className="text-sm text-muted-foreground">Total Contacts</span>
             </div>
             <p className="text-3xl font-bold mt-2">{stats.total}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated border-green-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <CheckCircle className="h-5 w-5 text-green-500" />
               <span className="text-sm text-muted-foreground">Opted In</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-green-500">{stats.optedIn}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated border-yellow-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <Clock className="h-5 w-5 text-yellow-500" />
               <span className="text-sm text-muted-foreground">Pending</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-yellow-500">{stats.pending}</p>
           </CardContent>
         </Card>
         <Card className="card-elevated border-red-500/30">
           <CardContent className="pt-6">
             <div className="flex items-center gap-2">
               <XCircle className="h-5 w-5 text-red-500" />
               <span className="text-sm text-muted-foreground">Opted Out</span>
             </div>
             <p className="text-3xl font-bold mt-2 text-red-500">{stats.optedOut}</p>
           </CardContent>
         </Card>
       </div>
 
       {/* Contacts Table */}
       <Card className="card-elevated">
         <CardHeader className="flex flex-row items-center justify-between">
           <div>
             <CardTitle>WhatsApp Contacts</CardTitle>
             <CardDescription>Manage your WhatsApp marketing contacts</CardDescription>
           </div>
           <div className="flex gap-2">
             <Button variant="outline" onClick={() => setShowImportModal(true)}>
               <Upload className="h-4 w-4 mr-2" />
               Import CSV
             </Button>
             <Button onClick={() => setShowAddModal(true)}>
               <Plus className="h-4 w-4 mr-2" />
               Add Contact
             </Button>
           </div>
         </CardHeader>
         <CardContent>
           {/* Search and Filters */}
           <div className="flex flex-wrap gap-4 mb-6">
             <div className="flex-1 min-w-[250px]">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                 <Input
                   placeholder="Search by name, phone, or email..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="pl-9"
                 />
               </div>
             </div>
             <Button variant="outline">
               <Filter className="h-4 w-4 mr-2" />
               Filters
             </Button>
             <Button variant="outline">
               <Download className="h-4 w-4 mr-2" />
               Export
             </Button>
           </div>
 
           {/* Bulk Actions */}
           {selectedContacts.size > 0 && (
             <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-lg">
               <span className="text-sm font-medium">{selectedContacts.size} selected</span>
               <Button size="sm" variant="outline">
                 <Tag className="h-4 w-4 mr-2" />
                 Add Tags
               </Button>
               <Button size="sm" variant="outline">Add to Campaign</Button>
               <Button size="sm" variant="outline" className="text-red-500">Opt Out</Button>
             </div>
           )}
 
           {/* Table */}
           <div className="rounded-md border">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead className="w-12">
                     <Checkbox
                       checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                       onCheckedChange={toggleSelectAll}
                     />
                   </TableHead>
                   <TableHead>Contact</TableHead>
                   <TableHead>Phone</TableHead>
                   <TableHead>Opt-In Status</TableHead>
                   <TableHead>Tags</TableHead>
                   <TableHead>Messages</TableHead>
                   <TableHead className="w-12"></TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredContacts.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                       No contacts found
                     </TableCell>
                   </TableRow>
                 ) : (
                   filteredContacts.map((contact) => (
                     <TableRow key={contact.id}>
                       <TableCell>
                         <Checkbox
                           checked={selectedContacts.has(contact.id)}
                           onCheckedChange={() => toggleSelect(contact.id)}
                         />
                       </TableCell>
                       <TableCell>
                         <div>
                           <p className="font-medium">{contact.name}</p>
                           {contact.email && (
                             <p className="text-sm text-muted-foreground">{contact.email}</p>
                           )}
                         </div>
                       </TableCell>
                       <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                       <TableCell>{getOptInBadge(contact.optInStatus)}</TableCell>
                       <TableCell>
                         <div className="flex flex-wrap gap-1">
                           {contact.tags.map((tag, i) => (
                             <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                           ))}
                         </div>
                       </TableCell>
                       <TableCell>
                         <div className="text-sm">
                           <span className="text-muted-foreground">Sent: </span>{contact.totalMessagesSent}
                           <span className="text-muted-foreground ml-2">Recv: </span>{contact.totalMessagesReceived}
                         </div>
                       </TableCell>
                       <TableCell>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon">
                               <MoreVertical className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem>View Details</DropdownMenuItem>
                             <DropdownMenuItem>Send Message</DropdownMenuItem>
                             <DropdownMenuItem>Edit Tags</DropdownMenuItem>
                             <DropdownMenuItem className="text-red-500">Opt Out</DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           </div>
         </CardContent>
       </Card>
 
       {/* Import Modal */}
       <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
         <DialogContent className="sm:max-w-lg">
           <DialogHeader>
             <DialogTitle>Import Contacts from CSV</DialogTitle>
           </DialogHeader>
           <div className="py-4 space-y-4">
             <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
               <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
               <p className="text-sm text-muted-foreground mb-2">
                 Drag and drop your CSV file here, or click to browse
               </p>
               <Button variant="outline">Select File</Button>
             </div>
             <div className="text-sm text-muted-foreground">
               <p className="font-medium mb-2">Required columns:</p>
               <ul className="list-disc list-inside space-y-1">
                 <li><code className="bg-muted px-1 rounded">phone</code> - Phone number with country code</li>
                 <li><code className="bg-muted px-1 rounded">name</code> - Contact name</li>
               </ul>
               <p className="mt-2">Optional: email, tags (comma-separated), opt_in_source</p>
             </div>
             <Button variant="link" className="p-0 h-auto">
               <Download className="h-4 w-4 mr-2" />
               Download sample CSV template
             </Button>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setShowImportModal(false)}>Cancel</Button>
             <Button disabled>Import Contacts</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }