-- mr_companies: enriched directory of AS/ASA companies in Møre og Romsdal with
-- employee counts, so Spør can rank "largest employers" from our own database
-- instead of querying Brønnøysund live. Populated weekly by the
-- refresh-mr-employers edge function (pages enhetsregisteret per kommune).
--
-- Distinct from fylke15_companies, which is the lightweight membership set
-- (orgnr/navn only) for the jobbytte role-change sync.

CREATE TABLE IF NOT EXISTS public.mr_companies (
  orgnr           text        NOT NULL PRIMARY KEY,
  navn            text,
  kommunenummer   text,
  antall_ansatte  integer     NOT NULL DEFAULT 0,
  naeringsbeskriv text,
  refreshed_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mr_companies IS
  'AS/ASA companies in Møre og Romsdal with employee counts, for Spør largest-employers ranking. Refreshed weekly by refresh-mr-employers.';

-- Region-wide and per-kommune "largest by employees" both sort desc on ansatte.
CREATE INDEX IF NOT EXISTS mr_companies_ansatte_idx
  ON public.mr_companies (antall_ansatte DESC);
CREATE INDEX IF NOT EXISTS mr_companies_kommune_ansatte_idx
  ON public.mr_companies (kommunenummer, antall_ansatte DESC);

ALTER TABLE public.mr_companies ENABLE ROW LEVEL SECURITY;

-- Public, read-only company data → anyone may SELECT (Spør reads via the anon
-- key). Writes happen only via the service role (refresh-mr-employers), which
-- bypasses RLS; no client write policy is granted.
DROP POLICY IF EXISTS "mr_companies public read" ON public.mr_companies;
CREATE POLICY "mr_companies public read"
  ON public.mr_companies FOR SELECT
  USING (true);
