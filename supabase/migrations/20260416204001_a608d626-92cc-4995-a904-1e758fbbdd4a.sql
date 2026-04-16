CREATE TABLE public.fact_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  variant text NOT NULL DEFAULT 'rich' CHECK (variant IN ('rich', 'image', 'keyvalue')),
  body text,
  image_url text,
  image_caption text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  search_text text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_fact_boxes_search ON public.fact_boxes USING GIN (to_tsvector('simple', lower(search_text)));
CREATE INDEX idx_fact_boxes_tags ON public.fact_boxes USING GIN (tags);
CREATE INDEX idx_fact_boxes_updated_at ON public.fact_boxes (updated_at DESC);

-- Trigger som holder search_text oppdatert (mutable jsonb::text trenger trigger, ikke generated column)
CREATE OR REPLACE FUNCTION public.fact_boxes_refresh_search()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_text := coalesce(NEW.title, '') || ' ' ||
                     coalesce(NEW.body, '') || ' ' ||
                     coalesce(NEW.items::text, '') || ' ' ||
                     coalesce(array_to_string(NEW.tags, ' '), '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER fact_boxes_refresh_search_trigger
  BEFORE INSERT OR UPDATE ON public.fact_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.fact_boxes_refresh_search();

ALTER TABLE public.fact_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view fact boxes"
  ON public.fact_boxes FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR has_role(auth.uid(), 'journalist'::app_role)
  );

CREATE POLICY "Public can view fact boxes"
  ON public.fact_boxes FOR SELECT TO anon
  USING (true);

CREATE POLICY "Staff can insert fact boxes"
  ON public.fact_boxes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'editor'::app_role)
      OR has_role(auth.uid(), 'journalist'::app_role)
    )
  );

CREATE POLICY "Authors can update own fact boxes, staff can update all"
  ON public.fact_boxes FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR (auth.uid() = created_by AND has_role(auth.uid(), 'journalist'::app_role))
  );

CREATE POLICY "Authors can delete own fact boxes, staff can delete all"
  ON public.fact_boxes FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'editor'::app_role)
    OR (auth.uid() = created_by AND has_role(auth.uid(), 'journalist'::app_role))
  );

CREATE TRIGGER update_fact_boxes_updated_at
  BEFORE UPDATE ON public.fact_boxes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();