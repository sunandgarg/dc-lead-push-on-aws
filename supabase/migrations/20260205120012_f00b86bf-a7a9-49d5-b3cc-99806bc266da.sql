-- Allow anonymous inserts to url_clicks for click tracking from short URLs
-- This is needed because users clicking short links are not authenticated
DROP POLICY IF EXISTS "Anyone can insert clicks" ON public.url_clicks;
CREATE POLICY "Anyone can insert clicks" 
ON public.url_clicks 
FOR INSERT 
WITH CHECK (true);

-- Ensure the increment function has SECURITY DEFINER to bypass RLS
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