-- Notify user-followers when a journalist posts in a PUBLIC group with
-- members-visibility. Private groups, admins-only or author-only posts
-- are skipped so we do not leak otherwise-restricted content via the
-- notification feed.

CREATE OR REPLACE FUNCTION public.notify_user_followers_on_group_message()
RETURNS TRIGGER AS $$
DECLARE
  v_group_visibility text;
  v_group_name       text;
  v_display_name     text;
BEGIN
  -- Skip explicitly restricted visibilities. NULL/empty visibility is
  -- treated as 'members' (default).
  IF NEW.visibility IS NOT NULL AND NEW.visibility <> 'members' THEN
    RETURN NEW;
  END IF;

  SELECT visibility, name
    INTO v_group_visibility, v_group_name
    FROM public.groups
   WHERE id = NEW.group_id;

  IF v_group_visibility IS DISTINCT FROM 'public' THEN
    -- Private/invite-only group: no public fan-out
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_display_name
    FROM public.profiles
   WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, orgnr, company_name, payload)
  SELECT uf.follower_id,
         'user_group_message',
         NULL,
         NULL,
         jsonb_build_object(
           'group_id', NEW.group_id::text,
           'group_name', v_group_name,
           'message_id', NEW.id::text,
           'snippet', substring(NEW.content for 200),
           'by_user_id', NEW.user_id::text,
           'by_display_name', v_display_name
         )
    FROM public.user_follows uf
   WHERE uf.followee_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_user_group_message ON public.group_messages;
CREATE TRIGGER trg_notify_user_group_message
AFTER INSERT ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_user_followers_on_group_message();
