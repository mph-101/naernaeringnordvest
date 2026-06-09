-- Section (category) administration RPCs.
--
-- `articles.category` is a denormalized TEXT field that mirrors
-- `categories.name` (see CLAUDE.md "Kjente fallgruver"). Renaming or merging a
-- section therefore has to rewrite that text across every affected article in
-- the same transaction as the change to the `categories` table. We do this in
-- SECURITY DEFINER functions so the bulk article rewrite is atomic and does not
-- depend on per-row RLS, mirroring the existing `merge_tags` pattern.

-- Rename a section: update the category row and propagate the new display name
-- to every article that referenced the old name.
CREATE OR REPLACE FUNCTION public.rename_category(
  _id uuid,
  _name text,
  _name_en text,
  _slug text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old_name text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges to rename a section';
  END IF;

  IF _name IS NULL OR btrim(_name) = '' THEN
    RAISE EXCEPTION 'Section name cannot be empty';
  END IF;

  SELECT name INTO _old_name FROM public.categories WHERE id = _id;
  IF _old_name IS NULL THEN
    RAISE EXCEPTION 'Section not found';
  END IF;

  UPDATE public.categories
    SET name = btrim(_name),
        name_en = NULLIF(btrim(coalesce(_name_en, '')), ''),
        slug = _slug
    WHERE id = _id;

  -- Keep the denormalized text on articles in sync with the new display name.
  IF _old_name IS DISTINCT FROM btrim(_name) THEN
    UPDATE public.articles SET category = btrim(_name) WHERE category = _old_name;
  END IF;
END;
$$;

-- Merge one or more sections into a target section: move every article from the
-- source sections onto the target's name, then delete the now-empty source rows.
-- Returns the number of articles that were reassigned.
CREATE OR REPLACE FUNCTION public.merge_categories(
  _target_id uuid,
  _source_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target_name text;
  _source_names text[];
  _moved integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges to merge sections';
  END IF;

  SELECT name INTO _target_name FROM public.categories WHERE id = _target_id;
  IF _target_name IS NULL THEN
    RAISE EXCEPTION 'Target section not found';
  END IF;

  -- Names of the sources, excluding the target itself for safety.
  SELECT array_agg(name) INTO _source_names
  FROM public.categories
  WHERE id = ANY(_source_ids) AND id <> _target_id;

  IF _source_names IS NULL OR array_length(_source_names, 1) IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.articles
    SET category = _target_name
    WHERE category = ANY(_source_names);
  GET DIAGNOSTICS _moved = ROW_COUNT;

  DELETE FROM public.categories
    WHERE id = ANY(_source_ids) AND id <> _target_id;

  RETURN _moved;
END;
$$;

-- These are privileged operations — only reachable by signed-in admins.
REVOKE EXECUTE ON FUNCTION public.rename_category(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.merge_categories(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_category(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merge_categories(uuid, uuid[]) TO authenticated;
