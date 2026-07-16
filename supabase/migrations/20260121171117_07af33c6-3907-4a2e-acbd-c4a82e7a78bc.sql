-- Marketing Templates Table
CREATE TABLE public.marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp', 'landing_page', 'push')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  content JSONB NOT NULL DEFAULT '{}',
  subject_line TEXT,
  variables TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_dlt_approved BOOLEAN DEFAULT false,
  dlt_template_id TEXT,
  dlt_approval_status TEXT CHECK (dlt_approval_status IN ('pending', 'approved', 'rejected')),
  dlt_rejection_reason TEXT,
  dlt_submitted_at TIMESTAMPTZ,
  dlt_approved_at TIMESTAMPTZ,
  preview_html TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing Integrations Table
CREATE TABLE public.marketing_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'whatsapp', 'dlt')),
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'expired', 'error')),
  api_key_expires_at TIMESTAMPTZ,
  last_synced TIMESTAMPTZ,
  last_error TEXT,
  webhook_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  fallback_integration_id UUID REFERENCES public.marketing_integrations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing Campaigns Table
CREATE TABLE public.marketing_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channels TEXT[] NOT NULL DEFAULT '{}',
  template_id UUID REFERENCES public.marketing_templates(id),
  integration_id UUID REFERENCES public.marketing_integrations(id),
  recipient_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'completed', 'cancelled', 'failed')),
  send_at TIMESTAMPTZ,
  timezone TEXT DEFAULT 'UTC',
  recurrence TEXT CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly')),
  ab_test_config JSONB,
  recipient_filter JSONB,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign Recipients Table
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  email TEXT,
  mobile TEXT,
  name TEXT,
  variables JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked', 'bounced', 'unsubscribed', 'read')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign KPIs Table
CREATE TABLE public.campaign_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  vendor_id UUID REFERENCES public.marketing_integrations(id),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DLT Entities Table (for SMS compliance)
CREATE TABLE public.dlt_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  sender_ids TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  registered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  documents JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing Unsubscribes Table
CREATE TABLE public.marketing_unsubscribes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  mobile TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'all')),
  reason TEXT,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Template Versions (for version history)
CREATE TABLE public.template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.marketing_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  subject_line TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dlt_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Auth users can manage marketing_templates" ON public.marketing_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage marketing_integrations" ON public.marketing_integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage marketing_campaigns" ON public.marketing_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage campaign_recipients" ON public.campaign_recipients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage campaign_kpis" ON public.campaign_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage dlt_entities" ON public.dlt_entities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage marketing_unsubscribes" ON public.marketing_unsubscribes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage template_versions" ON public.template_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_marketing_templates_type ON public.marketing_templates(type);
CREATE INDEX idx_marketing_templates_channel ON public.marketing_templates(channel);
CREATE INDEX idx_marketing_templates_status ON public.marketing_templates(status);
CREATE INDEX idx_marketing_integrations_type ON public.marketing_integrations(type);
CREATE INDEX idx_marketing_integrations_provider ON public.marketing_integrations(provider);
CREATE INDEX idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);
CREATE INDEX idx_campaign_kpis_campaign ON public.campaign_kpis(campaign_id);
CREATE INDEX idx_campaign_kpis_metric ON public.campaign_kpis(metric_type);

-- Trigger for updated_at
CREATE TRIGGER update_marketing_templates_updated_at BEFORE UPDATE ON public.marketing_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_integrations_updated_at BEFORE UPDATE ON public.marketing_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dlt_entities_updated_at BEFORE UPDATE ON public.dlt_entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();