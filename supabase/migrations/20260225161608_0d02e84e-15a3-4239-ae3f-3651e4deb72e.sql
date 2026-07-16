
-- Email API Settings
CREATE TABLE public.email_api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key TEXT,
  sender_domain TEXT,
  default_from_email TEXT,
  default_from_name TEXT,
  webhook_events JSONB DEFAULT '{"delivered":true,"open":true,"click":true,"bounce":true,"spam_report":true,"unsubscribe":true,"deferred":true,"block":true,"invalid":true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_api_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage email_api_settings" ON public.email_api_settings FOR ALL USING (true) WITH CHECK (true);

-- Email Templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  subject TEXT,
  content TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage email_templates" ON public.email_templates FOR ALL USING (true) WITH CHECK (true);

-- Email Campaigns
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id),
  from_name TEXT,
  from_email TEXT,
  reply_to TEXT,
  subject TEXT,
  content TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'immediate',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft',
  audience_type TEXT DEFAULT 'csv',
  audience_filters JSONB DEFAULT '{}'::jsonb,
  total_count INTEGER DEFAULT 0,
  unique_audience_count INTEGER DEFAULT 0,
  provider_campaign_id TEXT,
  provider_status TEXT,
  provider_message_id TEXT,
  automation_id UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage email_campaigns" ON public.email_campaigns FOR ALL USING (true) WITH CHECK (true);

-- Email Events (webhook events from Netcore)
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  recipient_email TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  provider_message_id TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage email_events" ON public.email_events FOR ALL USING (true) WITH CHECK (true);

-- Email Recipients
CREATE TABLE public.email_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.email_campaigns(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  send_status TEXT DEFAULT 'pending',
  provider_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can manage email_recipients" ON public.email_recipients FOR ALL USING (true) WITH CHECK (true);
