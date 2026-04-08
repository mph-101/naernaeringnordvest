
CREATE TABLE public.article_company_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  orgnr TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(article_id, orgnr)
);

ALTER TABLE public.article_company_tags ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_article_company_tags_orgnr ON public.article_company_tags(orgnr);
CREATE INDEX idx_article_company_tags_article ON public.article_company_tags(article_id);

CREATE POLICY "Anyone can view tags for published articles"
ON public.article_company_tags
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.articles WHERE articles.id = article_company_tags.article_id AND articles.published = true
));

CREATE POLICY "Staff can manage article company tags"
ON public.article_company_tags
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'journalist')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor') OR public.has_role(auth.uid(), 'journalist')
);
