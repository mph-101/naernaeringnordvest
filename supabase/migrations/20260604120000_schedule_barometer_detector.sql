-- Schedule a monthly cron job that runs the barometer avvik-detector.
-- It recomputes deviations from fresh SSB data and inserts `pending` rows into
-- barometer_signals (the godkjenningsstyrte review queue). Runs an hour after
-- barometer-refresh so any datapoint refresh has settled first.
--
-- mode=run makes the function INSERT (default mode=backtest only counts).
-- Thresholds are baked into the function (konkurser 20 %, etableringer 22 %,
-- omsetning 13 % — calibrated against 3-4 years of history) and can be tuned by
-- redeploying or overridden per-call via the request body.
--
-- NOTE: requires the `detect-barometer-signals` edge function to be deployed.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  PERFORM cron.unschedule('barometer-detect-signals-monthly');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6th of every month, 05:00 UTC (one hour after barometer-refresh-monthly).
SELECT cron.schedule(
  'barometer-detect-signals-monthly',
  '0 5 6 * *',
  $cron$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/detect-barometer-signals',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('mode', 'run', 'trigger', 'cron'),
      timeout_milliseconds := 600000
    );
  $cron$
);

-- Calibration (no insert): POST {"mode":"backtest"} — returns treff/år per
-- indikator so thresholds can be tuned. Inspect:
--   SELECT * FROM cron.job WHERE jobname = 'barometer-detect-signals-monthly';
