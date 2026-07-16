
-- 1. DLL columns on universities
ALTER TABLE public.universities
  ADD COLUMN IF NOT EXISTS daily_lead_limit integer,
  ADD COLUMN IF NOT EXISTS daily_pushed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_count_reset_at date NOT NULL DEFAULT CURRENT_DATE;

-- 2. Source label on batches + leads + api_logs
ALTER TABLE public.upload_batches ADD COLUMN IF NOT EXISTS source_label text;
ALTER TABLE public.api_logs ADD COLUMN IF NOT EXISTS source_label text;
CREATE INDEX IF NOT EXISTS idx_upload_batches_source_label ON public.upload_batches (source_label);
CREATE INDEX IF NOT EXISTS idx_api_logs_source_label ON public.api_logs (source_label);

-- 3. Daily stats rollup
CREATE TABLE IF NOT EXISTS public.lead_push_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  stat_date date NOT NULL DEFAULT CURRENT_DATE,
  source_label text NOT NULL DEFAULT '',
  pushed integer NOT NULL DEFAULT 0,
  success integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  duplicate integer NOT NULL DEFAULT 0,
  other_error integer NOT NULL DEFAULT 0,
  dll_blocked integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, stat_date, source_label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_push_daily_stats TO authenticated;
GRANT ALL ON public.lead_push_daily_stats TO service_role;
ALTER TABLE public.lead_push_daily_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can manage lead_push_daily_stats"
  ON public.lead_push_daily_stats FOR ALL TO authenticated
  USING (public.is_user_approved(auth.uid()))
  WITH CHECK (public.is_user_approved(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_lpds_uni_date ON public.lead_push_daily_stats (university_id, stat_date DESC);

-- 4. Cumulative stats
CREATE TABLE IF NOT EXISTS public.lead_push_cumulative_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL,
  source_label text NOT NULL DEFAULT '',
  total_pushed bigint NOT NULL DEFAULT 0,
  total_success bigint NOT NULL DEFAULT 0,
  total_failed bigint NOT NULL DEFAULT 0,
  total_duplicate bigint NOT NULL DEFAULT 0,
  total_other_error bigint NOT NULL DEFAULT 0,
  total_dll_blocked bigint NOT NULL DEFAULT 0,
  first_pushed_at timestamptz,
  last_pushed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, source_label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_push_cumulative_stats TO authenticated;
GRANT ALL ON public.lead_push_cumulative_stats TO service_role;
ALTER TABLE public.lead_push_cumulative_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users can manage lead_push_cumulative_stats"
  ON public.lead_push_cumulative_stats FOR ALL TO authenticated
  USING (public.is_user_approved(auth.uid()))
  WITH CHECK (public.is_user_approved(auth.uid()));
CREATE INDEX IF NOT EXISTS idx_lpcs_uni ON public.lead_push_cumulative_stats (university_id);

-- 5. Upsert function
CREATE OR REPLACE FUNCTION public.upsert_lead_push_stat(
  p_university_id uuid,
  p_source text,
  p_status text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s text := COALESCE(NULLIF(p_source, ''), '');
  st text := lower(COALESCE(p_status, 'fail'));
  push_inc int := 1;
  succ_inc int := 0;
  fail_inc int := 0;
  dup_inc int := 0;
  other_inc int := 0;
  dll_inc int := 0;
BEGIN
  IF st = 'success' THEN succ_inc := 1;
  ELSIF st = 'duplicate' THEN dup_inc := 1;
  ELSIF st = 'dll_blocked' THEN dll_inc := 1; push_inc := 0;
  ELSIF st = 'fail' OR st = 'failed' THEN fail_inc := 1;
  ELSE other_inc := 1; fail_inc := 1;
  END IF;

  INSERT INTO public.lead_push_daily_stats
    (university_id, stat_date, source_label, pushed, success, failed, duplicate, other_error, dll_blocked)
  VALUES
    (p_university_id, CURRENT_DATE, s, push_inc, succ_inc, fail_inc, dup_inc, other_inc, dll_inc)
  ON CONFLICT (university_id, stat_date, source_label) DO UPDATE SET
    pushed = lead_push_daily_stats.pushed + EXCLUDED.pushed,
    success = lead_push_daily_stats.success + EXCLUDED.success,
    failed = lead_push_daily_stats.failed + EXCLUDED.failed,
    duplicate = lead_push_daily_stats.duplicate + EXCLUDED.duplicate,
    other_error = lead_push_daily_stats.other_error + EXCLUDED.other_error,
    dll_blocked = lead_push_daily_stats.dll_blocked + EXCLUDED.dll_blocked,
    updated_at = now();

  INSERT INTO public.lead_push_cumulative_stats
    (university_id, source_label, total_pushed, total_success, total_failed, total_duplicate, total_other_error, total_dll_blocked, first_pushed_at, last_pushed_at)
  VALUES
    (p_university_id, s, push_inc, succ_inc, fail_inc, dup_inc, other_inc, dll_inc, now(), now())
  ON CONFLICT (university_id, source_label) DO UPDATE SET
    total_pushed = lead_push_cumulative_stats.total_pushed + EXCLUDED.total_pushed,
    total_success = lead_push_cumulative_stats.total_success + EXCLUDED.total_success,
    total_failed = lead_push_cumulative_stats.total_failed + EXCLUDED.total_failed,
    total_duplicate = lead_push_cumulative_stats.total_duplicate + EXCLUDED.total_duplicate,
    total_other_error = lead_push_cumulative_stats.total_other_error + EXCLUDED.total_other_error,
    total_dll_blocked = lead_push_cumulative_stats.total_dll_blocked + EXCLUDED.total_dll_blocked,
    last_pushed_at = now(),
    updated_at = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.upsert_lead_push_stat(uuid, text, text) TO authenticated, service_role;

-- 6. Atomic DLL check + reserve
CREATE OR REPLACE FUNCTION public.check_and_reserve_dll(p_university_id uuid)
RETURNS TABLE (allowed boolean, current_count integer, daily_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lim integer;
  cnt integer;
  reset_at date;
BEGIN
  SELECT daily_lead_limit, daily_pushed_count, daily_count_reset_at
    INTO lim, cnt, reset_at
  FROM public.universities WHERE id = p_university_id FOR UPDATE;

  IF reset_at IS NULL OR reset_at < CURRENT_DATE THEN
    cnt := 0;
    UPDATE public.universities
      SET daily_pushed_count = 0, daily_count_reset_at = CURRENT_DATE
      WHERE id = p_university_id;
  END IF;

  IF lim IS NULL OR cnt < lim THEN
    UPDATE public.universities
      SET daily_pushed_count = daily_pushed_count + 1
      WHERE id = p_university_id
      RETURNING daily_pushed_count INTO cnt;
    RETURN QUERY SELECT true, cnt, lim;
  ELSE
    RETURN QUERY SELECT false, cnt, lim;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_and_reserve_dll(uuid) TO authenticated, service_role;
