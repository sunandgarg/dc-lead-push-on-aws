-- Add sample_csv_content column to universities table for storing custom CSV samples
ALTER TABLE public.universities 
ADD COLUMN IF NOT EXISTS sample_csv_content text;

-- Add comment
COMMENT ON COLUMN public.universities.sample_csv_content IS 'Custom CSV sample content for each university lead upload';

-- Create marketing_leads table for storing extracted leads from campaigns
CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'campaign', -- 'campaign', 'manual', 'import'
  name text,
  email text,
  mobile text,
  variables jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'new', -- 'new', 'processed', 'pushed', 'failed'
  pushed_to_university_id uuid REFERENCES public.universities(id),
  pushed_at timestamp with time zone,
  push_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Auth users can manage marketing_leads" 
ON public.marketing_leads 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_marketing_leads_campaign ON public.marketing_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON public.marketing_leads(status);

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_leads_updated_at
BEFORE UPDATE ON public.marketing_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create flexible marketing_custom_integrations table for custom API configs
CREATE TABLE IF NOT EXISTS public.marketing_custom_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  base_url text NOT NULL,
  method text NOT NULL DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH')),
  headers jsonb DEFAULT '{}', -- Custom headers as JSON
  auth_type text DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'basic', 'api_key', 'custom_header')),
  auth_config jsonb DEFAULT '{}', -- Auth configuration (token, username/password, key name etc.)
  request_body_template jsonb DEFAULT '{}', -- Template for request body with placeholders
  response_success_path text, -- JSON path to check for success (e.g., 'data.success')
  response_message_path text, -- JSON path to extract message
  is_active boolean DEFAULT true,
  test_payload jsonb DEFAULT '{}', -- Sample payload for testing
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_custom_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy  
CREATE POLICY "Auth users can manage marketing_custom_integrations"
ON public.marketing_custom_integrations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_marketing_custom_integrations_updated_at
BEFORE UPDATE ON public.marketing_custom_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();