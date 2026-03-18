
CREATE TABLE public.article_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id uuid REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

ALTER TABLE public.article_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes" ON public.article_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes" ON public.article_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON public.article_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON public.article_notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_article_notes_updated_at
  BEFORE UPDATE ON public.article_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
