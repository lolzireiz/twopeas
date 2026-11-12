-- Two Peas: the every-30-minutes timer for reminders, unlocks and countdowns.
-- Run this AFTER the notify function is deployed.
-- Replace YOUR-PROJECT-REF and YOUR-CRON-SECRET first (same secret you saved as CRON_SECRET).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('two-peas-tick') where exists (select 1 from cron.job where jobname = 'two-peas-tick');

select cron.schedule(
  'two-peas-tick',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR-CRON-SECRET'),
    body := '{"cron": true}'::jsonb
  );
  $$
);
