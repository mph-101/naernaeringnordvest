-- Journalist-profil-fundament (Fase 1):
--   1. Utvid profiles med journalist-felter (username, bio, title, beat,
--      contact_email, social_urls). Alle nullable så vanlige brukere
--      ikke påvirkes.
--   2. Ny user_follows-tabell (speil av company_follows-mønsteret).
--   3. Utvid notifications.type CHECK med tre nye typer
--      (user_article, user_group_message, user_stream_start) og gjør
--      orgnr nullable siden ikke-selskaps-varsler ikke har et orgnr.

-- ----------------------------------------------------------------------
-- 1. Utvid profiles
-- ----------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username       text,
  ADD COLUMN IF NOT EXISTS bio            text,
  ADD COLUMN IF NOT EXISTS title          text,
  ADD COLUMN IF NOT EXISTS beat           text,
  ADD COLUMN IF NOT EXISTS contact_email  text,
  ADD COLUMN IF NOT EXISTS social_urls    jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Case-insensitive unique index on username (when present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- ----------------------------------------------------------------------
-- 2. user_follows
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_follows (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  follower_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON public.user_follows(followee_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can read follows (count of followers, follow lists)
CREATE POLICY "Anyone can read user_follows"
  ON public.user_follows FOR SELECT
  USING (true);

-- Users can follow / unfollow only as themselves
CREATE POLICY "Users can follow others as themselves"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow as themselves"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ----------------------------------------------------------------------
-- 3. Utvid notifications.type CHECK + orgnr nullable
-- ----------------------------------------------------------------------
ALTER TABLE public.notifications
  ALTER COLUMN orgnr DROP NOT NULL;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'article_mention',
    'financials_new',
    'roles_changed',
    'status_changed',
    'user_article',
    'user_group_message',
    'user_stream_start'
  ));
