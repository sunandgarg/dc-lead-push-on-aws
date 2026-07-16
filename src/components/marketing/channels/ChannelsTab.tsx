import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Smartphone, MessageSquare, Server } from 'lucide-react';
import { EmailChannelConfig } from './EmailChannelConfig';
import { SMSChannelConfig } from './SMSChannelConfig';
import { WhatsAppChannelConfig } from './WhatsAppChannelConfig';
import { SMTPModule } from '../smtp/SMTPModule';

export function ChannelsTab() {
  const [activeChannel, setActiveChannel] = useState('email');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold">Channel Management</h2>
        <p className="text-muted-foreground">Configure your marketing channels and providers</p>
      </div>

      <Tabs value={activeChannel} onValueChange={setActiveChannel}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="mt-6">
          <EmailChannelConfig />
        </TabsContent>

        <TabsContent value="smtp" className="mt-6">
          <SMTPModule />
        </TabsContent>

        <TabsContent value="sms" className="mt-6">
          <SMSChannelConfig />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-6">
          <WhatsAppChannelConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
