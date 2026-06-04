-- Schedule a monthly cron job that calls the barometer-refresh edge function.
-- It re-fetches the three SSB indicators (konkurser 08551 monthly, etableringer
-- 14623 yearly, omsetning 12937 yearly) for Møre og Romsdal and upserts
-- barometer_datapoints. Monthly cadence covers the most frequent series
-- (konkurser); the yearly series simply re-upsert unchanged most months.
--
-- Follows the same pattern as 20260521120000_schedule_financials_refresh.sql
-- (pg_cron + pg_net + GUC-based service-role call).
--
-- NOTE: requires the `barometer-refresh` edge function to be deployed first.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('barometer-refresh-monthly');
EXCEPTION
  WHEN OTHERS THEN NULL; -- job did not exist yet, ignore
END $$;

-- 6th of every month, 04:00 UTC. SSB publishes monthly konkurs figures
-- (08551) around the 5th, so the 6th picks up the freshest data.
SELECT cron.schedule(
  'barometer-refresh-monthly',
  '0 4 6 * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/barometer-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('trigger', 'cron'),
      timeout_milliseconds := 600000
    );
  $cron$
);

-- Manual trigger from SQL Editor (for testing):
--   SELECT net.http_post(
--     url := 'https://<ref>.supabase.co/functions/v1/barometer-refresh',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <service_role_jwt>'),
--     body := '{}'::jsonb
--   );
--
-- Inspect: SELECT * FROM cron.job WHERE jobname = 'barometer-refresh-monthly';
