alter table public.universities
  add column if not exists api_timeout_seconds integer not null default 30,
  add column if not exists default_push_concurrency integer not null default 2;

alter table public.universities
  add constraint universities_api_timeout_seconds_check
    check (api_timeout_seconds between 5 and 300);

alter table public.universities
  add constraint universities_default_push_concurrency_check
    check (default_push_concurrency between 1 and 5);
