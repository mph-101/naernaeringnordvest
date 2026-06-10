-- F7 (security review 2026-06-10, decision: alternative a): per-key rate
-- limiting for feed-api. Window counter per API key, mirroring the
-- tip_rate_limits pattern.
CREATE TABLE public.api_key_rate_limits (
  key_id uuid PRIMARY KEY REFERENCES public.api_keys(id) ON DELETE CASCADE,
  request_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_key_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies: service-role only (edge function), like tip_rate_limits.
