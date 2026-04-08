
-- Drop policies that depend on article_id
DROP POLICY IF EXISTS "Anyone can view tags for published articles" ON public.article_company_tags;
DROP POLICY IF EXISTS "Staff can manage article company tags" ON public.article_company_tags;

-- Drop FK if exists
ALTER TABLE public.article_company_tags DROP CONSTRAINT IF EXISTS article_company_tags_article_id_fkey;

-- Change column type
ALTER TABLE public.article_company_tags ALTER COLUMN article_id TYPE text USING article_id::text;

-- Recreate policies
CREATE POLICY "Anyone can view tags for published articles"
ON public.article_company_tags FOR SELECT TO public
USING (true);

CREATE POLICY "Staff can manage article company tags"
ON public.article_company_tags FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'journalist'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'journalist'::app_role));
