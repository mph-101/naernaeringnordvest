-- Soft paywall: free premium-article allowance per rolling 90 days.
--
-- Limits (decided with Magnus, 2026-05-24):
--   - Authenticated user: 3 free premium articles per rolling 90 days
--   - Anonymous (visitor_id from cookie): 1 free per rolling 90 days
--
-- Re-visiting an already-granted article does NOT count again. This is
-- enforced by the partial unique indexes on (user_id, article_id) and
-- (visitor_id, article_id).
--
-- check-article-access writes a row here when it gives free access, and
-- counts rows from the past 90 days when deciding whether the next read
-- should be free or preview.

CREATE TABLE IF NOT EXISTS public.premium_article_grants (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_id  text,                                       -- cookie-based, anon
  article_id  text NOT NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((user_id IS NOT NULL) OR (visitor_id IS NOT NULL))
);

-- Re-visit dedup. We can't put both columns in one unique index because one
-- side is always NULL, so we use partial indexes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_grants_user_article_unique
  ON public.premium_article_grants (user_id, article_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_grants_visitor_article_unique
  ON public.premium_article_grants (visitor_id, article_id)
  WHERE visitor_id IS NOT NULL;

-- Used by check-article-access to count grants in the rolling window
CREATE INDEX IF NOT EXISTS idx_premium_grants_user_recent
  ON public.premium_article_grants (user_id, granted_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_premium_grants_visitor_recent
  ON public.premium_article_grants (visitor_id, granted_at DESC)
  WHERE visitor_id IS NOT NULL;

-- RLS: only service_role writes. Reads also restricted to service_role
-- so we don't leak reading patterns. The edge function does all work.
ALTER TABLE public.premium_article_grants ENABLE ROW LEVEL SECURITY;
-- No policies = no anon/authenticated access. Service role bypasses RLS.
