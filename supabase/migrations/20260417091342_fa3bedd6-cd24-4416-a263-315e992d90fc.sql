-- Snake leaderboard table
CREATE TABLE public.snake_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  display_name text,
  speed text NOT NULL CHECK (speed IN ('slow', 'normal', 'fast')),
  score integer NOT NULL CHECK (score >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_snake_scores_speed_score ON public.snake_scores (speed, score DESC, created_at ASC);
CREATE INDEX idx_snake_scores_user ON public.snake_scores (user_id);

ALTER TABLE public.snake_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view leaderboard (public scores)
CREATE POLICY "Anyone can view snake scores"
  ON public.snake_scores FOR SELECT
  USING (true);

-- Authenticated users can submit their own scores
CREATE POLICY "Users can insert own snake scores"
  ON public.snake_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scores (for opt-out cleanup)
CREATE POLICY "Users can delete own snake scores"
  ON public.snake_scores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can delete any
CREATE POLICY "Admins can delete any snake scores"
  ON public.snake_scores FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));