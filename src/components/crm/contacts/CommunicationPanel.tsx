import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  MessageSquare, 
  Phone,
  Send,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  mobile: string;
}

interface CommunicationPanelProps {
  contact: Contact;
  onActivityLogged: () => void;
}

export function CommunicationPanel({ contact, onActivityLogged }: CommunicationPanelProps) {
  const [activeChannel, setActiveChannel] = useState('email');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Universal message for "Send All"
  const [universalMessage, setUniversalMessage] = useState('');

  const handleSendEmail = async () => {
    if (!contact.email) {
      toast({ title: 'Error', description: 'No email address available', variant: 'destructive' });
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({ title: 'Error', description: 'Subject and body are required', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      // Log the email activity
      await supabase.from('crm_activities').insert({
        contact_id: contact.id,
        type: 'email',
        title: `Email: ${emailSubject}`,
        description: emailBody.substring(0, 200),
        metadata: { subject: emailSubject, body: emailBody },
      });

      // Update last contacted
      await supabase
        .from('crm_contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contact.id);

      toast({ 
        title: 'Email Logged', 
        description: 'Email activity recorded. Actual sending requires email integration.',
      });
      
      setEmailSubject('');
      setEmailBody('');
      onActivityLogged();
    } catch (error) {
      console.error('Error logging email:', error);
      toast({ title: 'Error', description: 'Failed to log email', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast({ title: 'Error', description: 'Message is required', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      // Log the SMS activity
      await supabase.from('crm_activities').insert({
        contact_id: contact.id,
        type: 'sms',
        title: 'SMS Sent',
        description: smsMessage.substring(0, 200),
        metadata: { message: smsMessage, mobile: contact.mobile },
      });

      // Update last contacted
      await supabase
        .from('crm_contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contact.id);

      toast({ 
        title: 'SMS Logged', 
        description: 'SMS activity recorded. Actual sending requires SMS integration.',
      });
      
      setSmsMessage('');
      onActivityLogged();
    } catch (error) {
      console.error('Error logging SMS:', error);
      toast({ title: 'Error', description: 'Failed to log SMS', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!whatsappMessage.trim()) {
      toast({ title: 'Error', description: 'Message is required', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      // Log the WhatsApp activity
      await supabase.from('crm_activities').insert({
        contact_id: contact.id,
        type: 'whatsapp',
        title: 'WhatsApp Message',
        description: whatsappMessage.substring(0, 200),
        metadata: { message: whatsappMessage, mobile: contact.mobile },
      });

      // Update last contacted
      await supabase
        .from('crm_contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contact.id);

      // Open WhatsApp Web
      const encodedMessage = encodeURIComponent(whatsappMessage);
      const whatsappUrl = `https://wa.me/${contact.mobile.replace(/\D/g, '')}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      toast({ title: 'WhatsApp Opened', description: 'Message logged and WhatsApp opened' });
      
      setWhatsappMessage('');
      onActivityLogged();
    } catch (error) {
      console.error('Error logging WhatsApp:', error);
      toast({ title: 'Error', description: 'Failed to log WhatsApp message', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendAll = async () => {
    if (!universalMessage.trim()) {
      toast({ title: 'Error', description: 'Message is required', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const activities = [
        {
          contact_id: contact.id,
          type: 'sms',
          title: 'SMS Sent (Multi-channel)',
          description: universalMessage.substring(0, 200),
          metadata: { message: universalMessage, mobile: contact.mobile },
        },
        {
          contact_id: contact.id,
          type: 'whatsapp',
          title: 'WhatsApp Sent (Multi-channel)',
          description: universalMessage.substring(0, 200),
          metadata: { message: universalMessage, mobile: contact.mobile },
        },
      ];

      // Add email if available
      if (contact.email) {
        activities.push({
          contact_id: contact.id,
          type: 'email',
          title: 'Email Sent (Multi-channel)',
          description: universalMessage.substring(0, 200),
          metadata: { message: universalMessage, mobile: contact.mobile },
        });
      }

      await supabase.from('crm_activities').insert(activities);

      // Update last contacted
      await supabase
        .from('crm_contacts')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', contact.id);

      // Open WhatsApp Web
      const encodedMessage = encodeURIComponent(universalMessage);
      const whatsappUrl = `https://wa.me/${contact.mobile.replace(/\D/g, '')}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      toast({ 
        title: 'Multi-channel Message Sent', 
        description: `Message logged to ${activities.length} channels`
      });
      
      setUniversalMessage('');
      onActivityLogged();
    } catch (error) {
      console.error('Error sending multi-channel:', error);
      toast({ title: 'Error', description: 'Failed to send messages', variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  const initiateCall = async () => {
    try {
      // Log call initiation
      await supabase.from('crm_activities').insert({
        contact_id: contact.id,
        type: 'call',
        title: 'Call Initiated',
        description: `Calling ${contact.mobile}`,
      });

      // Open phone dialer
      window.location.href = `tel:${contact.mobile}`;

      onActivityLogged();
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={initiateCall} className="bg-green-600 hover:bg-green-700">
          <Phone className="h-4 w-4 mr-2" />
          Call Now
        </Button>
        <Button 
          variant="outline"
          onClick={() => {
            const whatsappUrl = `https://wa.me/${contact.mobile.replace(/\D/g, '')}`;
            window.open(whatsappUrl, '_blank');
          }}
          className="border-green-500 text-green-600 hover:bg-green-50"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Open WhatsApp
        </Button>
        {contact.email && (
          <Button 
            variant="outline"
            onClick={() => window.location.href = `mailto:${contact.email}`}
          >
            <Mail className="h-4 w-4 mr-2" />
            Open Email
          </Button>
        )}
      </div>

      {/* Send to All Channels */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Send to All Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> SMS
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700">
              <MessageSquare className="h-3 w-3" /> WhatsApp
            </Badge>
            {contact.email && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </Badge>
            )}
          </div>
          <Textarea
            placeholder="Type your message here... It will be sent to all available channels."
            value={universalMessage}
            onChange={(e) => setUniversalMessage(e.target.value)}
            rows={4}
          />
          <Button 
            className="w-full" 
            onClick={handleSendAll}
            disabled={isSending || !universalMessage.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send to All Channels
          </Button>
        </CardContent>
      </Card>

      {/* Individual Channels */}
      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList className="w-full">
          <TabsTrigger value="email" className="flex-1">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1">
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {!contact.email ? (
                <div className="text-center py-6 text-muted-foreground">
                  No email address available for this contact
                </div>
              ) : (
                <>
                  <div>
                    <Label>To</Label>
                    <Input value={contact.email} disabled />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input 
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Type your email message..."
                      rows={6}
                    />
                  </div>
                  <Button 
                    onClick={handleSendEmail}
                    disabled={isSending}
                    className="w-full"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Log & Send Email
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>To</Label>
                <Input value={contact.mobile} disabled />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your SMS message..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {smsMessage.length}/160 characters
                </p>
              </div>
              <Button 
                onClick={handleSendSMS}
                disabled={isSending}
                className="w-full"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Log & Send SMS
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>To</Label>
                <Input value={contact.mobile} disabled />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Type your WhatsApp message..."
                  rows={4}
                />
              </div>
              <Button 
                onClick={handleSendWhatsApp}
                disabled={isSending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <ExternalLink className="h-3 w-3 mr-2" />
                  </>
                )}
                Log & Open WhatsApp
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
