-- Notify user-followers when a journalist's article transitions to
-- published. Mirrors the company-follower trigger from the previous
-- iteration. articles.id is uuid and articles.created_by is uuid; no
-- text-cast needed for user_follows joins.

CREATE OR REPLACE FUNCTION public.notify_user_followers_on_article_publish()
RETURNS TRIGGER AS $$
DECLARE
  v_display_name text;
BEGIN
  -- Only on transition NULL -> NOT NULL
  IF OLD.published_at IS NOT NULL OR NEW.published_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.created_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_display_name
    FROM public.profiles
   WHERE user_id = NEW.created_by;

  INSERT INTO public.notifications (user_id, type, orgnr, company_name, payload)
  SELECT uf.follower_id,
         'user_article',
         NULL,
         NULL,
         jsonb_build_object(
           'article_id', NEW.id::text,
           'title',      NEW.title,
           'by_user_id', NEW.created_by::text,
           'by_display_name', v_display_name
         )
    FROM public.user_follows uf
   WHERE uf.followee_id = NEW.created_by;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_user_article_publish ON public.articles;
CREATE TRIGGER trg_notify_user_article_publish
AFTER UPDATE OF published_at ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.notify_user_followers_on_article_publish();
