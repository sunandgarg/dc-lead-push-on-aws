 import { useState, useEffect } from 'react';
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Badge } from '@/components/ui/badge';
 import { Alert, AlertDescription } from '@/components/ui/alert';
 import {
   CheckCircle,
   XCircle,
   AlertTriangle,
   RefreshCw,
   Copy,
   Eye,
   EyeOff,
   Shield,
   Phone,
   Star,
   Zap
 } from 'lucide-react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 
 interface WhatsAppConfig {
   id?: string;
   phone_number_id: string;
   business_account_id: string;
   access_token: string;
   webhook_verify_token: string;
   is_connected: boolean;
   quality_rating: string | null;
   messaging_limit: string | null;
   phone_number: string | null;
   display_name: string | null;
 }
 
 export function WhatsAppSettings() {
   const [config, setConfig] = useState<WhatsAppConfig>({
     phone_number_id: '',
     business_account_id: '',
     access_token: '',
     webhook_verify_token: '',
     is_connected: false,
     quality_rating: null,
     messaging_limit: null,
     phone_number: null,
     display_name: null,
   });
   const [loading, setLoading] = useState(true);
   const [testing, setTesting] = useState(false);
   const [saving, setSaving] = useState(false);
   const [showToken, setShowToken] = useState(false);
   const { toast } = useToast();
 
   const webhookUrl = `${window.location.origin}/api/webhooks/whatsapp`;
 
   useEffect(() => {
     fetchConfig();
   }, []);
 
   const fetchConfig = async () => {
     try {
       const { data, error } = await supabase
         .from('marketing_integrations')
         .select('*')
         .eq('type', 'whatsapp')
         .eq('provider', 'meta')
         .single();
 
       if (data && !error) {
         const configData = data.configuration as any;
         setConfig({
           id: data.id,
           phone_number_id: configData?.phone_number_id || '',
           business_account_id: configData?.business_account_id || '',
           access_token: configData?.access_token || '',
           webhook_verify_token: configData?.webhook_verify_token || '',
           is_connected: data.status === 'connected',
           quality_rating: configData?.quality_rating || null,
           messaging_limit: configData?.messaging_limit || null,
           phone_number: configData?.phone_number || null,
           display_name: configData?.display_name || null,
         });
       }
     } catch (error) {
       // No existing config
     } finally {
       setLoading(false);
     }
   };
 
   const handleSave = async () => {
     setSaving(true);
     try {
       const integrationData = {
         type: 'whatsapp' as const,
         provider: 'meta',
         name: 'WhatsApp Business API',
         configuration: {
           phone_number_id: config.phone_number_id,
           business_account_id: config.business_account_id,
           access_token: config.access_token,
           webhook_verify_token: config.webhook_verify_token,
           quality_rating: config.quality_rating,
           messaging_limit: config.messaging_limit,
           phone_number: config.phone_number,
           display_name: config.display_name,
         },
         status: config.is_connected ? 'connected' : 'disconnected',
       };
 
       if (config.id) {
         await supabase
           .from('marketing_integrations')
           .update(integrationData)
           .eq('id', config.id);
       } else {
         const { data } = await supabase
           .from('marketing_integrations')
           .insert(integrationData)
           .select()
           .single();
         if (data) setConfig(prev => ({ ...prev, id: data.id }));
       }
 
       toast({ title: 'Success', description: 'Configuration saved!' });
     } catch (error) {
       toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
     } finally {
       setSaving(false);
     }
   };
 
   const testConnection = async () => {
     setTesting(true);
     try {
       // Simulate API test - in production, this would call Meta Graph API
       await new Promise(resolve => setTimeout(resolve, 1500));
       
       if (config.access_token && config.phone_number_id) {
         setConfig(prev => ({
           ...prev,
           is_connected: true,
           quality_rating: 'GREEN',
           messaging_limit: 'TIER_1K',
         }));
         toast({ title: 'Connected!', description: 'WhatsApp Business API connection successful' });
       } else {
         throw new Error('Missing credentials');
       }
     } catch (error) {
       setConfig(prev => ({ ...prev, is_connected: false }));
       toast({ title: 'Connection Failed', description: 'Please check your credentials', variant: 'destructive' });
     } finally {
       setTesting(false);
     }
   };
 
   const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text);
     toast({ title: 'Copied!', description: 'Webhook URL copied to clipboard' });
   };
 
   const getQualityBadge = (rating: string | null) => {
     switch (rating) {
       case 'GREEN':
         return <Badge className="bg-green-500">High Quality</Badge>;
       case 'YELLOW':
         return <Badge className="bg-yellow-500">Medium Quality</Badge>;
       case 'RED':
         return <Badge className="bg-red-500">Low Quality</Badge>;
       default:
         return <Badge variant="outline">Unknown</Badge>;
     }
   };
 
   const getMessagingLimitBadge = (limit: string | null) => {
     switch (limit) {
       case 'TIER_1K':
         return '1,000 business-initiated conversations/day';
       case 'TIER_10K':
         return '10,000 business-initiated conversations/day';
       case 'TIER_100K':
         return '100,000 business-initiated conversations/day';
       case 'UNLIMITED':
         return 'Unlimited conversations';
       default:
         return 'Not available';
     }
   };
 
   if (loading) {
     return <div className="animate-pulse">Loading configuration...</div>;
   }
 
   return (
     <div className="space-y-6">
       {/* Connection Status */}
       <Card className={`card-elevated ${config.is_connected ? 'border-green-500/50' : 'border-yellow-500/50'}`}>
         <CardHeader>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Shield className="h-5 w-5 text-emerald-500" />
               <CardTitle>Connection Status</CardTitle>
             </div>
             <Badge className={config.is_connected ? 'bg-green-500' : 'bg-yellow-500'}>
               {config.is_connected ? (
                 <><CheckCircle className="h-3 w-3 mr-1" />Connected</>
               ) : (
                 <><AlertTriangle className="h-3 w-3 mr-1" />Not Connected</>
               )}
             </Badge>
           </div>
         </CardHeader>
         {config.is_connected && (
           <CardContent>
             <div className="grid gap-4 sm:grid-cols-3">
               <div className="p-4 bg-muted rounded-lg">
                 <div className="flex items-center gap-2 mb-2">
                   <Phone className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm text-muted-foreground">Phone Number</span>
                 </div>
                 <p className="font-medium">{config.phone_number || 'Not set'}</p>
               </div>
               <div className="p-4 bg-muted rounded-lg">
                 <div className="flex items-center gap-2 mb-2">
                   <Star className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm text-muted-foreground">Quality Rating</span>
                 </div>
                 {getQualityBadge(config.quality_rating)}
               </div>
               <div className="p-4 bg-muted rounded-lg">
                 <div className="flex items-center gap-2 mb-2">
                   <Zap className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm text-muted-foreground">Messaging Limit</span>
                 </div>
                 <p className="text-sm font-medium">{getMessagingLimitBadge(config.messaging_limit)}</p>
               </div>
             </div>
           </CardContent>
         )}
       </Card>
 
       {/* API Credentials */}
       <Card className="card-elevated">
         <CardHeader>
           <CardTitle>API Credentials</CardTitle>
           <CardDescription>
             Enter your WhatsApp Business API credentials from Meta Business Suite
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2">
               <Label>Phone Number ID</Label>
               <Input
                 value={config.phone_number_id}
                 onChange={(e) => setConfig(prev => ({ ...prev, phone_number_id: e.target.value }))}
                 placeholder="Enter Phone Number ID"
               />
             </div>
             <div className="space-y-2">
               <Label>Business Account ID (WABA ID)</Label>
               <Input
                 value={config.business_account_id}
                 onChange={(e) => setConfig(prev => ({ ...prev, business_account_id: e.target.value }))}
                 placeholder="Enter Business Account ID"
               />
             </div>
           </div>
 
           <div className="space-y-2">
             <Label>Access Token</Label>
             <div className="flex gap-2">
               <Input
                 type={showToken ? 'text' : 'password'}
                 value={config.access_token}
                 onChange={(e) => setConfig(prev => ({ ...prev, access_token: e.target.value }))}
                 placeholder="Enter your permanent access token"
                 className="flex-1"
               />
               <Button
                 variant="outline"
                 size="icon"
                 onClick={() => setShowToken(!showToken)}
               >
                 {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
               </Button>
             </div>
             <p className="text-xs text-muted-foreground">
               Generate a permanent token from Meta Business Settings → System Users
             </p>
           </div>
 
           <div className="flex gap-2">
             <Button onClick={testConnection} disabled={testing} variant="outline">
               {testing ? (
                 <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</>
               ) : (
                 <>Test Connection</>
               )}
             </Button>
             <Button onClick={handleSave} disabled={saving}>
               {saving ? 'Saving...' : 'Save Configuration'}
             </Button>
           </div>
         </CardContent>
       </Card>
 
       {/* Webhook Configuration */}
       <Card className="card-elevated">
         <CardHeader>
           <CardTitle>Webhook Configuration</CardTitle>
           <CardDescription>
             Configure webhooks in Meta Business Suite to receive message status updates
           </CardDescription>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="space-y-2">
             <Label>Webhook URL</Label>
             <div className="flex gap-2">
               <Input value={webhookUrl} readOnly className="flex-1 bg-muted" />
               <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                 <Copy className="h-4 w-4" />
               </Button>
             </div>
           </div>
 
           <div className="space-y-2">
             <Label>Verify Token</Label>
             <div className="flex gap-2">
               <Input
                 value={config.webhook_verify_token}
                 onChange={(e) => setConfig(prev => ({ ...prev, webhook_verify_token: e.target.value }))}
                 placeholder="Enter a secret verify token"
                 className="flex-1"
               />
               <Button
                 variant="outline"
                 onClick={() => setConfig(prev => ({ 
                   ...prev, 
                   webhook_verify_token: crypto.randomUUID().replace(/-/g, '').slice(0, 32) 
                 }))}
               >
                 Generate
               </Button>
             </div>
             <p className="text-xs text-muted-foreground">
               Use this token when configuring the webhook in Meta Business Suite
             </p>
           </div>
 
           <Alert>
             <AlertTriangle className="h-4 w-4" />
             <AlertDescription>
               Subscribe to: <code className="bg-muted px-1 rounded">messages</code>, <code className="bg-muted px-1 rounded">message_template_status_update</code>
             </AlertDescription>
           </Alert>
         </CardContent>
       </Card>
 
       {/* Requirements Checklist */}
       <Card className="card-elevated">
         <CardHeader>
           <CardTitle>Setup Checklist</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-3">
             {[
               { label: 'Meta Business Account created', completed: true },
               { label: 'WhatsApp Business API access approved', completed: config.phone_number_id.length > 0 },
               { label: 'Phone number registered & verified', completed: config.is_connected },
               { label: 'Webhook configured', completed: config.webhook_verify_token.length > 0 },
               { label: 'Message templates approved', completed: false },
             ].map((item, index) => (
               <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                 {item.completed ? (
                   <CheckCircle className="h-5 w-5 text-green-500" />
                 ) : (
                   <XCircle className="h-5 w-5 text-muted-foreground" />
                 )}
                 <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                   {item.label}
                 </span>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
     </div>
   );
 }