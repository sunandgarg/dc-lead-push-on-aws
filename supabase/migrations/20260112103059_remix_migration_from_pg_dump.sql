CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: increment_batch_fail(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_batch_fail(batch_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE upload_batches
  SET fail_count = fail_count + 1
  WHERE id = batch_uuid;
END;
$$;


--
-- Name: increment_batch_success(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_batch_success(batch_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE upload_batches
  SET success_count = success_count + 1
  WHERE id = batch_uuid;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: api_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    lead_id uuid,
    batch_id uuid,
    user_id text,
    application_no text,
    trigger_point text DEFAULT 'Lead Upload'::text,
    webhook_id text,
    data_push_type text DEFAULT 'Real Time'::text,
    email text,
    mobile text,
    form text,
    status text NOT NULL,
    response text,
    lead_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source text,
    medium text,
    campaign text
);


--
-- Name: course_specializations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_specializations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    course text NOT NULL,
    specialization text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_column_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_column_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    column_id uuid NOT NULL,
    value text NOT NULL,
    parent_column_id uuid,
    parent_value_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: custom_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    column_name text NOT NULL,
    column_key text NOT NULL,
    is_required boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    university_id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    mobile text NOT NULL,
    address text,
    state text,
    city text,
    course text,
    specialization text,
    lead_source text,
    lead_medium text,
    lead_campaign text,
    extra_data jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text,
    api_response text,
    retry_count integer DEFAULT 0,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: state_cities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.state_cities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    state text NOT NULL,
    city text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: universities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    api_url text NOT NULL,
    college_id text NOT NULL,
    secret_key text NOT NULL,
    source text DEFAULT 'dekhocampus'::text,
    medium text DEFAULT 'dekhocampus'::text,
    campaign text DEFAULT 'API'::text,
    api_type text DEFAULT 'nopaperforms'::text,
    leads_per_minute integer DEFAULT 5,
    column_mapping jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: upload_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    university_id uuid NOT NULL,
    file_name text NOT NULL,
    total_leads integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    fail_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text,
    csv_data text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: api_logs api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_pkey PRIMARY KEY (id);


--
-- Name: course_specializations course_specializations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_specializations
    ADD CONSTRAINT course_specializations_pkey PRIMARY KEY (id);


--
-- Name: custom_column_values custom_column_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_column_values
    ADD CONSTRAINT custom_column_values_pkey PRIMARY KEY (id);


--
-- Name: custom_columns custom_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_columns
    ADD CONSTRAINT custom_columns_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: state_cities state_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_cities
    ADD CONSTRAINT state_cities_pkey PRIMARY KEY (id);


--
-- Name: universities universities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universities
    ADD CONSTRAINT universities_pkey PRIMARY KEY (id);


--
-- Name: upload_batches upload_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_batches
    ADD CONSTRAINT upload_batches_pkey PRIMARY KEY (id);


--
-- Name: idx_api_logs_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_batch ON public.api_logs USING btree (batch_id);


--
-- Name: idx_api_logs_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_campaign ON public.api_logs USING btree (campaign);


--
-- Name: idx_api_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_created ON public.api_logs USING btree (created_at);


--
-- Name: idx_api_logs_medium; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_medium ON public.api_logs USING btree (medium);


--
-- Name: idx_api_logs_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_source ON public.api_logs USING btree (source);


--
-- Name: idx_api_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_status ON public.api_logs USING btree (status);


--
-- Name: idx_api_logs_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_university ON public.api_logs USING btree (university_id);


--
-- Name: idx_course_specializations_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_specializations_university ON public.course_specializations USING btree (university_id);


--
-- Name: idx_custom_column_values_column; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_column_values_column ON public.custom_column_values USING btree (column_id);


--
-- Name: idx_custom_column_values_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_column_values_parent ON public.custom_column_values USING btree (parent_value_id);


--
-- Name: idx_custom_column_values_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_column_values_university ON public.custom_column_values USING btree (university_id);


--
-- Name: idx_custom_columns_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_columns_university ON public.custom_columns USING btree (university_id);


--
-- Name: idx_leads_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_batch ON public.leads USING btree (batch_id);


--
-- Name: idx_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_status ON public.leads USING btree (status);


--
-- Name: idx_leads_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_university ON public.leads USING btree (university_id);


--
-- Name: idx_programs_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programs_university ON public.programs USING btree (university_id);


--
-- Name: idx_state_cities_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_state_cities_university ON public.state_cities USING btree (university_id);


--
-- Name: idx_upload_batches_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upload_batches_created ON public.upload_batches USING btree (created_at);


--
-- Name: idx_upload_batches_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upload_batches_created_at ON public.upload_batches USING btree (created_at DESC);


--
-- Name: idx_upload_batches_university; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upload_batches_university ON public.upload_batches USING btree (university_id);


--
-- Name: universities update_universities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_universities_updated_at BEFORE UPDATE ON public.universities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_logs api_logs_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.upload_batches(id) ON DELETE SET NULL;


--
-- Name: api_logs api_logs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: api_logs api_logs_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: course_specializations course_specializations_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_specializations
    ADD CONSTRAINT course_specializations_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: custom_column_values custom_column_values_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_column_values
    ADD CONSTRAINT custom_column_values_column_id_fkey FOREIGN KEY (column_id) REFERENCES public.custom_columns(id) ON DELETE CASCADE;


--
-- Name: custom_column_values custom_column_values_parent_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_column_values
    ADD CONSTRAINT custom_column_values_parent_column_id_fkey FOREIGN KEY (parent_column_id) REFERENCES public.custom_columns(id) ON DELETE SET NULL;


--
-- Name: custom_column_values custom_column_values_parent_value_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_column_values
    ADD CONSTRAINT custom_column_values_parent_value_id_fkey FOREIGN KEY (parent_value_id) REFERENCES public.custom_column_values(id) ON DELETE SET NULL;


--
-- Name: custom_column_values custom_column_values_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_column_values
    ADD CONSTRAINT custom_column_values_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: custom_columns custom_columns_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_columns
    ADD CONSTRAINT custom_columns_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: leads leads_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.upload_batches(id) ON DELETE CASCADE;


--
-- Name: leads leads_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: programs programs_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: state_cities state_cities_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.state_cities
    ADD CONSTRAINT state_cities_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: upload_batches upload_batches_university_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_batches
    ADD CONSTRAINT upload_batches_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;


--
-- Name: api_logs Allow public delete on api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on api_logs" ON public.api_logs FOR DELETE USING (true);


--
-- Name: course_specializations Allow public delete on course_specializations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on course_specializations" ON public.course_specializations FOR DELETE USING (true);


--
-- Name: custom_column_values Allow public delete on custom_column_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on custom_column_values" ON public.custom_column_values FOR DELETE USING (true);


--
-- Name: custom_columns Allow public delete on custom_columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on custom_columns" ON public.custom_columns FOR DELETE USING (true);


--
-- Name: leads Allow public delete on leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on leads" ON public.leads FOR DELETE USING (true);


--
-- Name: programs Allow public delete on programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on programs" ON public.programs FOR DELETE USING (true);


--
-- Name: state_cities Allow public delete on state_cities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on state_cities" ON public.state_cities FOR DELETE USING (true);


--
-- Name: universities Allow public delete on universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on universities" ON public.universities FOR DELETE USING (true);


--
-- Name: upload_batches Allow public delete on upload_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete on upload_batches" ON public.upload_batches FOR DELETE USING (true);


--
-- Name: api_logs Allow public insert on api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on api_logs" ON public.api_logs FOR INSERT WITH CHECK (true);


--
-- Name: course_specializations Allow public insert on course_specializations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on course_specializations" ON public.course_specializations FOR INSERT WITH CHECK (true);


--
-- Name: custom_column_values Allow public insert on custom_column_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on custom_column_values" ON public.custom_column_values FOR INSERT WITH CHECK (true);


--
-- Name: custom_columns Allow public insert on custom_columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on custom_columns" ON public.custom_columns FOR INSERT WITH CHECK (true);


--
-- Name: leads Allow public insert on leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on leads" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: programs Allow public insert on programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on programs" ON public.programs FOR INSERT WITH CHECK (true);


--
-- Name: state_cities Allow public insert on state_cities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on state_cities" ON public.state_cities FOR INSERT WITH CHECK (true);


--
-- Name: universities Allow public insert on universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on universities" ON public.universities FOR INSERT WITH CHECK (true);


--
-- Name: upload_batches Allow public insert on upload_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert on upload_batches" ON public.upload_batches FOR INSERT WITH CHECK (true);


--
-- Name: api_logs Allow public read on api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on api_logs" ON public.api_logs FOR SELECT USING (true);


--
-- Name: course_specializations Allow public read on course_specializations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on course_specializations" ON public.course_specializations FOR SELECT USING (true);


--
-- Name: custom_column_values Allow public read on custom_column_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on custom_column_values" ON public.custom_column_values FOR SELECT USING (true);


--
-- Name: custom_columns Allow public read on custom_columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on custom_columns" ON public.custom_columns FOR SELECT USING (true);


--
-- Name: leads Allow public read on leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on leads" ON public.leads FOR SELECT USING (true);


--
-- Name: programs Allow public read on programs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on programs" ON public.programs FOR SELECT USING (true);


--
-- Name: state_cities Allow public read on state_cities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on state_cities" ON public.state_cities FOR SELECT USING (true);


--
-- Name: universities Allow public read on universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on universities" ON public.universities FOR SELECT USING (true);


--
-- Name: upload_batches Allow public read on upload_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read on upload_batches" ON public.upload_batches FOR SELECT USING (true);


--
-- Name: api_logs Allow public update on api_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update on api_logs" ON public.api_logs FOR UPDATE USING (true);


--
-- Name: custom_column_values Allow public update on custom_column_values; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update on custom_column_values" ON public.custom_column_values FOR UPDATE USING (true);


--
-- Name: custom_columns Allow public update on custom_columns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update on custom_columns" ON public.custom_columns FOR UPDATE USING (true);


--
-- Name: leads Allow public update on leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update on leads" ON public.leads FOR UPDATE USING (true);


--
-- Name: universities Allow public update on universities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update on universities" ON public.universities FOR UPDATE USING (true);


--
-- Name: upload_batches Allow public update on upload_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update on upload_batches" ON public.upload_batches FOR UPDATE USING (true);


--
-- Name: api_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: course_specializations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_specializations ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_column_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_column_values ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

--
-- Name: state_cities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.state_cities ENABLE ROW LEVEL SECURITY;

--
-- Name: universities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

--
-- Name: upload_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;