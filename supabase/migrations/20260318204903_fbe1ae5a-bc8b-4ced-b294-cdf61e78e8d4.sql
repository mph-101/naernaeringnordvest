
ALTER TABLE public.article_notes DROP CONSTRAINT article_notes_article_id_fkey;
ALTER TABLE public.article_notes ALTER COLUMN article_id TYPE text USING article_id::text;
