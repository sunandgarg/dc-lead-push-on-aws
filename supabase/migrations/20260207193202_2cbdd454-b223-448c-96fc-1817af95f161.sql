-- SMTP Domains table for multi-domain management
CREATE TABLE public.smtp_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  display_name TEXT,
  from_email TEXT NOT NULL,
  from_name TEXT,
  spf_record TEXT,
  dkim_public_key TEXT,
  dkim_private_key TEXT,
  dkim_selector TEXT DEFAULT 'default',
  dmarc_record TEXT,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verifying', 'verified', 'failed')),
  verified_at TIMESTAMP WITH TIME ZONE,
  reputation_score INTEGER DEFAULT 100,
  daily_limit INTEGER DEFAULT 1000,
  hourly_limit INTEGER DEFAULT 100,
  emails_sent_today INTEGER DEFAULT 0,
  emails_sent_this_hour INTEGER DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  warmup_enabled BOOLEAN DEFAULT false,
  warmup_day INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMTP Email Campaigns
CREATE TABLE public.smtp_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  from_domain_id UUID REFERENCES public.smtp_domains(id),
  reply_to TEXT,
  list_id UUID REFERENCES public.marketing_lists(id),
  segment_id UUID REFERENCES public.lead_segments(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled', 'failed')),
  send_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  ab_test_enabled BOOLEAN DEFAULT false,
  ab_test_config JSONB,
  tracking_enabled BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMTP Email Logs for individual email tracking
CREATE TABLE public.smtp_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.smtp_campaigns(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  contact_id UUID REFERENCES public.crm_contacts(id),
  domain_id UUID REFERENCES public.smtp_domains(id),
  message_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam', 'unsubscribed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  first_opened_at TIMESTAMP WITH TIME ZONE,
  last_opened_at TIMESTAMP WITH TIME ZONE,
  total_opens INTEGER DEFAULT 0,
  first_clicked_at TIMESTAMP WITH TIME ZONE,
  total_clicks INTEGER DEFAULT 0,
  bounced_at TIMESTAMP WITH TIME ZONE,
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', NULL)),
  bounce_reason TEXT,
  bounce_code TEXT,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  spam_reported_at TIMESTAMP WITH TIME ZONE,
  tracking_pixel_id TEXT UNIQUE,
  variables JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMTP Tracking Events
CREATE TABLE public.smtp_tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id UUID REFERENCES public.smtp_email_logs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'spam', 'unsubscribed')),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  email_client TEXT,
  os TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  link_url TEXT,
  link_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMTP Links for click tracking
CREATE TABLE public.smtp_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.smtp_campaigns(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  tracking_url TEXT NOT NULL,
  tracking_code TEXT NOT NULL UNIQUE,
  click_count INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMTP Link Clicks
CREATE TABLE public.smtp_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID REFERENCES public.smtp_links(id) ON DELETE CASCADE,
  email_log_id UUID REFERENCES public.smtp_email_logs(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- SMTP Suppression List (bounced, unsubscribed, spam)
CREATE TABLE public.smtp_suppression_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('hard_bounce', 'soft_bounce', 'unsubscribed', 'spam_complaint', 'manual')),
  source_campaign_id UUID REFERENCES public.smtp_campaigns(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, reason)
);

-- SMTP Templates
CREATE TABLE public.smtp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  subject_line TEXT,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  is_system BOOLEAN DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smtp_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_templates ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (allow all for now, can be restricted later)
CREATE POLICY "Allow authenticated access to smtp_domains" ON public.smtp_domains FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to smtp_campaigns" ON public.smtp_campaigns FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to smtp_email_logs" ON public.smtp_email_logs FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to smtp_tracking_events" ON public.smtp_tracking_events FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to smtp_links" ON public.smtp_links FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to smtp_link_clicks" ON public.smtp_link_clicks FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to smtp_suppression_list" ON public.smtp_suppression_list FOR ALL USING (true);
CREATE POLICY "Allow authenticated access to smtp_templates" ON public.smtp_templates FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_smtp_email_logs_campaign ON public.smtp_email_logs(campaign_id);
CREATE INDEX idx_smtp_email_logs_status ON public.smtp_email_logs(status);
CREATE INDEX idx_smtp_email_logs_recipient ON public.smtp_email_logs(recipient_email);
CREATE INDEX idx_smtp_tracking_events_email_log ON public.smtp_tracking_events(email_log_id);
CREATE INDEX idx_smtp_tracking_events_type ON public.smtp_tracking_events(event_type);
CREATE INDEX idx_smtp_links_campaign ON public.smtp_links(campaign_id);
CREATE INDEX idx_smtp_suppression_email ON public.smtp_suppression_list(email);

-- Triggers for updated_at
CREATE TRIGGER update_smtp_domains_updated_at BEFORE UPDATE ON public.smtp_domains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_smtp_campaigns_updated_at BEFORE UPDATE ON public.smtp_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_smtp_templates_updated_at BEFORE UPDATE ON public.smtp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default SMTP templates
INSERT INTO public.smtp_templates (name, description, category, subject_line, html_content, text_content, variables, is_system) VALUES
('Welcome Email', 'Welcome new subscribers to your list', 'onboarding', 'Welcome to {{company_name}}!', '<html><body><h1>Welcome, {{first_name}}!</h1><p>Thank you for joining {{company_name}}. We''re excited to have you!</p><p><a href="{{cta_link}}">Get Started</a></p></body></html>', 'Welcome, {{first_name}}! Thank you for joining {{company_name}}.', ARRAY['first_name', 'company_name', 'cta_link'], true),
('Newsletter', 'Monthly newsletter template', 'marketing', '{{subject}}', '<html><body><h1>{{headline}}</h1><p>{{content}}</p><p><a href="{{cta_link}}">{{cta_text}}</a></p></body></html>', '{{headline}}\n\n{{content}}\n\nClick here: {{cta_link}}', ARRAY['subject', 'headline', 'content', 'cta_link', 'cta_text'], true),
('Promotional', 'Promotional offer template', 'marketing', '{{offer_title}} - Limited Time!', '<html><body><h1>{{offer_title}}</h1><p>{{offer_description}}</p><h2>Use Code: {{promo_code}}</h2><p><a href="{{shop_link}}">Shop Now</a></p></body></html>', '{{offer_title}}\n\n{{offer_description}}\n\nUse Code: {{promo_code}}\n\nShop: {{shop_link}}', ARRAY['offer_title', 'offer_description', 'promo_code', 'shop_link'], true),
('Transactional', 'Order confirmation template', 'transactional', 'Your Order #{{order_id}} Confirmation', '<html><body><h1>Thank you for your order!</h1><p>Order #{{order_id}}</p><p>Total: {{order_total}}</p><p><a href="{{track_link}}">Track Your Order</a></p></body></html>', 'Thank you for your order!\n\nOrder #{{order_id}}\nTotal: {{order_total}}\n\nTrack: {{track_link}}', ARRAY['order_id', 'order_total', 'track_link'], true),
('Re-engagement', 'Win back inactive subscribers', 'retention', 'We miss you, {{first_name}}!', '<html><body><h1>We miss you, {{first_name}}!</h1><p>It''s been a while since we''ve heard from you. Here''s a special offer just for you:</p><p>{{special_offer}}</p><p><a href="{{comeback_link}}">Come Back</a></p></body></html>', 'We miss you, {{first_name}}!\n\n{{special_offer}}\n\nCome back: {{comeback_link}}', ARRAY['first_name', 'special_offer', 'comeback_link'], true);