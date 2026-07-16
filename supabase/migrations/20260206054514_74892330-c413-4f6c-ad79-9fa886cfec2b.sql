-- Add public SELECT policy for url_mappings to allow anonymous redirect access
-- The redirect functionality needs to read URL mappings without authentication

CREATE POLICY "Public can read active URLs for redirect" 
ON public.url_mappings 
FOR SELECT 
USING (is_active = true);

-- Also need public INSERT policy for url_clicks to track anonymous clicks
-- Check existing policy first
DROP POLICY IF EXISTS "Anyone can record clicks" ON public.url_clicks;

CREATE POLICY "Anyone can record clicks" 
ON public.url_clicks 
FOR INSERT 
WITH CHECK (true);

-- Allow public SELECT on url_clicks for the url owner (for analytics)
-- This is already handled by existing policies