-- Schedule a weekly cron job that calls the refresh-roles-and-status edge
-- function. For each orgnr in company_follows, the function:
--   1. Fetches current roles and status from BRREG
--   2. Compares against company_roles_cache and company_status_cache
--   3. Creates notifications for followers when something changed
--
-- Weekly (Monday 04:00 UTC) is a good compromise: bankruptcies should be
-- flagged within a few days, but role changes are not urgent enough for
-- daily polling.

-- Extensions are enabled by the previous schedule migration, but include
-- guards for safety in case this runs on a fresh project.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('refresh-roles-and-status-weekly');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'refresh-roles-and-status-weekly',
  '0 4 * * 1',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/refresh-roles-and-status',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('trigger', 'cron'),
      timeout_milliseconds := 600000
    );
  $cron$
);

-- Manual trigger from SQL Editor:
--   SELECT net.http_post(
--     url := 'https://<ref>.supabase.co/functions/v1/refresh-roles-and-status',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <anon-or-service-role>'),
--     body := '{}'::jsonb
--   );
