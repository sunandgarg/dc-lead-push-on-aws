-- Add retry configuration to universities table
ALTER TABLE public.universities
ADD COLUMN IF NOT EXISTS auto_retry_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_retry_delay_minutes integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS auto_retry_max_attempts integer DEFAULT 3;