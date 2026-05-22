-- Fix: notification triggers compared articles.id (uuid) with
-- article_company_tags.article_id (text). Postgres rejects implicit casts
-- between uuid and text, so any article PATCH that triggered the publish-
-- trigger errored out with:
--   "operator does not exist: text = uuid"
-- and rolled the whole UPDATE back, which surfaced as a 404 in PostgREST
-- (because the rowcount of the failed UPDATE was 0).
--
-- Fix: cast articles.id::text on both sides of the comparison and in the
-- jsonb payload, so the trigger functions are tolerant to either column
-- type. The CREATE OR REPLACE keeps the existing trigger objects pointed
-- at the same function names.

CREATE OR REPLACE FUNCTION public.notify_followers_of_article_tag()
RETURNS TRIGGER AS $$
DECLARE
  v_title          text;
  v_published_at   timestamptz;
BEGIN
  SELECT title, published_at
    INTO v_title, v_published_at
    FROM public.articles
   WHERE id::text = NEW.article_id;

  IF v_published_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, orgnr, company_name, payload)
  SELECT cf.user_id,
         'article_mention',
         NEW.orgnr,
         COALESCE(NEW.company_name, cf.company_name),
         jsonb_build_object('article_id', NEW.article_id, 'title', v_title)
    FROM public.company_follows cf
   WHERE cf.orgnr = NEW.orgnr;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


CREATE OR REPLACE FUNCTION public.notify_followers_on_article_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.published_at IS NOT NULL OR NEW.published_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, orgnr, company_name, payload)
  SELECT cf.user_id,
         'article_mention',
         act.orgnr,
         COALESCE(act.company_name, cf.company_name),
         jsonb_build_object('article_id', NEW.id::text, 'title', NEW.title)
    FROM public.article_company_tags act
    JOIN public.company_follows cf ON cf.orgnr = act.orgnr
   WHERE act.article_id = NEW.id::text;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
