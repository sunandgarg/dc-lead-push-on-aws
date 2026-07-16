
-- Add publisher panel fields and custom API config fields to universities
ALTER TABLE public.universities 
  ADD COLUMN IF NOT EXISTS publisher_panel_url TEXT,
  ADD COLUMN IF NOT EXISTS publisher_id TEXT,
  ADD COLUMN IF NOT EXISTS custom_headers JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'secret_key',
  ADD COLUMN IF NOT EXISTS auth_header_key TEXT,
  ADD COLUMN IF NOT EXISTS auth_header_value TEXT,
  ADD COLUMN IF NOT EXISTS payload_wrapper TEXT DEFAULT 'object';

-- auth_type: 'secret_key' (in body), 'bearer' (Authorization: Bearer), 'custom_header', 'none'
-- payload_wrapper: 'object' (send as {}), 'array' (send as [{}])
-- custom_headers: additional HTTP headers as JSON
