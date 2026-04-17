-- Tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE INDEX idx_tags_name_lower ON public.tags (lower(name));

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert tags"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  );

CREATE POLICY "Admins and editors can update tags"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
  );

CREATE POLICY "Admins can delete tags"
  ON public.tags FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Article ↔ Tag join table (article_id is text to match article_notes/article_company_tags pattern)
CREATE TABLE public.article_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id TEXT NOT NULL,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (article_id, tag_id)
);

CREATE INDEX idx_article_tags_article ON public.article_tags(article_id);
CREATE INDEX idx_article_tags_tag ON public.article_tags(tag_id);

ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view article tags"
  ON public.article_tags FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage article tags"
  ON public.article_tags FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  );

-- Helper: merge two tags (move all article links from source to target, then delete source)
CREATE OR REPLACE FUNCTION public.merge_tags(_source_id UUID, _target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be admin or editor
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role)) THEN
    RAISE EXCEPTION 'Insufficient privileges to merge tags';
  END IF;

  IF _source_id = _target_id THEN
    RAISE EXCEPTION 'Source and target tag must differ';
  END IF;

  -- Move article links, ignoring duplicates (composite unique on article_id + tag_id)
  INSERT INTO public.article_tags (article_id, tag_id, created_by)
  SELECT article_id, _target_id, created_by
  FROM public.article_tags
  WHERE tag_id = _source_id
  ON CONFLICT (article_id, tag_id) DO NOTHING;

  -- Remove the source tag (cascades remaining article_tags rows for source)
  DELETE FROM public.tags WHERE id = _source_id;
END;
$$;