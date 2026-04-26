-- Comments table
CREATE TABLE public.article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  user_id uuid NOT NULL,
  parent_comment_id uuid REFERENCES public.article_comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'deleted')),
  moderated_by uuid,
  moderation_reason text,
  moderated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_article_comments_article ON public.article_comments(article_id, created_at DESC);
CREATE INDEX idx_article_comments_user ON public.article_comments(user_id);
CREATE INDEX idx_article_comments_parent ON public.article_comments(parent_comment_id);

ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

-- Helper: who can moderate
CREATE OR REPLACE FUNCTION public.can_moderate_comments(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role)
      OR has_role(_user_id, 'editor'::app_role)
      OR has_role(_user_id, 'journalist'::app_role);
$$;

-- Comments policies
CREATE POLICY "Anyone can view published comments"
  ON public.article_comments FOR SELECT
  USING (status = 'published');

CREATE POLICY "Authors can view own comments"
  ON public.article_comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all comments"
  ON public.article_comments FOR SELECT
  USING (public.can_moderate_comments(auth.uid()));

CREATE POLICY "Authenticated users can create comments"
  ON public.article_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'published');

CREATE POLICY "Authors can update own comments"
  ON public.article_comments FOR UPDATE
  USING (auth.uid() = user_id AND status = 'published')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Moderators can update any comment"
  ON public.article_comments FOR UPDATE
  USING (public.can_moderate_comments(auth.uid()))
  WITH CHECK (public.can_moderate_comments(auth.uid()));

CREATE POLICY "Authors can delete own comments"
  ON public.article_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can delete any comment"
  ON public.article_comments FOR DELETE
  USING (public.can_moderate_comments(auth.uid()));

-- updated_at trigger
CREATE TRIGGER update_article_comments_updated_at
  BEFORE UPDATE ON public.article_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reports table
CREATE TABLE public.article_comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.article_comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);

CREATE INDEX idx_comment_reports_status ON public.article_comment_reports(status, created_at DESC);
CREATE INDEX idx_comment_reports_comment ON public.article_comment_reports(comment_id);

ALTER TABLE public.article_comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters can view own reports"
  ON public.article_comment_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Moderators can view all reports"
  ON public.article_comment_reports FOR SELECT
  USING (public.can_moderate_comments(auth.uid()));

CREATE POLICY "Authenticated users can submit reports"
  ON public.article_comment_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can update reports"
  ON public.article_comment_reports FOR UPDATE
  USING (public.can_moderate_comments(auth.uid()))
  WITH CHECK (public.can_moderate_comments(auth.uid()));

CREATE TRIGGER update_comment_reports_updated_at
  BEFORE UPDATE ON public.article_comment_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.article_comments;