-- URL Shortener Tables
-- Table: url_mappings
CREATE TABLE public.url_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code VARCHAR(10) NOT NULL UNIQUE,
  original_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  clicks INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  custom_code BOOLEAN NOT NULL DEFAULT false,
  title TEXT,
  tags TEXT[] DEFAULT '{}',
  last_checked_at TIMESTAMP WITH TIME ZONE,
  is_healthy BOOLEAN DEFAULT true
);

-- Create index on short_code for fast lookups
CREATE INDEX idx_url_mappings_short_code ON public.url_mappings(short_code);
CREATE INDEX idx_url_mappings_user_id ON public.url_mappings(user_id);
CREATE INDEX idx_url_mappings_created_at ON public.url_mappings(created_at DESC);

-- Enable RLS
ALTER TABLE public.url_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own URLs
CREATE POLICY "Users can view their own URLs"
ON public.url_mappings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own URLs"
ON public.url_mappings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own URLs"
ON public.url_mappings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own URLs"
ON public.url_mappings
FOR DELETE
USING (auth.uid() = user_id);

-- Table: url_clicks (analytics)
CREATE TABLE public.url_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url_id UUID NOT NULL REFERENCES public.url_mappings(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  referrer TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100)
);

CREATE INDEX idx_url_clicks_url_id ON public.url_clicks(url_id);
CREATE INDEX idx_url_clicks_clicked_at ON public.url_clicks(clicked_at DESC);

-- Enable RLS
ALTER TABLE public.url_clicks ENABLE ROW LEVEL SECURITY;

-- Users can view clicks for their own URLs
CREATE POLICY "Users can view their URL clicks"
ON public.url_clicks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.url_mappings
    WHERE url_mappings.id = url_clicks.url_id
    AND url_mappings.user_id = auth.uid()
  )
);

-- Anyone can insert clicks (for redirect tracking)
CREATE POLICY "Anyone can insert clicks"
ON public.url_clicks
FOR INSERT
WITH CHECK (true);

-- Table: url_bulk_imports
CREATE TABLE public.url_bulk_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  total_urls INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_report JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.url_bulk_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their imports"
ON public.url_bulk_imports
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Table: url_api_keys (for API access)
CREATE TABLE public.url_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  name TEXT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY['read', 'create'],
  rate_limit INTEGER NOT NULL DEFAULT 100,
  requests_today INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.url_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their API keys"
ON public.url_api_keys
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to increment clicks atomically
CREATE OR REPLACE FUNCTION public.increment_url_clicks(p_url_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE url_mappings
  SET clicks = clicks + 1
  WHERE id = p_url_id;
END;
$$;

-- Function to check short code availability
CREATE OR REPLACE FUNCTION public.is_short_code_available(p_code VARCHAR)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM url_mappings WHERE short_code = p_code
  );
END;
$$;

-- Function to reset daily API request counts (to be called by cron)
CREATE OR REPLACE FUNCTION public.reset_api_daily_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE url_api_keys SET requests_today = 0;
END;
$$;