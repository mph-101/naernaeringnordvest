-- Supporting tables for the hybrid jobbytte detector.
--
-- fylke15_companies: the membership set of AS/ASA/SA orgnr in Møre og Romsdal,
-- refreshed by the weekly full sync. The daily incremental run intersects the
-- national Brreg updates feed against this set to find which companies in the
-- county changed, so it only fetches roles for those.
--
-- jobbytte_state: small key/value store for the incremental cursor
-- (last processed Brreg oppdateringsid).
--
-- Both are written to only by the service-role daily/weekly job; no client
-- access, so RLS is enabled with no policies.

CREATE TABLE IF NOT EXISTS public.fylke15_companies (
  orgnr        text        NOT NULL PRIMARY KEY,
  navn         text,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fylke15_companies IS
  'AS/ASA/SA companies in Møre og Romsdal (fylke 15), refreshed by the weekly full jobbytte sync';

ALTER TABLE public.fylke15_companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.jobbytte_state (
  key        text        NOT NULL PRIMARY KEY,
  value      text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.jobbytte_state IS
  'Key/value state for the jobbytte detector, e.g. last_oppdateringsid cursor';

ALTER TABLE public.jobbytte_state ENABLE ROW LEVEL SECURITY;
