
-- Add business tracking columns to universities table for admin use
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS daily_limit INTEGER;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS admission_commitment INTEGER;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS contact_person_name TEXT;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS contact_person_mobile TEXT;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS contact_person_email TEXT;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS deal_price NUMERIC;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS gst_inclusive BOOLEAN DEFAULT true;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS state TEXT;
