-- Schedule a monthly cron job that calls the refresh-financials-cache edge
-- function. For each orgnr already in company_financials, the function will
-- re-query BRREG and upsert any newly filed regnskap. Existing years are
-- preserved (UPSERT with ON CONFLICT DO UPDATE), so the time series builds
-- up organically year-over-year.

-- Enable pg_cron and pg_net (idempotent — safe to re-run)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any previous version of this job before scheduling a new one,
-- so re-running this migration replaces the schedule cleanly.
DO $$
BEGIN
  PERFORM cron.unschedule('refresh-financials-cache-monthly');
EXCEPTION
  WHEN OTHERS THEN NULL; -- job did not exist yet, ignore
END $$;

-- Schedule: first day of every month at 03:00 UTC (~04:00 Norwegian winter
-- time / 05:00 summer time). Companies typically file annual accounts
-- between March and July, so monthly is plenty frequent.
SELECT cron.schedule(
  'refresh-financials-cache-monthly',
  '0 3 1 * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/refresh-financials-cache',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('trigger', 'cron'),
      timeout_milliseconds := 600000
    );
  $cron$
);

-- Note: This relies on two GUC settings being configured at the database level:
--   app.settings.supabase_url
--   app.settings.service_role_key
--
-- These are typically set by Supabase/Lovable Cloud automatically. If not,
-- they can be set with:
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres SET app.settings.service_role_key = '<service_role_jwt>';
--
-- To manually trigger a refresh (for testing) from SQL Editor:
--   SELECT net.http_post(
--     url := 'https://<ref>.supabase.co/functions/v1/refresh-financials-cache',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <service_role_jwt>'),
--     body := '{}'::jsonb
--   );
--
-- To inspect scheduled jobs:
--   SELECT * FROM cron.job WHERE jobname = 'refresh-financials-cache-monthly';
--
-- To see recent run history:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-financials-cache-monthly')
--   ORDER BY start_time DESC LIMIT 10;
