-- Polls
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  description text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active polls"
ON public.polls FOR SELECT
USING (active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()));

CREATE POLICY "Staff can view all polls"
ON public.polls FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can manage polls"
ON public.polls FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER polls_updated_at
BEFORE UPDATE ON public.polls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Poll votes
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id text NOT NULL,
  user_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT poll_votes_user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE UNIQUE INDEX poll_votes_unique_user ON public.poll_votes (poll_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX poll_votes_unique_session ON public.poll_votes (poll_id, session_id) WHERE user_id IS NULL AND session_id IS NOT NULL;
CREATE INDEX poll_votes_poll_idx ON public.poll_votes (poll_id);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can vote"
ON public.poll_votes FOR INSERT
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL AND length(session_id) BETWEEN 8 AND 128)
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

CREATE POLICY "Users can view own vote"
ON public.poll_votes FOR SELECT
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Staff can view all votes"
ON public.poll_votes FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Aggregated results
CREATE OR REPLACE FUNCTION public.poll_results(_poll_id uuid)
RETURNS TABLE(option_id text, votes bigint, percent numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT pv.option_id, COUNT(*)::bigint AS votes
    FROM public.poll_votes pv
    WHERE pv.poll_id = _poll_id
    GROUP BY pv.option_id
  ),
  total AS (
    SELECT COALESCE(SUM(votes), 0)::bigint AS total FROM counts
  )
  SELECT
    c.option_id,
    c.votes,
    CASE WHEN t.total = 0 THEN 0
         ELSE ROUND((c.votes::numeric / t.total::numeric) * 100, 1)
    END AS percent
  FROM counts c CROSS JOIN total t;
$$;

CREATE OR REPLACE FUNCTION public.poll_user_choice(_poll_id uuid, _session_id text DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT option_id FROM public.poll_votes
  WHERE poll_id = _poll_id
    AND (
      (auth.uid() IS NOT NULL AND user_id = auth.uid())
      OR (auth.uid() IS NULL AND _session_id IS NOT NULL AND session_id = _session_id)
    )
  LIMIT 1;
$$;

-- Journalist messages
CREATE TABLE public.journalist_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  journalist_id uuid,
  from_user_id uuid,
  from_name text,
  from_email text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX journalist_messages_journalist_idx ON public.journalist_messages (journalist_id);
CREATE INDEX journalist_messages_article_idx ON public.journalist_messages (article_id);

ALTER TABLE public.journalist_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can send messages"
ON public.journalist_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id AND length(body) BETWEEN 2 AND 4000);

CREATE POLICY "Senders view own messages"
ON public.journalist_messages FOR SELECT
USING (auth.uid() = from_user_id);

CREATE POLICY "Journalist views received"
ON public.journalist_messages FOR SELECT
USING (auth.uid() = journalist_id);

CREATE POLICY "Staff view all messages"
ON public.journalist_messages FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Recipients mark read"
ON public.journalist_messages FOR UPDATE
TO authenticated
USING (auth.uid() = journalist_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (auth.uid() = journalist_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Profile mascot fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mascot_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tour_completed_at timestamptz;