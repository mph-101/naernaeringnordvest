-- Fix: prevent duplicate article_mention notifications when company tags
-- are re-synced on a published article (editor does DELETE + INSERT on
-- every save, which re-triggers trg_notify_article_tag).
--
-- Adds a NOT EXISTS guard so we only insert a notification when one
-- doesn't already exist for the same user + article + orgnr.

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
   WHERE cf.orgnr = NEW.orgnr
     AND NOT EXISTS (
       SELECT 1 FROM public.notifications n
        WHERE n.user_id = cf.user_id
          AND n.type = 'article_mention'
          AND n.orgnr = NEW.orgnr
          AND n.payload->>'article_id' = NEW.article_id::text
     );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
