
-- SECURITY HARDENING: Fix all permissive RLS policies
-- Change public role to authenticated role

-- 1. ab_test_results: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage ab_test_results" ON public.ab_test_results;
CREATE POLICY "Authenticated users can manage ab_test_results"
  ON public.ab_test_results FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 2. communication_logs: public -> authenticated  
DROP POLICY IF EXISTS "Auth users can manage communication_logs" ON public.communication_logs;
CREATE POLICY "Authenticated users can manage communication_logs"
  ON public.communication_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 3. crm_activities: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Auth users can insert crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Auth users can update crm_activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Auth users can delete crm_activities" ON public.crm_activities;
CREATE POLICY "Authenticated users can select crm_activities" ON public.crm_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crm_activities" ON public.crm_activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update crm_activities" ON public.crm_activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete crm_activities" ON public.crm_activities FOR DELETE TO authenticated USING (true);

-- 4. crm_contacts: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Auth users can insert crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Auth users can update crm_contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Auth users can delete crm_contacts" ON public.crm_contacts;
CREATE POLICY "Authenticated users can select crm_contacts" ON public.crm_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crm_contacts" ON public.crm_contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update crm_contacts" ON public.crm_contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete crm_contacts" ON public.crm_contacts FOR DELETE TO authenticated USING (true);

-- 5. crm_tasks: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Auth users can insert crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Auth users can update crm_tasks" ON public.crm_tasks;
DROP POLICY IF EXISTS "Auth users can delete crm_tasks" ON public.crm_tasks;
CREATE POLICY "Authenticated users can select crm_tasks" ON public.crm_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crm_tasks" ON public.crm_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update crm_tasks" ON public.crm_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete crm_tasks" ON public.crm_tasks FOR DELETE TO authenticated USING (true);

-- 6. custom_domains: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view custom_domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Auth users can insert custom_domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Auth users can update custom_domains" ON public.custom_domains;
DROP POLICY IF EXISTS "Auth users can delete custom_domains" ON public.custom_domains;
CREATE POLICY "Authenticated users can select custom_domains" ON public.custom_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert custom_domains" ON public.custom_domains FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update custom_domains" ON public.custom_domains FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete custom_domains" ON public.custom_domains FOR DELETE TO authenticated USING (true);

-- 7. dlt_entities: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view dlt_entities" ON public.dlt_entities;
DROP POLICY IF EXISTS "Auth users can insert dlt_entities" ON public.dlt_entities;
DROP POLICY IF EXISTS "Auth users can update dlt_entities" ON public.dlt_entities;
DROP POLICY IF EXISTS "Auth users can delete dlt_entities" ON public.dlt_entities;
CREATE POLICY "Authenticated users can select dlt_entities" ON public.dlt_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert dlt_entities" ON public.dlt_entities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update dlt_entities" ON public.dlt_entities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete dlt_entities" ON public.dlt_entities FOR DELETE TO authenticated USING (true);

-- 8. form_submissions: keep public insert for form embedding
DROP POLICY IF EXISTS "Auth users can view form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Auth users can insert form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Auth users can update form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Auth users can delete form_submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Anyone can submit forms" ON public.form_submissions;
CREATE POLICY "Authenticated users can select form_submissions" ON public.form_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert form_submissions" ON public.form_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update form_submissions" ON public.form_submissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete form_submissions" ON public.form_submissions FOR DELETE TO authenticated USING (true);

-- 9. lead_assignment_history: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage lead_assignment_history" ON public.lead_assignment_history;
CREATE POLICY "Authenticated users can manage lead_assignment_history" ON public.lead_assignment_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. lead_assignment_rules: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage lead_assignment_rules" ON public.lead_assignment_rules;
CREATE POLICY "Authenticated users can manage lead_assignment_rules" ON public.lead_assignment_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. lead_capture_forms: public read for active, authenticated manage
DROP POLICY IF EXISTS "Auth users can view lead_capture_forms" ON public.lead_capture_forms;
DROP POLICY IF EXISTS "Auth users can insert lead_capture_forms" ON public.lead_capture_forms;
DROP POLICY IF EXISTS "Auth users can update lead_capture_forms" ON public.lead_capture_forms;
DROP POLICY IF EXISTS "Auth users can delete lead_capture_forms" ON public.lead_capture_forms;
DROP POLICY IF EXISTS "Anyone can view active lead_capture_forms" ON public.lead_capture_forms;
CREATE POLICY "Anyone can view active forms" ON public.lead_capture_forms FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage lead_capture_forms" ON public.lead_capture_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. lead_events: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view lead_events" ON public.lead_events;
DROP POLICY IF EXISTS "Auth users can insert lead_events" ON public.lead_events;
DROP POLICY IF EXISTS "Auth users can update lead_events" ON public.lead_events;
DROP POLICY IF EXISTS "Auth users can delete lead_events" ON public.lead_events;
CREATE POLICY "Authenticated users can manage lead_events" ON public.lead_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. lead_preferences: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view lead_preferences" ON public.lead_preferences;
DROP POLICY IF EXISTS "Auth users can insert lead_preferences" ON public.lead_preferences;
DROP POLICY IF EXISTS "Auth users can update lead_preferences" ON public.lead_preferences;
DROP POLICY IF EXISTS "Auth users can delete lead_preferences" ON public.lead_preferences;
CREATE POLICY "Authenticated users can manage lead_preferences" ON public.lead_preferences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 14. lead_score_history: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage lead_score_history" ON public.lead_score_history;
CREATE POLICY "Authenticated users can manage lead_score_history" ON public.lead_score_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. lead_scoring_rules: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage lead_scoring_rules" ON public.lead_scoring_rules;
CREATE POLICY "Authenticated users can manage lead_scoring_rules" ON public.lead_scoring_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 16. lead_segment_members: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage lead_segment_members" ON public.lead_segment_members;
CREATE POLICY "Authenticated users can manage lead_segment_members" ON public.lead_segment_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 17. lead_segments: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage lead_segments" ON public.lead_segments;
CREATE POLICY "Authenticated users can manage lead_segments" ON public.lead_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 18. marketing_custom_integrations: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage marketing_custom_integrations" ON public.marketing_custom_integrations;
CREATE POLICY "Authenticated users can manage marketing_custom_integrations" ON public.marketing_custom_integrations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 19. marketing_sequence_steps: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage marketing_sequence_steps" ON public.marketing_sequence_steps;
CREATE POLICY "Authenticated users can manage marketing_sequence_steps" ON public.marketing_sequence_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 20. marketing_sequences: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage marketing_sequences" ON public.marketing_sequences;
CREATE POLICY "Authenticated users can manage marketing_sequences" ON public.marketing_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 21. marketing_workflows: public -> authenticated
DROP POLICY IF EXISTS "Auth users can manage marketing_workflows" ON public.marketing_workflows;
CREATE POLICY "Authenticated users can manage marketing_workflows" ON public.marketing_workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 22. pipeline_stages: public -> authenticated
DROP POLICY IF EXISTS "Auth users can view pipeline_stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Auth users can insert pipeline_stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Auth users can update pipeline_stages" ON public.pipeline_stages;
DROP POLICY IF EXISTS "Auth users can delete pipeline_stages" ON public.pipeline_stages;
CREATE POLICY "Authenticated users can manage pipeline_stages" ON public.pipeline_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
