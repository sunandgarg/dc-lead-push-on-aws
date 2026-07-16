
-- =========================================================
-- PRODUCTION HARDENING MIGRATION
-- =========================================================

-- 1) Enable RLS on app_settings (was disabled — CRITICAL)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write app_settings (it stores throughput/admin config)
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
CREATE POLICY "Admins can manage app_settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Approved users can READ app_settings (UI needs to read throughput limits, etc.)
DROP POLICY IF EXISTS "Approved users can read app_settings" ON public.app_settings;
CREATE POLICY "Approved users can read app_settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (public.is_user_approved(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

-- 2) Replace permissive "always true" RLS policies with approval-gated checks
-- smtp_campaigns
DROP POLICY IF EXISTS "Allow authenticated access to smtp_campaigns" ON public.smtp_campaigns;
CREATE POLICY "Approved users can manage smtp_campaigns" ON public.smtp_campaigns
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- smtp_domains
DROP POLICY IF EXISTS "Allow authenticated access to smtp_domains" ON public.smtp_domains;
CREATE POLICY "Approved users can manage smtp_domains" ON public.smtp_domains
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- smtp_links
DROP POLICY IF EXISTS "Allow authenticated access to smtp_links" ON public.smtp_links;
CREATE POLICY "Approved users can manage smtp_links" ON public.smtp_links
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- smtp_tracking_events
DROP POLICY IF EXISTS "Allow authenticated access to smtp_tracking_events" ON public.smtp_tracking_events;
CREATE POLICY "Approved users can manage smtp_tracking_events" ON public.smtp_tracking_events
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- state_cities
DROP POLICY IF EXISTS "Auth users can delete state_cities" ON public.state_cities;
DROP POLICY IF EXISTS "Auth users can insert state_cities" ON public.state_cities;
DROP POLICY IF EXISTS "Auth users can update state_cities" ON public.state_cities;
CREATE POLICY "Approved users can manage state_cities" ON public.state_cities
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- university_api_keys (sensitive — secrets)
DROP POLICY IF EXISTS "Auth users can delete university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Auth users can insert university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Auth users can update university_api_keys" ON public.university_api_keys;
CREATE POLICY "Approved users can manage university_api_keys" ON public.university_api_keys
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- template_versions
DROP POLICY IF EXISTS "Auth users can manage template_versions" ON public.template_versions;
CREATE POLICY "Approved users can manage template_versions" ON public.template_versions
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- team_members
DROP POLICY IF EXISTS "Authenticated users can manage team_members" ON public.team_members;
CREATE POLICY "Approved users can manage team_members" ON public.team_members
FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

-- 3) Lock down SECURITY DEFINER functions — revoke EXECUTE from anon/public
-- Trigger functions should not be callable by anyone via PostgREST
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Authorization helpers — auth users only, not anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_permission(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_user_approved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_permissions(uuid) FROM PUBLIC, anon;

-- Counter / mutation helpers used by backend/edge functions — revoke from anon
REVOKE EXECUTE ON FUNCTION public.increment_batch_success(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_batch_fail(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_batch_duplicate(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_automation_fail(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_automation_success(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_automation_triggered(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_landing_page_submission(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_lead_score(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_api_daily_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_short_code_available(varchar) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_short_code_available(varchar, varchar) FROM PUBLIC, anon;

-- NOTE: increment_url_clicks(uuid) intentionally remains anon-callable
-- because the index.html fast-redirect script (anon) calls it for click tracking.
