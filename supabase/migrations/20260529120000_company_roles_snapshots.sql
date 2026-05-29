-- Daily snapshots of Brønnøysund roles per company, used by the jobbytte_diff
-- job to detect leader/board role changes day-over-day. One row per
-- (orgnr, snapshot_date); the daily job upserts on that key.
-- NOTE: table was created live in prod on 2026-05-29; IF NOT EXISTS keeps this
-- migration idempotent so it can run cleanly against fresh environments.

CREATE TABLE IF NOT EXISTS public.company_roles_snapshots (
  orgnr         text        NOT NULL,
  snapshot_date date        NOT NULL DEFAULT CURRENT_DATE,
  roles         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (orgnr, snapshot_date)
);

COMMENT ON TABLE public.company_roles_snapshots IS
  'Daily snapshots of Brreg roles per company, used for diffing job changes';

-- Written to only by the service-role daily job; no client access.
ALTER TABLE public.company_roles_snapshots ENABLE ROW LEVEL SECURITY;
