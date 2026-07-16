
-- Funnel campaigns: orchestrate email → engagement tracking → WhatsApp/SMS → university push
CREATE TABLE public.funnel_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  
  -- Step 1: Email config
  email_subject text,
  email_content text,
  email_template_id uuid REFERENCES public.smtp_templates(id),
  from_email text,
  from_name text,
  
  -- Audience
  list_id uuid,
  total_contacts integer DEFAULT 0,
  
  -- Step 2: Engagement rules
  engagement_rules jsonb DEFAULT '{
    "click_action": "whatsapp",
    "open_action": "sms",
    "no_engage_action": "email_retry",
    "wait_hours": 48,
    "auto_push_to_university": false
  }'::jsonb,
  
  -- University push config
  university_id uuid REFERENCES public.universities(id),
  push_mode text DEFAULT 'manual', -- 'auto' or 'manual'
  
  -- Stats
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  whatsapp_sent integer DEFAULT 0,
  sms_sent integer DEFAULT 0,
  retry_email_sent integer DEFAULT 0,
  pushed_to_university integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft', -- draft, sending_email, tracking, sending_followup, pushing, completed, paused
  current_step text DEFAULT 'setup', -- setup, email_sent, engagement_tracked, followup_sent, university_pushed
  
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Funnel campaign contacts: individual contact tracking through the funnel
CREATE TABLE public.funnel_campaign_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.funnel_campaigns(id) ON DELETE CASCADE,
  
  -- Contact info
  name text,
  email text,
  mobile text,
  extra_data jsonb DEFAULT '{}'::jsonb,
  
  -- Email engagement
  email_sent_at timestamptz,
  email_delivered_at timestamptz,
  email_opened_at timestamptz,
  email_clicked_at timestamptz,
  email_bounced boolean DEFAULT false,
  
  -- Engagement classification
  engagement_type text, -- 'clicked', 'opened', 'none', 'bounced'
  
  -- Follow-up actions
  followup_channel text, -- 'whatsapp', 'sms', 'email_retry', null
  followup_sent_at timestamptz,
  followup_delivered_at timestamptz,
  followup_response text,
  
  -- University push
  push_status text DEFAULT 'pending', -- 'pending', 'queued', 'pushed', 'failed', 'skipped'
  pushed_at timestamptz,
  push_response text,
  university_lead_id text,
  
  -- Status
  status text DEFAULT 'pending', -- 'pending', 'email_sent', 'engaged', 'followup_sent', 'pushed', 'failed'
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funnel_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_campaign_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Approved users can manage funnel_campaigns"
  ON public.funnel_campaigns FOR ALL TO authenticated
  USING (is_user_approved(auth.uid()))
  WITH CHECK (is_user_approved(auth.uid()));

CREATE POLICY "Approved users can manage funnel_campaign_contacts"
  ON public.funnel_campaign_contacts FOR ALL TO authenticated
  USING (is_user_approved(auth.uid()))
  WITH CHECK (is_user_approved(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_funnel_contacts_campaign ON public.funnel_campaign_contacts(campaign_id);
CREATE INDEX idx_funnel_contacts_engagement ON public.funnel_campaign_contacts(campaign_id, engagement_type);
CREATE INDEX idx_funnel_contacts_push_status ON public.funnel_campaign_contacts(campaign_id, push_status);
CREATE INDEX idx_funnel_contacts_email ON public.funnel_campaign_contacts(email);
CREATE INDEX idx_funnel_campaigns_status ON public.funnel_campaigns(status);
