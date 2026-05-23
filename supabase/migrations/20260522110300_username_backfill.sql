-- Generate username for every existing journalist/contributor/editor that
-- doesn't already have one. Slugifies display_name and appends -2, -3, ...
-- on conflict.
--
-- Idempotent: re-running this migration only assigns usernames to users
-- whose username column is still NULL.

CREATE OR REPLACE FUNCTION public.slugify_display_name(input text)
RETURNS text AS $$
DECLARE
  s text;
BEGIN
  IF input IS NULL OR length(trim(input)) = 0 THEN
    RETURN NULL;
  END IF;
  -- Lowercase, strip diacritics-ish (Norwegian-specific transliteration),
  -- collapse non-alphanumerics into a single hyphen, trim hyphens, limit 30.
  s := lower(input);
  s := replace(s, 'æ', 'ae');
  s := replace(s, 'ø', 'o');
  s := replace(s, 'å', 'a');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := regexp_replace(s, '^-+|-+$', '', 'g');
  s := substring(s for 30);
  IF length(s) < 2 THEN
    RETURN NULL;
  END IF;
  RETURN s;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
DECLARE
  rec        RECORD;
  base_slug  text;
  candidate  text;
  n          integer;
BEGIN
  FOR rec IN
    SELECT p.user_id, p.display_name
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
     WHERE p.username IS NULL
       AND ur.role IN ('journalist', 'contributor', 'editor')
  LOOP
    base_slug := public.slugify_display_name(rec.display_name);
    IF base_slug IS NULL THEN
      CONTINUE;  -- no usable display_name to seed from
    END IF;

    candidate := base_slug;
    n := 1;
    -- Bump suffix until we find an unused username (case-insensitive)
    WHILE EXISTS (
      SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)
    ) LOOP
      n := n + 1;
      candidate := base_slug || '-' || n::text;
    END LOOP;

    UPDATE public.profiles SET username = candidate WHERE user_id = rec.user_id;
  END LOOP;
END $$;
