-- Reserve DLL capacity once per Edge Function batch instead of locking the
-- universities row once for every lead. This removes the main serialization
-- bottleneck while keeping the daily limit atomic.
CREATE OR REPLACE FUNCTION public.reserve_lead_push_capacity(
  p_university_id uuid,
  p_requested integer
)
RETURNS TABLE(allowed_count integer, current_count integer, daily_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uni_lim integer;
  cnt integer;
  reset_at date;
  global_cfg jsonb;
  global_locked boolean := false;
  global_cap integer;
  effective_lim integer;
  requested integer := GREATEST(COALESCE(p_requested, 0), 0);
  allowed integer;
BEGIN
  SELECT u.daily_lead_limit, u.daily_pushed_count, u.daily_count_reset_at
    INTO uni_lim, cnt, reset_at
  FROM public.universities u
  WHERE u.id = p_university_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0, 0, NULL::integer;
    RETURN;
  END IF;

  IF reset_at IS NULL OR reset_at < CURRENT_DATE THEN
    cnt := 0;
  END IF;

  BEGIN
    SELECT value::jsonb INTO global_cfg
    FROM public.app_settings
    WHERE key = 'dll_global_config';
    IF global_cfg IS NOT NULL THEN
      global_locked := COALESCE((global_cfg->>'admin_locked')::boolean, false);
      global_cap := NULLIF(global_cfg->>'max_daily_leads', '')::integer;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    global_locked := false;
  END;

  IF global_locked AND global_cap IS NOT NULL THEN
    effective_lim := CASE WHEN uni_lim IS NULL THEN global_cap ELSE LEAST(uni_lim, global_cap) END;
  ELSE
    effective_lim := uni_lim;
  END IF;

  allowed := CASE
    WHEN effective_lim IS NULL THEN requested
    ELSE LEAST(requested, GREATEST(effective_lim - cnt, 0))
  END;
  cnt := cnt + allowed;

  UPDATE public.universities
  SET daily_pushed_count = cnt,
      daily_count_reset_at = CURRENT_DATE
  WHERE id = p_university_id;

  RETURN QUERY SELECT allowed, cnt, effective_lim;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_lead_push_capacity(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_lead_push_capacity(uuid, integer) TO authenticated, service_role;

-- Persist a whole result wave in one transaction. Lead payloads and individual
-- partner responses are deliberately not stored.
CREATE OR REPLACE FUNCTION public.record_lead_push_batch_results(
  p_batch_id uuid,
  p_university_id uuid,
  p_source text,
  p_success integer,
  p_fail integer,
  p_duplicate integer,
  p_dll_blocked integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src text := COALESCE(NULLIF(p_source, ''), '');
  success_inc integer := GREATEST(COALESCE(p_success, 0), 0);
  fail_inc integer := GREATEST(COALESCE(p_fail, 0), 0);
  duplicate_inc integer := GREATEST(COALESCE(p_duplicate, 0), 0);
  dll_inc integer := GREATEST(COALESCE(p_dll_blocked, 0), 0);
  pushed_inc integer;
BEGIN
  pushed_inc := success_inc + fail_inc + duplicate_inc;

  IF p_batch_id IS NOT NULL THEN
    UPDATE public.upload_batches
    SET success_count = COALESCE(success_count, 0) + success_inc,
        fail_count = COALESCE(fail_count, 0) + fail_inc + dll_inc,
        duplicate_count = COALESCE(duplicate_count, 0) + duplicate_inc,
        processed_count = COALESCE(processed_count, 0) + pushed_inc + dll_inc,
        current_lead_index = COALESCE(current_lead_index, 0) + pushed_inc + dll_inc
    WHERE id = p_batch_id;
  END IF;

  IF p_university_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.lead_push_daily_stats
    (university_id, stat_date, source_label, pushed, success, failed, duplicate, other_error, dll_blocked)
  VALUES
    (p_university_id, CURRENT_DATE, src, pushed_inc, success_inc, fail_inc, duplicate_inc, 0, dll_inc)
  ON CONFLICT (university_id, stat_date, source_label) DO UPDATE SET
    pushed = lead_push_daily_stats.pushed + EXCLUDED.pushed,
    success = lead_push_daily_stats.success + EXCLUDED.success,
    failed = lead_push_daily_stats.failed + EXCLUDED.failed,
    duplicate = lead_push_daily_stats.duplicate + EXCLUDED.duplicate,
    dll_blocked = lead_push_daily_stats.dll_blocked + EXCLUDED.dll_blocked,
    updated_at = now();

  INSERT INTO public.lead_push_cumulative_stats
    (university_id, source_label, total_pushed, total_success, total_failed, total_duplicate,
     total_other_error, total_dll_blocked, first_pushed_at, last_pushed_at)
  VALUES
    (p_university_id, src, pushed_inc, success_inc, fail_inc, duplicate_inc, 0, dll_inc, now(), now())
  ON CONFLICT (university_id, source_label) DO UPDATE SET
    total_pushed = lead_push_cumulative_stats.total_pushed + EXCLUDED.total_pushed,
    total_success = lead_push_cumulative_stats.total_success + EXCLUDED.total_success,
    total_failed = lead_push_cumulative_stats.total_failed + EXCLUDED.total_failed,
    total_duplicate = lead_push_cumulative_stats.total_duplicate + EXCLUDED.total_duplicate,
    total_dll_blocked = lead_push_cumulative_stats.total_dll_blocked + EXCLUDED.total_dll_blocked,
    last_pushed_at = now(),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_lead_push_batch_results(uuid, uuid, text, integer, integer, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lead_push_batch_results(uuid, uuid, text, integer, integer, integer, integer)
  TO authenticated, service_role;
