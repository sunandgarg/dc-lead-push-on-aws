
-- Create automation_rules table
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  priority integer DEFAULT 1,
  status text DEFAULT 'Active',
  conditions jsonb DEFAULT '[]'::jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  retry_enabled boolean DEFAULT true,
  max_retries integer DEFAULT 2,
  retry_after text DEFAULT '5min',
  triggered_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage automation rules"
ON public.automation_rules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Create automation_logs table
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  lead_name text,
  rule_name text,
  university_name text,
  result text DEFAULT 'Pending',
  fail_reason text DEFAULT '',
  retry_count integer DEFAULT 0,
  lead_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage automation logs"
ON public.automation_logs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Add increment functions for automation rule counters
CREATE OR REPLACE FUNCTION public.increment_automation_triggered(rule_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE automation_rules
  SET triggered_count = triggered_count + 1, last_triggered_at = now()
  WHERE id = rule_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_automation_success(rule_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE automation_rules
  SET success_count = success_count + 1
  WHERE id = rule_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_automation_fail(rule_uuid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE automation_rules
  SET fail_count = fail_count + 1
  WHERE id = rule_uuid;
END;
$$;
