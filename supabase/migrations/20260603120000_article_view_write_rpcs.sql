-- Security review 2026-06-03, finding #3.
--
-- The "Anyone can update own session view" policy used USING (true) /
-- WITH CHECK (true), so ANY caller could UPDATE ANY article_views row
-- (read_seconds, scroll_depth, completed) — there was no ownership check,
-- because anonymous rows have no auth.uid() to bind to.
--
-- Fix: route writes through SECURITY DEFINER RPCs and drop the open UPDATE
-- policy. The session_id (a random id the client keeps in localStorage) acts
-- as a capability: you can only mutate a row if you present BOTH its id and
-- the session_id it was created with. user_id is taken from auth.uid()
-- server-side rather than trusted from the client.
--
-- Side benefit: the insert RPC returns the new id even to anonymous callers.
-- A direct INSERT ... RETURNING could not, because anon has no SELECT policy
-- on article_views, so anonymous engagement (read time / scroll) was never
-- being recorded before.

-- ----------------------------------------------------------------------------
-- 1) Insert a view, return its id (works for anon via SECURITY DEFINER).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_article_view(
  _article_id text,
  _session_id text,
  _referrer_host text DEFAULT NULL,
  _device_type text DEFAULT NULL,
  _region_slug text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF _article_id IS NULL OR _article_id = ''
     OR _session_id IS NULL OR _session_id = '' THEN
    RAISE EXCEPTION 'article_id and session_id are required';
  END IF;

  INSERT INTO public.article_views (
    article_id, session_id, user_id, referrer_host, device_type, region_slug
  )
  VALUES (
    _article_id, _session_id, auth.uid(), _referrer_host, _device_type, _region_slug
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2) Extend an existing view, guarded by (id, session_id).
--    Values are monotonic (GREATEST / OR) so a caller can only grow their own
--    row, never rewrite it downward.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_article_view(
  _id uuid,
  _session_id text,
  _read_seconds integer,
  _scroll_depth numeric,
  _completed boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.article_views
  SET read_seconds = GREATEST(read_seconds, COALESCE(_read_seconds, read_seconds)),
      scroll_depth = GREATEST(scroll_depth, COALESCE(_scroll_depth, scroll_depth)),
      completed    = completed OR COALESCE(_completed, false)
  WHERE id = _id
    AND session_id = _session_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3) Lock down execution and remove the permissive UPDATE policy.
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.log_article_view(text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_article_view(text, text, text, text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.update_article_view(uuid, text, integer, numeric, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.update_article_view(uuid, text, integer, numeric, boolean) TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can update own session view" ON public.article_views;
