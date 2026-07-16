-- Fix 1: Replace permissive RLS policies on leads table with authenticated-only access
DROP POLICY IF EXISTS "Allow public read on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public update on leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public delete on leads" ON public.leads;

CREATE POLICY "Authenticated users can view leads"
ON public.leads FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert leads"
ON public.leads FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update leads"
ON public.leads FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete leads"
ON public.leads FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Fix 2: Replace permissive RLS policies on universities table with authenticated-only access
DROP POLICY IF EXISTS "Allow public read on universities" ON public.universities;
DROP POLICY IF EXISTS "Allow public insert on universities" ON public.universities;
DROP POLICY IF EXISTS "Allow public update on universities" ON public.universities;
DROP POLICY IF EXISTS "Allow public delete on universities" ON public.universities;

CREATE POLICY "Authenticated users can view universities"
ON public.universities FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert universities"
ON public.universities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update universities"
ON public.universities FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete universities"
ON public.universities FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Fix 3: Also secure api_logs, upload_batches, and other sensitive tables
DROP POLICY IF EXISTS "Allow public read on api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Allow public insert on api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Allow public update on api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Allow public delete on api_logs" ON public.api_logs;

CREATE POLICY "Authenticated users can view api_logs"
ON public.api_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert api_logs"
ON public.api_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update api_logs"
ON public.api_logs FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete api_logs"
ON public.api_logs FOR DELETE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public insert on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public update on upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Allow public delete on upload_batches" ON public.upload_batches;

CREATE POLICY "Authenticated users can view upload_batches"
ON public.upload_batches FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert upload_batches"
ON public.upload_batches FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update upload_batches"
ON public.upload_batches FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete upload_batches"
ON public.upload_batches FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Secure university_api_keys table
DROP POLICY IF EXISTS "Allow public read on university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Allow public insert on university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Allow public update on university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Allow public delete on university_api_keys" ON public.university_api_keys;

CREATE POLICY "Authenticated users can view university_api_keys"
ON public.university_api_keys FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert university_api_keys"
ON public.university_api_keys FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update university_api_keys"
ON public.university_api_keys FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete university_api_keys"
ON public.university_api_keys FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Secure other tables with PII/sensitive data
DROP POLICY IF EXISTS "Allow public read on course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Allow public insert on course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Allow public delete on course_specializations" ON public.course_specializations;

CREATE POLICY "Authenticated users can view course_specializations"
ON public.course_specializations FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert course_specializations"
ON public.course_specializations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update course_specializations"
ON public.course_specializations FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete course_specializations"
ON public.course_specializations FOR DELETE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read on custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Allow public insert on custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Allow public update on custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Allow public delete on custom_columns" ON public.custom_columns;

CREATE POLICY "Authenticated users can view custom_columns"
ON public.custom_columns FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert custom_columns"
ON public.custom_columns FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update custom_columns"
ON public.custom_columns FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete custom_columns"
ON public.custom_columns FOR DELETE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read on custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Allow public insert on custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Allow public update on custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Allow public delete on custom_column_values" ON public.custom_column_values;

CREATE POLICY "Authenticated users can view custom_column_values"
ON public.custom_column_values FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert custom_column_values"
ON public.custom_column_values FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update custom_column_values"
ON public.custom_column_values FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete custom_column_values"
ON public.custom_column_values FOR DELETE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read on state_cities" ON public.state_cities;
DROP POLICY IF EXISTS "Allow public insert on state_cities" ON public.state_cities;
DROP POLICY IF EXISTS "Allow public delete on state_cities" ON public.state_cities;

CREATE POLICY "Authenticated users can view state_cities"
ON public.state_cities FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert state_cities"
ON public.state_cities FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update state_cities"
ON public.state_cities FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete state_cities"
ON public.state_cities FOR DELETE
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Allow public read on programs" ON public.programs;
DROP POLICY IF EXISTS "Allow public insert on programs" ON public.programs;
DROP POLICY IF EXISTS "Allow public delete on programs" ON public.programs;

CREATE POLICY "Authenticated users can view programs"
ON public.programs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert programs"
ON public.programs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update programs"
ON public.programs FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete programs"
ON public.programs FOR DELETE
USING (auth.uid() IS NOT NULL);