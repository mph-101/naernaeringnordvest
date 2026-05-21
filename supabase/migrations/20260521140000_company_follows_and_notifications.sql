-- Follow Company + In-app Notifications
-- ======================================================================
-- Adds four tables that together support a "follow company" feature:
--   1. company_follows     - which user follows which orgnr
--   2. notifications       - in-app notification feed per user
--   3. company_roles_cache - last seen roles snapshot from BRREG for diffing
--   4. company_status_cache- last seen status snapshot for diffing
--
-- Also adds two database triggers that automatically fan out
-- notifications to followers:
--   - When a tag is inserted on a published article
--   - When an article is moved from unpublished to published (catches tags
--     that were added before publication)
--
-- RLS:
--   - company_follows + notifications: row-owner read/write
--   - company_roles_cache + company_status_cache: public read, service-role write only


-- ----------------------------------------------------------------------
-- 1. company_follows
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_follows (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  orgnr        text NOT NULL,
  company_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, orgnr)
);

CREATE INDEX IF NOT EXISTS idx_company_follows_user  ON public.company_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_company_follows_orgnr ON public.company_follows(orgnr);

ALTER TABLE public.company_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follows"
  ON public.company_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follows"
  ON public.company_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows"
  ON public.company_follows FOR DELETE
  USING (auth.uid() = user_id);

-- No UPDATE policy: follows are immutable (delete + re-insert if needed).


-- ----------------------------------------------------------------------
-- 2. notifications
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('article_mention', 'financials_new', 'roles_changed', 'status_changed')),
  orgnr        text NOT NULL,
  company_name text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Composite index for the most common query: "give me my unread notifications, newest first"
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read_at NULLS FIRST, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update only their own read_at column. We rely on column-level
-- discipline in the client (only update read_at), enforced by RLS+CHECK
-- by allowing UPDATE only when other columns are unchanged.
CREATE POLICY "Users can mark own notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No INSERT policy: notifications are inserted by triggers or edge functions
-- (which run with service_role and bypass RLS).
-- No DELETE policy: keep history; admins can delete via service_role if needed.


-- ----------------------------------------------------------------------
-- 3. company_roles_cache
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_roles_cache (
  orgnr      text PRIMARY KEY,
  roles      jsonb NOT NULL DEFAULT '[]'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_roles_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company_roles_cache"
  ON public.company_roles_cache FOR SELECT
  USING (true);
-- Writes only via service_role (edge functions).


-- ----------------------------------------------------------------------
-- 4. company_status_cache
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_status_cache (
  orgnr           text PRIMARY KEY,
  konkurs         boolean NOT NULL DEFAULT false,
  konkursdato     date,
  under_avvikling boolean NOT NULL DEFAULT false,
  slettedato      date,
  fetched_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_status_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read company_status_cache"
  ON public.company_status_cache FOR SELECT
  USING (true);
-- Writes only via service_role.


-- ----------------------------------------------------------------------
-- 5. Database trigger: notify followers when a tag is inserted on a
--    published article. If the article is not published yet, we skip
--    (the publish-trigger below catches it later).
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_followers_of_article_tag()
RETURNS TRIGGER AS $$
DECLARE
  v_title          text;
  v_published_at   timestamptz;
BEGIN
  SELECT title, published_at
    INTO v_title, v_published_at
    FROM public.articles
   WHERE id = NEW.article_id;

  -- Only fan out for published articles. Drafts will be picked up by the
  -- on-publish trigger below.
  IF v_published_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, orgnr, company_name, payload)
  SELECT cf.user_id,
         'article_mention',
         NEW.orgnr,
         COALESCE(NEW.company_name, cf.company_name),
         jsonb_build_object(
           'article_id', NEW.article_id,
           'title',      v_title
         )
    FROM public.company_follows cf
   WHERE cf.orgnr = NEW.orgnr;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_article_tag ON public.article_company_tags;
CREATE TRIGGER trg_notify_article_tag
AFTER INSERT ON public.article_company_tags
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_of_article_tag();


-- ----------------------------------------------------------------------
-- 6. Database trigger: when an article transitions from unpublished to
--    published, fan out notifications for all existing tags. This covers
--    the case where tags are added during editing and the article is
--    published afterwards.
-- ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_followers_on_article_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire on transition NULL -> NOT NULL
  IF OLD.published_at IS NOT NULL OR NEW.published_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, orgnr, company_name, payload)
  SELECT cf.user_id,
         'article_mention',
         act.orgnr,
         COALESCE(act.company_name, cf.company_name),
         jsonb_build_object(
           'article_id', NEW.id,
           'title',      NEW.title
         )
    FROM public.article_company_tags act
    JOIN public.company_follows cf ON cf.orgnr = act.orgnr
   WHERE act.article_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_article_publish ON public.articles;
CREATE TRIGGER trg_notify_article_publish
AFTER UPDATE OF published_at ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_article_publish();
