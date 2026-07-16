
-- Remove duplicate RLS policy on url_clicks
DROP POLICY IF EXISTS "Anyone can record clicks" ON url_clicks;

-- Re-sync click counts with actual url_clicks records
UPDATE url_mappings 
SET clicks = (SELECT count(*) FROM url_clicks WHERE url_clicks.url_id = url_mappings.id);
