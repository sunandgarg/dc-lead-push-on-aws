update public.universities
set
  api_timeout_seconds = 90,
  default_push_concurrency = 2
where name ilike 'CTPL%';
