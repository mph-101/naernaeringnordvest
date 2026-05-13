
-- Article revision history table
CREATE TABLE public.article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL,
  revision_number integer NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  body_diff_summary text,
  change_note text,
  word_count integer NOT NULL DEFAULT 0,
  changed_by uuid,
  changed_by_name text,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id, revision_number)
);

CREATE INDEX idx_article_revisions_article_id ON public.article_revisions(article_id, revision_number DESC);

ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view revisions of published articles"
ON public.article_revisions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.articles a WHERE a.id = article_revisions.article_id AND a.published = true)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'journalist'::app_role)
);

CREATE POLICY "Staff can insert revisions"
ON public.article_revisions FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'journalist'::app_role)
);
