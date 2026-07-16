-- Fix the increment_url_clicks function to use SECURITY DEFINER so it works for unauthenticated visitors
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

-- Also fix the existing click counts to match actual url_clicks records
UPDATE url_mappings 
SET clicks = (SELECT count(*) FROM url_clicks WHERE url_clicks.url_id = url_mappings.id);