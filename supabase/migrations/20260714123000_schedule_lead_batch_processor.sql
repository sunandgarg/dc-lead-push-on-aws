-- Run due scheduled lead batches every minute. The Edge Function itself only
-- selects upload_batches where status='scheduled', scheduled_at <= now(), and
-- is_cancelled=false, so repeated cron invocation is safe and idempotent.
DO $$
DECLARE
  existing_job bigint;
BEGIN
  SELECT jobid INTO existing_job
  FROM cron.job
  WHERE jobname = 'process-scheduled-lead-batches'
  LIMIT 1;

  IF existing_job IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job);
  END IF;
END
$$;

SELECT cron.schedule(
  'process-scheduled-lead-batches',
  '* * * * *',
  $job$
    SELECT net.http_post(
      url := 'https://lxbcosppgjktydsbvamw.supabase.co/functions/v1/process-scheduled-batches',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $job$
);
