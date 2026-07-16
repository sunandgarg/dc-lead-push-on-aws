-- Add constraints that could not be declared in the historical recovery
-- migration because the referenced tables were created later in the chain.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communication_logs_automation_id_fkey') THEN
    ALTER TABLE public.communication_logs
      ADD CONSTRAINT communication_logs_automation_id_fkey
      FOREIGN KEY (automation_id) REFERENCES public.marketing_workflows(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'communication_logs_segment_id_fkey') THEN
    ALTER TABLE public.communication_logs
      ADD CONSTRAINT communication_logs_segment_id_fkey
      FOREIGN KEY (segment_id) REFERENCES public.lead_segments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'email_logs_template_id_fkey') THEN
    ALTER TABLE public.email_logs
      ADD CONSTRAINT email_logs_template_id_fkey
      FOREIGN KEY (template_id) REFERENCES public.email_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "Approved users can manage feature_toggles" ON public.feature_toggles;
CREATE POLICY "Approved users can manage feature_toggles"
ON public.feature_toggles FOR ALL TO authenticated
USING (public.is_user_approved(auth.uid()))
WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage smtp_config" ON public.smtp_config;
CREATE POLICY "Admins can manage smtp_config"
ON public.smtp_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can manage own ui_drafts" ON public.ui_drafts;
CREATE POLICY "Users can manage own ui_drafts"
ON public.ui_drafts FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
