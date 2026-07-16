
-- Tighten RLS policies: Replace USING(true) with is_user_approved check
-- This ensures only approved users can access data

-- Drop and recreate overly permissive policies on critical tables

-- crm_contacts
DROP POLICY IF EXISTS "Authenticated users can select crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Authenticated users can insert crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Authenticated users can update crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Authenticated users can delete crm_contacts" ON public.crm_contacts;

CREATE POLICY "Approved users can select crm_contacts" ON public.crm_contacts FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can insert crm_contacts" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can update crm_contacts" ON public.crm_contacts FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can delete crm_contacts" ON public.crm_contacts FOR DELETE TO authenticated USING (public.is_user_approved(auth.uid()));

-- crm_activities
DROP POLICY IF EXISTS "Authenticated users can select crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Authenticated users can insert crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Authenticated users can update crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Authenticated users can delete crm_activities" ON public.crm_activities;

CREATE POLICY "Approved users can select crm_activities" ON public.crm_activities FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can insert crm_activities" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can update crm_activities" ON public.crm_activities FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can delete crm_activities" ON public.crm_activities FOR DELETE TO authenticated USING (public.is_user_approved(auth.uid()));

-- crm_tasks
DROP POLICY IF EXISTS "Authenticated users can select crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Authenticated users can update crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Authenticated users can delete crm_tasks" ON public.crm_tasks;

CREATE POLICY "Approved users can select crm_tasks" ON public.crm_tasks FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can insert crm_tasks" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can update crm_tasks" ON public.crm_tasks FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can delete crm_tasks" ON public.crm_tasks FOR DELETE TO authenticated USING (public.is_user_approved(auth.uid()));

-- api_logs
DROP POLICY IF EXISTS "Auth users can view api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Auth users can insert api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Auth users can update api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Auth users can delete api_logs" ON public.api_logs;

CREATE POLICY "Approved users can select api_logs" ON public.api_logs FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can insert api_logs" ON public.api_logs FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can update api_logs" ON public.api_logs FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can delete api_logs" ON public.api_logs FOR DELETE TO authenticated USING (public.is_user_approved(auth.uid()));

-- marketing_campaigns
DROP POLICY IF EXISTS "Auth users can manage marketing_campaigns" ON public.marketing_campaigns;
CREATE POLICY "Approved users can manage marketing_campaigns" ON public.marketing_campaigns FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- marketing_integrations
DROP POLICY IF EXISTS "Auth users can manage marketing_integrations" ON public.marketing_integrations;
CREATE POLICY "Approved users can manage marketing_integrations" ON public.marketing_integrations FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- marketing_workflows
DROP POLICY IF EXISTS "Authenticated users can manage marketing_workflows" ON public.marketing_workflows;
CREATE POLICY "Approved users can manage marketing_workflows" ON public.marketing_workflows FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- marketing_sequence_steps
DROP POLICY IF EXISTS "Authenticated users can manage marketing_sequence_steps" ON public.marketing_sequence_steps;
CREATE POLICY "Approved users can manage marketing_sequence_steps" ON public.marketing_sequence_steps FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- marketing_list_contacts
DROP POLICY IF EXISTS "Auth users can manage marketing_list_contacts" ON public.marketing_list_contacts;
CREATE POLICY "Approved users can manage marketing_list_contacts" ON public.marketing_list_contacts FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- campaign_recipients
DROP POLICY IF EXISTS "Auth users can manage campaign_recipients" ON public.campaign_recipients;
CREATE POLICY "Approved users can manage campaign_recipients" ON public.campaign_recipients FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- campaign_kpis
DROP POLICY IF EXISTS "Auth users can manage campaign_kpis" ON public.campaign_kpis;
CREATE POLICY "Approved users can manage campaign_kpis" ON public.campaign_kpis FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- ab_test_results
DROP POLICY IF EXISTS "Authenticated users can manage ab_test_results" ON public.ab_test_results;
CREATE POLICY "Approved users can manage ab_test_results" ON public.ab_test_results FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- email_events
DROP POLICY IF EXISTS "Auth users can manage email_events" ON public.email_events;
CREATE POLICY "Approved users can manage email_events" ON public.email_events FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- email_recipients
DROP POLICY IF EXISTS "Auth users can manage email_recipients" ON public.email_recipients;
CREATE POLICY "Approved users can manage email_recipients" ON public.email_recipients FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- lead_events (has duplicate policies)
DROP POLICY IF EXISTS "Auth users can manage lead_events" ON public.lead_events;
DROP POLICY IF EXISTS "Authenticated users can manage lead_events" ON public.lead_events;
CREATE POLICY "Approved users can manage lead_events" ON public.lead_events FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- lead_preferences (has duplicate policies)
DROP POLICY IF EXISTS "Auth users can manage lead_preferences" ON public.lead_preferences;
DROP POLICY IF EXISTS "Authenticated users can manage lead_preferences" ON public.lead_preferences;
CREATE POLICY "Approved users can manage lead_preferences" ON public.lead_preferences FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- lead_segments
DROP POLICY IF EXISTS "Authenticated users can manage lead_segments" ON public.lead_segments;
CREATE POLICY "Approved users can manage lead_segments" ON public.lead_segments FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- communication_logs
DROP POLICY IF EXISTS "Authenticated users can manage communication_logs" ON public.communication_logs;
CREATE POLICY "Approved users can manage communication_logs" ON public.communication_logs FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- sequence_enrollments
DROP POLICY IF EXISTS "Auth users can manage sequence_enrollments" ON public.sequence_enrollments;
CREATE POLICY "Approved users can manage sequence_enrollments" ON public.sequence_enrollments FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- sequence_step_executions
DROP POLICY IF EXISTS "Auth users can manage sequence_step_executions" ON public.sequence_step_executions;
CREATE POLICY "Approved users can manage sequence_step_executions" ON public.sequence_step_executions FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- workflow_executions
DROP POLICY IF EXISTS "Auth users can manage workflow_executions" ON public.workflow_executions;
CREATE POLICY "Approved users can manage workflow_executions" ON public.workflow_executions FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- custom_columns
DROP POLICY IF EXISTS "Auth users can view custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Auth users can insert custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Auth users can update custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Auth users can delete custom_columns" ON public.custom_columns;

CREATE POLICY "Approved users can select custom_columns" ON public.custom_columns FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can insert custom_columns" ON public.custom_columns FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can update custom_columns" ON public.custom_columns FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can delete custom_columns" ON public.custom_columns FOR DELETE TO authenticated USING (public.is_user_approved(auth.uid()));

-- custom_column_values
DROP POLICY IF EXISTS "Auth users can view custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Auth users can insert custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Auth users can update custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Auth users can delete custom_column_values" ON public.custom_column_values;

CREATE POLICY "Approved users can select custom_column_values" ON public.custom_column_values FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can insert custom_column_values" ON public.custom_column_values FOR INSERT TO authenticated WITH CHECK (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can update custom_column_values" ON public.custom_column_values FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can delete custom_column_values" ON public.custom_column_values FOR DELETE TO authenticated USING (public.is_user_approved(auth.uid()));

-- smtp_templates
DROP POLICY IF EXISTS "Allow authenticated access to smtp_templates" ON public.smtp_templates;
CREATE POLICY "Approved users can manage smtp_templates" ON public.smtp_templates FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- smtp_email_logs
DROP POLICY IF EXISTS "Allow authenticated access to smtp_email_logs" ON public.smtp_email_logs;
CREATE POLICY "Approved users can manage smtp_email_logs" ON public.smtp_email_logs FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- smtp_link_clicks
DROP POLICY IF EXISTS "Allow authenticated access to smtp_link_clicks" ON public.smtp_link_clicks;
CREATE POLICY "Approved users can manage smtp_link_clicks" ON public.smtp_link_clicks FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));

-- Also tighten form_submissions (keep public INSERT for anonymous form submissions)
DROP POLICY IF EXISTS "Auth users can manage form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated users can select form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated users can update form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated users can delete form_submissions" ON public.form_submissions;

CREATE POLICY "Approved users can select form_submissions" ON public.form_submissions FOR SELECT TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can update form_submissions" ON public.form_submissions FOR UPDATE TO authenticated USING (public.is_user_approved(auth.uid()));
CREATE POLICY "Approved users can delete form_submissions" ON public.form_submissions FOR DELETE TO authenticated USING (public.is_user_approved(auth.uid()));

-- lead_capture_forms (keep public SELECT for active forms)
DROP POLICY IF EXISTS "Auth users can manage lead_capture_forms" ON public.lead_capture_forms;
DROP POLICY IF EXISTS "Authenticated users can manage lead_capture_forms" ON public.lead_capture_forms;

CREATE POLICY "Approved users can manage lead_capture_forms" ON public.lead_capture_forms FOR ALL TO authenticated USING (public.is_user_approved(auth.uid())) WITH CHECK (public.is_user_approved(auth.uid()));
