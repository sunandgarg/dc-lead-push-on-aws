 import { useState } from 'react';
 import { Card, CardContent } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Badge } from '@/components/ui/badge';
 import { Avatar, AvatarFallback } from '@/components/ui/avatar';
 import { ScrollArea } from '@/components/ui/scroll-area';
 import {
   Search,
   Send,
   Paperclip,
   MoreVertical,
   Phone,
   Check,
   CheckCheck,
   Clock,
   User,
   Tag,
   MessageSquare
 } from 'lucide-react';
 
 interface Conversation {
   id: string;
   contactName: string;
   contactPhone: string;
   lastMessage: string;
   lastMessageTime: string;
   unreadCount: number;
   status: 'open' | 'pending' | 'resolved';
 }
 
 interface Message {
   id: string;
   direction: 'inbound' | 'outbound';
   content: string;
   timestamp: string;
   status?: 'sent' | 'delivered' | 'read';
 }
 
 const mockConversations: Conversation[] = [
   {
     id: '1',
     contactName: 'Rahul Sharma',
     contactPhone: '+91 98765 43210',
     lastMessage: 'Yes, I am interested in MBA program',
     lastMessageTime: '10:30 AM',
     unreadCount: 2,
     status: 'open',
   },
   {
     id: '2',
     contactName: 'Priya Patel',
     contactPhone: '+91 87654 32109',
     lastMessage: 'When is the last date for admission?',
     lastMessageTime: 'Yesterday',
     unreadCount: 0,
     status: 'pending',
   },
   {
     id: '3',
     contactName: 'Amit Kumar',
     contactPhone: '+91 76543 21098',
     lastMessage: 'Thank you for the information',
     lastMessageTime: 'Yesterday',
     unreadCount: 0,
     status: 'resolved',
   },
 ];
 
 const mockMessages: Message[] = [
   {
     id: '1',
     direction: 'outbound',
     content: 'Hi Rahul! Thank you for your interest in our MBA program. How can I help you today?',
     timestamp: '10:00 AM',
     status: 'read',
   },
   {
     id: '2',
     direction: 'inbound',
     content: 'Hi! I wanted to know more about the admission process',
     timestamp: '10:15 AM',
   },
   {
     id: '3',
     direction: 'outbound',
     content: 'Sure! Our MBA program has rolling admissions. You can apply online through our website. The key steps are: 1. Fill application form 2. Upload documents 3. Pay application fee 4. Attend interview',
     timestamp: '10:20 AM',
     status: 'read',
   },
   {
     id: '4',
     direction: 'inbound',
     content: 'What documents do I need?',
     timestamp: '10:25 AM',
   },
   {
     id: '5',
     direction: 'inbound',
     content: 'Yes, I am interested in MBA program',
     timestamp: '10:30 AM',
   },
 ];
 
 export function WhatsAppInbox() {
   const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
   const [messageInput, setMessageInput] = useState('');
   const [searchTerm, setSearchTerm] = useState('');
 
   const filteredConversations = mockConversations.filter(c =>
     c.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     c.contactPhone.includes(searchTerm)
   );
 
   const getStatusColor = (status: string) => {
     switch (status) {
       case 'open': return 'bg-green-500';
       case 'pending': return 'bg-yellow-500';
       case 'resolved': return 'bg-muted-foreground';
       default: return 'bg-muted-foreground';
     }
   };
 
   const getMessageStatus = (status?: string) => {
     switch (status) {
       case 'sent':
         return <Check className="h-3 w-3 text-muted-foreground" />;
       case 'delivered':
         return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
       case 'read':
         return <CheckCheck className="h-3 w-3 text-blue-500" />;
       default:
         return <Clock className="h-3 w-3 text-muted-foreground" />;
     }
   };
 
   return (
     <div className="h-[calc(100vh-300px)] min-h-[500px] flex border border-border rounded-lg overflow-hidden">
       {/* Conversations List */}
       <div className="w-80 border-r border-border flex flex-col bg-card">
         {/* Search */}
         <div className="p-4 border-b border-border">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Search conversations..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-9"
             />
           </div>
         </div>
 
         {/* Conversations */}
         <ScrollArea className="flex-1">
           {filteredConversations.map((conv) => (
             <div
               key={conv.id}
               className={`p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                 selectedConversation?.id === conv.id ? 'bg-muted' : ''
               }`}
               onClick={() => setSelectedConversation(conv)}
             >
               <div className="flex items-start gap-3">
                 <Avatar>
                   <AvatarFallback>{conv.contactName.slice(0, 2).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-1">
                     <span className="font-medium truncate">{conv.contactName}</span>
                     <span className="text-xs text-muted-foreground">{conv.lastMessageTime}</span>
                   </div>
                   <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                 </div>
                 {conv.unreadCount > 0 && (
                   <Badge className="bg-emerald-500 text-xs">{conv.unreadCount}</Badge>
                 )}
               </div>
             </div>
           ))}
         </ScrollArea>
       </div>
 
       {/* Chat Area */}
       {selectedConversation ? (
         <div className="flex-1 flex flex-col">
           {/* Chat Header */}
           <div className="p-4 border-b border-border flex items-center justify-between bg-card">
             <div className="flex items-center gap-3">
               <Avatar>
                 <AvatarFallback>{selectedConversation.contactName.slice(0, 2).toUpperCase()}</AvatarFallback>
               </Avatar>
               <div>
                 <h3 className="font-medium">{selectedConversation.contactName}</h3>
                 <p className="text-sm text-muted-foreground">{selectedConversation.contactPhone}</p>
               </div>
               <Badge className={getStatusColor(selectedConversation.status)}>
                 {selectedConversation.status}
               </Badge>
             </div>
             <div className="flex gap-2">
               <Button variant="ghost" size="icon">
                 <Phone className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon">
                 <MoreVertical className="h-4 w-4" />
               </Button>
             </div>
           </div>
 
           {/* Messages */}
           <ScrollArea className="flex-1 p-4 bg-[#ECE5DD] dark:bg-muted/30">
             <div className="space-y-4 max-w-3xl mx-auto">
               {mockMessages.map((msg) => (
                 <div
                   key={msg.id}
                   className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                 >
                   <div
                     className={`max-w-[70%] p-3 rounded-lg shadow-sm ${
                       msg.direction === 'outbound'
                         ? 'bg-emerald-500 text-white'
                         : 'bg-white dark:bg-card text-foreground'
                     }`}
                   >
                     <p className="text-sm">{msg.content}</p>
                     <div className={`flex items-center justify-end gap-1 mt-1 ${
                       msg.direction === 'outbound' ? 'text-emerald-100' : 'text-muted-foreground'
                     }`}>
                       <span className="text-xs">{msg.timestamp}</span>
                       {msg.direction === 'outbound' && getMessageStatus(msg.status)}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </ScrollArea>
 
           {/* Message Input */}
           <div className="p-4 border-t border-border bg-card">
             <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon">
                 <Paperclip className="h-5 w-5" />
               </Button>
               <Input
                 placeholder="Type a message..."
                 value={messageInput}
                 onChange={(e) => setMessageInput(e.target.value)}
                 className="flex-1"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && messageInput.trim()) {
                     // Send message
                     setMessageInput('');
                   }
                 }}
               />
               <Button disabled={!messageInput.trim()}>
                 <Send className="h-4 w-4" />
               </Button>
             </div>
           </div>
         </div>
       ) : (
         <div className="flex-1 flex items-center justify-center bg-muted/30">
           <div className="text-center text-muted-foreground">
             <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
             <p>Select a conversation to start messaging</p>
           </div>
         </div>
       )}
 
       {/* Contact Sidebar */}
       {selectedConversation && (
         <div className="w-72 border-l border-border bg-card p-4 hidden lg:block">
           <div className="text-center mb-6">
             <Avatar className="h-20 w-20 mx-auto mb-3">
               <AvatarFallback className="text-2xl">
                 {selectedConversation.contactName.slice(0, 2).toUpperCase()}
               </AvatarFallback>
             </Avatar>
             <h3 className="font-medium">{selectedConversation.contactName}</h3>
             <p className="text-sm text-muted-foreground">{selectedConversation.contactPhone}</p>
           </div>
 
           <div className="space-y-4">
             <div className="flex items-center gap-2">
               <User className="h-4 w-4 text-muted-foreground" />
               <span className="text-sm">View CRM Profile</span>
             </div>
             <div className="flex items-center gap-2">
               <Tag className="h-4 w-4 text-muted-foreground" />
               <span className="text-sm">Add Tags</span>
             </div>
 
             <div className="pt-4 border-t border-border">
               <h4 className="text-sm font-medium mb-2">Quick Replies</h4>
               <div className="space-y-2">
                 {[
                   'Thank you for your interest!',
                   'Let me check and get back to you.',
                   'Is there anything else I can help with?',
                 ].map((reply, i) => (
                   <Button key={i} variant="outline" size="sm" className="w-full text-left justify-start text-xs h-auto py-2">
                     {reply}
                   </Button>
                 ))}
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }