CREATE OR REPLACE FUNCTION public.check_and_reserve_dll(p_university_id uuid)
RETURNS TABLE(allowed boolean, current_count integer, daily_limit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uni_lim integer;
  cnt integer;
  reset_at date;
  global_cfg jsonb;
  global_locked boolean := false;
  global_cap integer;
  effective_lim integer;
BEGIN
  -- Per-university DLL state (atomic)
  SELECT daily_lead_limit, daily_pushed_count, daily_count_reset_at
    INTO uni_lim, cnt, reset_at
  FROM public.universities WHERE id = p_university_id FOR UPDATE;

  IF reset_at IS NULL OR reset_at < CURRENT_DATE THEN
    cnt := 0;
    UPDATE public.universities
      SET daily_pushed_count = 0, daily_count_reset_at = CURRENT_DATE
      WHERE id = p_university_id;
  END IF;

  -- Read global DLL cap from app_settings (admin-enforced)
  BEGIN
    SELECT value::jsonb INTO global_cfg FROM public.app_settings WHERE key = 'dll_global_config';
    IF global_cfg IS NOT NULL THEN
      global_locked := COALESCE((global_cfg->>'admin_locked')::boolean, false);
      global_cap := NULLIF(global_cfg->>'max_daily_leads','')::integer;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    global_locked := false;
  END;

  -- Effective limit = LEAST(per-uni, global) when global is locked; else per-uni
  IF global_locked AND global_cap IS NOT NULL THEN
    IF uni_lim IS NULL THEN effective_lim := global_cap;
    ELSE effective_lim := LEAST(uni_lim, global_cap); END IF;
  ELSE
    effective_lim := uni_lim;
  END IF;

  IF effective_lim IS NULL OR cnt < effective_lim THEN
    UPDATE public.universities
      SET daily_pushed_count = daily_pushed_count + 1
      WHERE id = p_university_id
      RETURNING daily_pushed_count INTO cnt;
    RETURN QUERY SELECT true, cnt, effective_lim;
  ELSE
    RETURN QUERY SELECT false, cnt, effective_lim;
  END IF;
END;
$function$;