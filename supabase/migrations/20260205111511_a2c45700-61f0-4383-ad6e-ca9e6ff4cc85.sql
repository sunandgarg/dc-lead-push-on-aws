-- Add header field to url_mappings for DLT compliance
ALTER TABLE public.url_mappings 
ADD COLUMN IF NOT EXISTS header VARCHAR(50) DEFAULT NULL;

-- Add user_tracking field
ALTER TABLE public.url_mappings 
ADD COLUMN IF NOT EXISTS user_tracking BOOLEAN DEFAULT false;

-- Add code_length field
ALTER TABLE public.url_mappings 
ADD COLUMN IF NOT EXISTS code_length INTEGER DEFAULT 6;

-- Create index on header + short_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_url_mappings_header_code ON public.url_mappings(header, short_code);

-- Update the is_short_code_available function to also check header
CREATE OR REPLACE FUNCTION public.is_short_code_available(p_code VARCHAR, p_header VARCHAR DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_header IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM url_mappings WHERE short_code = p_code AND header = p_header
    );
  ELSE
    RETURN NOT EXISTS (
      SELECT 1 FROM url_mappings WHERE short_code = p_code AND header IS NULL
    );
  END IF;
END;
$$;