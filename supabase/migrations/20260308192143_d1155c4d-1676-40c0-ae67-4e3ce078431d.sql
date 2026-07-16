
-- Batch 2: Tighten remaining tables (without url_click_events)

DROP POLICY IF EXISTS "Authenticated users can manage automation logs" ON public.automation_logs;
CREATE POLICY "Approved users can manage automation_logs" ON public.automation_logs FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage automation rules" ON public.automation_rules;
CREATE POLICY "Approved users can manage automation_rules" ON public.automation_rules FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can view course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Auth users can insert course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Auth users can update course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Auth users can delete course_specializations" ON public.course_specializations;
CREATE POLICY "Approved users can manage course_specializations" ON public.course_specializations FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can delete custom_domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Authenticated users can insert custom_domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Authenticated users can select custom_domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Authenticated users can update custom_domains" ON public.custom_domains;

DROP POLICY IF EXISTS "Auth users can manage dlt_entities" ON public.dlt_entities;
DROP POLICY IF EXISTS "Authenticated users can select dlt_entities" ON public.dlt_entities;
DROP POLICY IF EXISTS "Authenticated users can insert dlt_entities" ON public.dlt_entities;
DROP POLICY IF EXISTS "Authenticated users can update dlt_entities" ON public.dlt_entities;
DROP POLICY IF EXISTS "Authenticated users can delete dlt_entities" ON public.dlt_entities;
CREATE POLICY "Approved users can manage dlt_entities" ON public.dlt_entities FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage email_api_settings" ON public.email_api_settings;
CREATE POLICY "Approved users can manage email_api_settings" ON public.email_api_settings FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage email_campaigns" ON public.email_campaigns;
CREATE POLICY "Approved users can manage email_campaigns" ON public.email_campaigns FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage email_templates" ON public.email_templates;
CREATE POLICY "Approved users can manage email_templates" ON public.email_templates FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage lead_assignment_history" ON public.lead_assignment_history;
CREATE POLICY "Approved users can manage lead_assignment_history" ON public.lead_assignment_history FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage lead_assignment_rules" ON public.lead_assignment_rules;
CREATE POLICY "Approved users can manage lead_assignment_rules" ON public.lead_assignment_rules FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage lead_score_history" ON public.lead_score_history;
CREATE POLICY "Approved users can manage lead_score_history" ON public.lead_score_history FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage lead_scoring_rules" ON public.lead_scoring_rules;
CREATE POLICY "Approved users can manage lead_scoring_rules" ON public.lead_scoring_rules FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage lead_segment_members" ON public.lead_segment_members;
CREATE POLICY "Approved users can manage lead_segment_members" ON public.lead_segment_members FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage marketing_custom_integrations" ON public.marketing_custom_integrations;
CREATE POLICY "Approved users can manage marketing_custom_integrations" ON public.marketing_custom_integrations FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage marketing_leads" ON public.marketing_leads;
CREATE POLICY "Approved users can manage marketing_leads" ON public.marketing_leads FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage marketing_lists" ON public.marketing_lists;
CREATE POLICY "Approved users can manage marketing_lists" ON public.marketing_lists FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage marketing_sequences" ON public.marketing_sequences;
CREATE POLICY "Approved users can manage marketing_sequences" ON public.marketing_sequences FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage marketing_templates" ON public.marketing_templates;
CREATE POLICY "Approved users can manage marketing_templates" ON public.marketing_templates FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage marketing_unsubscribes" ON public.marketing_unsubscribes;
CREATE POLICY "Approved users can manage marketing_unsubscribes" ON public.marketing_unsubscribes FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Approved users can manage pipeline_stages" ON public.pipeline_stages FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Auth users can insert programs" ON public.programs;
DROP POLICY IF EXISTS "Auth users can update programs" ON public.programs;
DROP POLICY IF EXISTS "Auth users can delete programs" ON public.programs;
CREATE POLICY "Approved users can manage programs" ON public.programs FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Allow authenticated access to smtp_suppression_list" ON public.smtp_suppression_list;
CREATE POLICY "Approved users can manage smtp_suppression_list" ON public.smtp_suppression_list FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can insert batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Users can view own batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Users can update own batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Users can delete own batches" ON public.upload_batches;
CREATE POLICY "Approved users can manage upload_batches" ON public.upload_batches FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can delete universities" ON public.universities;
DROP POLICY IF EXISTS "Auth users can insert universities" ON public.universities;
DROP POLICY IF EXISTS "Auth users can update universities" ON public.universities;
DROP POLICY IF EXISTS "Auth users can view universities" ON public.universities;
CREATE POLICY "Approved users can manage universities" ON public.universities FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage url_api_keys" ON public.url_api_keys;
CREATE POLICY "Approved users can manage url_api_keys" ON public.url_api_keys FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Auth users can manage email_logs" ON public.email_logs;
CREATE POLICY "Approved users can manage email_logs" ON public.email_logs FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
CREATE POLICY "Approved users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));
