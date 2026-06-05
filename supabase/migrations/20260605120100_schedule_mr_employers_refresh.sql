-- Weekly cron that calls the refresh-mr-employers edge function, which repopulates
-- mr_companies (AS/ASA in Møre og Romsdal + employee counts) from Brønnøysund.
-- Same pattern as 20260604110000_schedule_barometer_refresh.sql (pg_cron + pg_net
-- + GUC-based service-role call).
--
-- NOTE: requires the refresh-mr-employers edge function deployed first, and the
-- GUCs app.settings.supabase_url / app.settings.service_role_key set (same as the
-- other scheduled refreshers).

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('refresh-mr-employers-weekly');
EXCEPTION
  WHEN OTHERS THEN NULL; -- job did not exist yet, ignore
END $$;

-- Sundays 03:00 UTC. Employee counts change slowly, so weekly is ample.
SELECT cron.schedule(
  'refresh-mr-employers-weekly',
  '0 3 * * 0',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/refresh-mr-employers',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('trigger', 'cron'),
      timeout_milliseconds := 600000
    );
  $cron$
);

-- Manual backfill / test from the SQL Editor:
--   SELECT net.http_post(
--     url := 'https://<ref>.supabase.co/functions/v1/refresh-mr-employers',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <service_role_jwt>'),
--     body := '{}'::jsonb
--   );
--
-- Inspect: SELECT * FROM cron.job WHERE jobname = 'refresh-mr-employers-weekly';
