
-- =============================================
-- HIGH-TRAFFIC INDEXES FOR 10M SCALE
-- =============================================

-- URL REDIRECTS: The hottest path - every redirect queries this
CREATE INDEX IF NOT EXISTS idx_url_mappings_short_code_header 
  ON public.url_mappings (short_code, header) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_url_mappings_short_code_null_header 
  ON public.url_mappings (short_code) 
  WHERE header IS NULL AND is_active = true;

-- URL CLICKS: High-volume inserts, queried by url_id for analytics
CREATE INDEX IF NOT EXISTS idx_url_clicks_url_id 
  ON public.url_clicks (url_id);

CREATE INDEX IF NOT EXISTS idx_url_clicks_clicked_at 
  ON public.url_clicks (clicked_at DESC);

-- LEADS: Queried by batch_id+status constantly during processing
CREATE INDEX IF NOT EXISTS idx_leads_batch_status 
  ON public.leads (batch_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_university_status 
  ON public.leads (university_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_created_at 
  ON public.leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_leads_user_id 
  ON public.leads (user_id);

-- API LOGS: Queried by university_id, batch_id, status for filtering
CREATE INDEX IF NOT EXISTS idx_api_logs_university_id 
  ON public.api_logs (university_id);

CREATE INDEX IF NOT EXISTS idx_api_logs_batch_id 
  ON public.api_logs (batch_id);

CREATE INDEX IF NOT EXISTS idx_api_logs_created_at 
  ON public.api_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_logs_status 
  ON public.api_logs (status);

-- UPLOAD BATCHES: Queue processor queries processing batches
CREATE INDEX IF NOT EXISTS idx_upload_batches_status 
  ON public.upload_batches (status) 
  WHERE status = 'processing';

-- CRM CONTACTS: Frequently searched/filtered
CREATE INDEX IF NOT EXISTS idx_crm_contacts_mobile 
  ON public.crm_contacts (mobile);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_email 
  ON public.crm_contacts (email);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_stage_id 
  ON public.crm_contacts (stage_id);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_assigned_to 
  ON public.crm_contacts (assigned_to);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_university_id 
  ON public.crm_contacts (university_id);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_created_at 
  ON public.crm_contacts (created_at DESC);

-- CRM ACTIVITIES: Queried by contact_id
CREATE INDEX IF NOT EXISTS idx_crm_activities_contact_id 
  ON public.crm_activities (contact_id);

-- CRM TASKS: Queried by status, assigned_to
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status_due 
  ON public.crm_tasks (status, due_date);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to 
  ON public.crm_tasks (assigned_to);

-- SMTP EMAIL LOGS: High volume tracking
CREATE INDEX IF NOT EXISTS idx_smtp_email_logs_campaign_id 
  ON public.smtp_email_logs (campaign_id);

CREATE INDEX IF NOT EXISTS idx_smtp_email_logs_tracking_pixel 
  ON public.smtp_email_logs (tracking_pixel_id);

CREATE INDEX IF NOT EXISTS idx_smtp_email_logs_status 
  ON public.smtp_email_logs (status);

-- SMTP LINKS: Click tracking lookups
CREATE INDEX IF NOT EXISTS idx_smtp_links_tracking_code 
  ON public.smtp_links (tracking_code);

-- AUTOMATION: Active rules queried on every lead
CREATE INDEX IF NOT EXISTS idx_automation_rules_status 
  ON public.automation_rules (status, priority);

-- MARKETING
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status 
  ON public.marketing_campaigns (status);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign 
  ON public.campaign_recipients (campaign_id);

-- FEATURE TOGGLES: Read on every page load
CREATE INDEX IF NOT EXISTS idx_feature_toggles_key 
  ON public.feature_toggles (feature_key);

-- PROFILES: Auth check on every request
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved 
  ON public.profiles (id) 
  WHERE is_approved = true;

-- USER ROLES: Checked on every RLS evaluation
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role 
  ON public.user_roles (user_id, role);
