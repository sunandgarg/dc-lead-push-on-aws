-- Lead Scoring System
CREATE TABLE public.lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'engagement', 'behavior', 'demographic', 'fit'
  condition_type TEXT NOT NULL, -- 'email_opened', 'page_visited', 'form_submitted', 'field_match', etc.
  condition_config JSONB NOT NULL DEFAULT '{}', -- stores condition parameters
  score_value INTEGER NOT NULL DEFAULT 0, -- positive or negative
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Score History (track score changes)
CREATE TABLE public.lead_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES public.lead_scoring_rules(id) ON DELETE SET NULL,
  previous_score INTEGER NOT NULL DEFAULT 0,
  new_score INTEGER NOT NULL DEFAULT 0,
  score_change INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  triggered_by TEXT, -- 'auto', 'manual'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Segments
CREATE TABLE public.lead_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  segment_type TEXT NOT NULL DEFAULT 'dynamic', -- 'dynamic', 'static'
  filter_config JSONB NOT NULL DEFAULT '{}', -- stores segment filter rules
  lead_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Segment Members (for static segments)
CREATE TABLE public.lead_segment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES public.lead_segments(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(segment_id, contact_id)
);

-- Lead Assignment Rules
CREATE TABLE public.lead_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  assignment_type TEXT NOT NULL DEFAULT 'round_robin', -- 'round_robin', 'load_balanced', 'manual', 'criteria_based'
  criteria_config JSONB DEFAULT '{}', -- filter criteria for when this rule applies
  assignee_config JSONB DEFAULT '{}', -- list of assignees, capacity, etc.
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Assignment History
CREATE TABLE public.lead_assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL,
  assigned_from UUID,
  assigned_to UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Web Forms (for lead capture)
CREATE TABLE public.lead_capture_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  form_config JSONB NOT NULL DEFAULT '{}', -- field definitions, validation rules
  style_config JSONB DEFAULT '{}', -- styling options
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  redirect_url TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for your submission!',
  auto_assign_rule_id UUID REFERENCES public.lead_assignment_rules(id) ON DELETE SET NULL,
  default_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  submissions_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form Submissions
CREATE TABLE public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.lead_capture_forms(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  submission_data JSONB NOT NULL DEFAULT '{}',
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Interaction Events (for scoring and tracking)
CREATE TABLE public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'email_opened', 'email_clicked', 'page_visited', 'form_submitted', 'call_completed', etc.
  event_data JSONB DEFAULT '{}',
  source TEXT, -- 'email', 'website', 'whatsapp', 'sms', 'call'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead Communication Preferences
CREATE TABLE public.lead_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_opt_in BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT true,
  whatsapp_opt_in BOOLEAN DEFAULT true,
  call_opt_in BOOLEAN DEFAULT true,
  preferred_contact_time TEXT, -- 'morning', 'afternoon', 'evening'
  preferred_language TEXT DEFAULT 'en',
  do_not_contact BOOLEAN DEFAULT false,
  do_not_contact_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add lead_score column to crm_contacts
ALTER TABLE public.crm_contacts 
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS lead_quality TEXT DEFAULT 'unscored', -- 'hot', 'warm', 'cold', 'unscored'
ADD COLUMN IF NOT EXISTS lead_score_updated_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_capture_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Auth users can manage lead_scoring_rules" ON public.lead_scoring_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_score_history" ON public.lead_score_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_segments" ON public.lead_segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_segment_members" ON public.lead_segment_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_assignment_rules" ON public.lead_assignment_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_assignment_history" ON public.lead_assignment_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_capture_forms" ON public.lead_capture_forms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage form_submissions" ON public.form_submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_events" ON public.lead_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Auth users can manage lead_preferences" ON public.lead_preferences FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_lead_score_history_contact ON public.lead_score_history(contact_id);
CREATE INDEX idx_lead_events_contact ON public.lead_events(contact_id);
CREATE INDEX idx_lead_events_type ON public.lead_events(event_type);
CREATE INDEX idx_form_submissions_form ON public.form_submissions(form_id);
CREATE INDEX idx_crm_contacts_score ON public.crm_contacts(lead_score);
CREATE INDEX idx_crm_contacts_quality ON public.crm_contacts(lead_quality);

-- Function to recalculate lead score
CREATE OR REPLACE FUNCTION public.recalculate_lead_score(p_contact_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_score INTEGER := 0;
  v_quality TEXT := 'unscored';
BEGIN
  -- Sum all score changes for this contact
  SELECT COALESCE(SUM(score_change), 0) INTO v_total_score
  FROM lead_score_history
  WHERE contact_id = p_contact_id;
  
  -- Determine quality based on score
  v_quality := CASE 
    WHEN v_total_score >= 80 THEN 'hot'
    WHEN v_total_score >= 40 THEN 'warm'
    WHEN v_total_score > 0 THEN 'cold'
    ELSE 'unscored'
  END;
  
  -- Update contact
  UPDATE crm_contacts 
  SET lead_score = v_total_score, 
      lead_quality = v_quality,
      lead_score_updated_at = now()
  WHERE id = p_contact_id;
  
  RETURN v_total_score;
END;
$$;

-- Trigger to update timestamps
CREATE TRIGGER update_lead_scoring_rules_updated_at
  BEFORE UPDATE ON public.lead_scoring_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_segments_updated_at
  BEFORE UPDATE ON public.lead_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_assignment_rules_updated_at
  BEFORE UPDATE ON public.lead_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_capture_forms_updated_at
  BEFORE UPDATE ON public.lead_capture_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();