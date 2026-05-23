-- Live-stream registry. Each row corresponds to a Cloudflare Stream
-- Live Input. RTMPS-url and stream-key are sensitive (anyone with them
-- can push video as if they were the journalist), so they're only
-- exposed to the owner via a separate view.
--
-- The base table allows anonymous SELECT but only of safe columns. The
-- "stream key" columns are NULL in any query that doesn't run as the
-- owner — enforced via the live_streams_public_view (no policy) plus
-- a column-level deny via a SECURITY DEFINER function for owner reads.
--
-- For Phase 2 MVP we keep things simple: full-row SELECT is restricted
-- to the owner, and a separate view exposes safe columns publicly.

CREATE TABLE IF NOT EXISTS public.live_streams (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider             text NOT NULL DEFAULT 'cloudflare',
  provider_input_uid   text NOT NULL,            -- Cloudflare Live Input UID
  rtmps_url            text,                     -- sensitive, owner-only
  stream_key           text,                     -- sensitive, owner-only
  playback_id          text NOT NULL,            -- safe to expose
  title                text,
  description          text,
  status               text NOT NULL DEFAULT 'idle' CHECK (status IN ('idle','live','ended','disabled')),
  scheduled_at         timestamptz,
  started_at           timestamptz,
  ended_at             timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_user
  ON public.live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_live
  ON public.live_streams(status) WHERE status = 'live';

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Owners can do everything with their own streams
CREATE POLICY "Owners can read own streams"
  ON public.live_streams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own streams"
  ON public.live_streams FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete own streams"
  ON public.live_streams FOR DELETE
  USING (auth.uid() = user_id);

-- Public view exposes only safe columns. No RLS on views; the underlying
-- query runs with the view-creator privileges, but since we manually
-- omit rtmps_url and stream_key, those never leak.
CREATE OR REPLACE VIEW public.live_streams_public AS
SELECT id, user_id, provider, playback_id, title, description, status,
       scheduled_at, started_at, ended_at, created_at
  FROM public.live_streams;

-- Grant SELECT on the view to anon and authenticated roles. Service-role
-- has access by default.
GRANT SELECT ON public.live_streams_public TO anon, authenticated;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_live_streams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_live_streams ON public.live_streams;
CREATE TRIGGER trg_touch_live_streams
BEFORE UPDATE ON public.live_streams
FOR EACH ROW EXECUTE FUNCTION public.touch_live_streams_updated_at();
