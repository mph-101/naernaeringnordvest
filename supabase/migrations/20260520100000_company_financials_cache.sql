-- Cache for BRREG regnskapsdata.
-- BRREG only returns the latest filing; this table accumulates history over time.

CREATE TABLE IF NOT EXISTS public.company_financials (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  orgnr       text    NOT NULL,
  year        text    NOT NULL,           -- e.g. "2023"
  omsetning   bigint  NOT NULL DEFAULT 0,
  driftsresultat bigint NOT NULL DEFAULT 0,
  arsresultat bigint  NOT NULL DEFAULT 0,
  egenkapital bigint  NOT NULL DEFAULT 0,
  sum_eiendeler bigint NOT NULL DEFAULT 0,
  fetched_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (orgnr, year)
);

-- Index for fast lookup by orgnr
CREATE INDEX IF NOT EXISTS idx_company_financials_orgnr ON public.company_financials (orgnr);

-- RLS: allow read for everyone, insert/update only via service role (edge functions)
ALTER TABLE public.company_financials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company_financials"
  ON public.company_financials FOR SELECT
  USING (true);

-- Edge functions use supabaseClient with service_role key, which bypasses RLS.
-- No INSERT/UPDATE policy needed for anon — only service role writes.
