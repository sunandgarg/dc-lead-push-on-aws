-- Fix RLS policies to restrict to authenticated role only (not anon)
-- This prevents anonymous users from accessing data

-- Drop and recreate policies for api_logs
DROP POLICY IF EXISTS "Authenticated users can view api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Authenticated users can insert api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Authenticated users can update api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Authenticated users can delete api_logs" ON public.api_logs;

CREATE POLICY "Auth users can view api_logs" ON public.api_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert api_logs" ON public.api_logs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update api_logs" ON public.api_logs
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete api_logs" ON public.api_logs
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for course_specializations
DROP POLICY IF EXISTS "Authenticated users can view course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Authenticated users can insert course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Authenticated users can update course_specializations" ON public.course_specializations;
DROP POLICY IF EXISTS "Authenticated users can delete course_specializations" ON public.course_specializations;

CREATE POLICY "Auth users can view course_specializations" ON public.course_specializations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert course_specializations" ON public.course_specializations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update course_specializations" ON public.course_specializations
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete course_specializations" ON public.course_specializations
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for custom_column_values
DROP POLICY IF EXISTS "Authenticated users can view custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Authenticated users can insert custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Authenticated users can update custom_column_values" ON public.custom_column_values;
DROP POLICY IF EXISTS "Authenticated users can delete custom_column_values" ON public.custom_column_values;

CREATE POLICY "Auth users can view custom_column_values" ON public.custom_column_values
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert custom_column_values" ON public.custom_column_values
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update custom_column_values" ON public.custom_column_values
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete custom_column_values" ON public.custom_column_values
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for custom_columns
DROP POLICY IF EXISTS "Authenticated users can view custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Authenticated users can insert custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Authenticated users can update custom_columns" ON public.custom_columns;
DROP POLICY IF EXISTS "Authenticated users can delete custom_columns" ON public.custom_columns;

CREATE POLICY "Auth users can view custom_columns" ON public.custom_columns
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert custom_columns" ON public.custom_columns
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update custom_columns" ON public.custom_columns
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete custom_columns" ON public.custom_columns
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for leads
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;

CREATE POLICY "Auth users can view leads" ON public.leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for programs
DROP POLICY IF EXISTS "Authenticated users can view programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can insert programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can update programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can delete programs" ON public.programs;

CREATE POLICY "Auth users can view programs" ON public.programs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert programs" ON public.programs
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update programs" ON public.programs
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete programs" ON public.programs
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for state_cities
DROP POLICY IF EXISTS "Authenticated users can view state_cities" ON public.state_cities;
DROP POLICY IF EXISTS "Authenticated users can insert state_cities" ON public.state_cities;
DROP POLICY IF EXISTS "Authenticated users can update state_cities" ON public.state_cities;
DROP POLICY IF EXISTS "Authenticated users can delete state_cities" ON public.state_cities;

CREATE POLICY "Auth users can view state_cities" ON public.state_cities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert state_cities" ON public.state_cities
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update state_cities" ON public.state_cities
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete state_cities" ON public.state_cities
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for universities
DROP POLICY IF EXISTS "Authenticated users can view universities" ON public.universities;
DROP POLICY IF EXISTS "Authenticated users can insert universities" ON public.universities;
DROP POLICY IF EXISTS "Authenticated users can update universities" ON public.universities;
DROP POLICY IF EXISTS "Authenticated users can delete universities" ON public.universities;

CREATE POLICY "Auth users can view universities" ON public.universities
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert universities" ON public.universities
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update universities" ON public.universities
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete universities" ON public.universities
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for university_api_keys
DROP POLICY IF EXISTS "Authenticated users can view university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Authenticated users can insert university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Authenticated users can update university_api_keys" ON public.university_api_keys;
DROP POLICY IF EXISTS "Authenticated users can delete university_api_keys" ON public.university_api_keys;

CREATE POLICY "Auth users can view university_api_keys" ON public.university_api_keys
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert university_api_keys" ON public.university_api_keys
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update university_api_keys" ON public.university_api_keys
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete university_api_keys" ON public.university_api_keys
  FOR DELETE TO authenticated USING (true);

-- Drop and recreate policies for upload_batches
DROP POLICY IF EXISTS "Authenticated users can view upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Authenticated users can insert upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Authenticated users can update upload_batches" ON public.upload_batches;
DROP POLICY IF EXISTS "Authenticated users can delete upload_batches" ON public.upload_batches;

CREATE POLICY "Auth users can view upload_batches" ON public.upload_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert upload_batches" ON public.upload_batches
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update upload_batches" ON public.upload_batches
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete upload_batches" ON public.upload_batches
  FOR DELETE TO authenticated USING (true);

-- Update profiles policies to use authenticated role
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Update user_roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));