-- Proveniens-endepunkt — infrastruktur (Trinn 3+4 av agent-metadata-oppgaven)
-- ======================================================================
-- To tabeller for det offentlige /article-provenance-endepunktet:
--
--   provenance_rate_limits - abuse-beskyttelse. Speiler tip_rate_limits:
--                            ip_hash (enveis-hash med service-role-salt) +
--                            teller + vindusstart. Kun service_role.
--   provenance_access_log  - instrumentering (Trinn 4): hvem (user-agent) henter
--                            hva (article_id, hvilke seksjoner, eksponeringsnivå),
--                            for å senere måle om agent-henvist trafikk
--                            konverterer til abonnement. PERSONVERNVENNLIG:
--                            ingen IP lagres her — IP finnes kun som flyktig
--                            hash i rate-limits, ikke i loggen.
--
-- Begge skrives kun av edge function (service_role). Loggen kan LESES av
-- redaksjonelle roller (for å se på agent-trafikken); rate-limits er helt lukket.

BEGIN;

-- ----------------------------------------------------------------------
-- 1. provenance_rate_limits — speiler tip_rate_limits
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provenance_rate_limits (
  ip_hash       text PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 1,
  window_start  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provenance_rate_limits ENABLE ROW LEVEL SECURITY;
-- Ingen policy = kun service_role (edge function). Som tip_rate_limits.

-- ----------------------------------------------------------------------
-- 2. provenance_access_log — instrumentering (ingen IP)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provenance_access_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  article_id  uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  user_agent  text,
  exposure    public.article_agent_exposure,
  sections    text[]               -- hvilke seksjoner endepunktet returnerte
);

CREATE INDEX IF NOT EXISTS idx_provenance_access_log_article
  ON public.provenance_access_log(article_id, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_provenance_access_log_time
  ON public.provenance_access_log(accessed_at DESC);

ALTER TABLE public.provenance_access_log ENABLE ROW LEVEL SECURITY;

-- Skrives kun av service_role (ingen INSERT-policy). Leses av redaksjonen for
-- å analysere agent-trafikk.
CREATE POLICY "Staff can read provenance access log"
  ON public.provenance_access_log FOR SELECT
  TO authenticated
  USING (public.has_editorial_role(auth.uid()));

-- ----------------------------------------------------------------------
-- 3. Retensjon: hold loggen flat (eneste tabellen som vokser uregulert)
-- ----------------------------------------------------------------------
-- Daglig sletting av rader eldre enn 90 dager. Ren SQL i cron-jobben — trenger
-- ingen edge function (i motsetning til barometer-refresh-mønsteret). Holder
-- lagringskostnaden konstant uansett agent-trafikk.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('provenance-log-retention');
EXCEPTION
  WHEN OTHERS THEN NULL; -- fantes ikke ennå, ignorer
END $$;

-- 03:30 UTC hver natt. Sletter gammel logg (90 dager) og rydder utløpte
-- rate-limit-vinduer (mange unike IP-er ved crawler-svermer → ellers vokser
-- også den tabellen). Rate-limit-rader eldre enn et døgn er uansett nullstilt.
SELECT cron.schedule(
  'provenance-log-retention',
  '30 3 * * *',
  $cron$
    DELETE FROM public.provenance_access_log
    WHERE accessed_at < now() - interval '90 days';
    DELETE FROM public.provenance_rate_limits
    WHERE window_start < now() - interval '1 day';
  $cron$
);

COMMIT;
