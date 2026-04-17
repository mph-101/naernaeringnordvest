-- =============================================================
-- HJERNEVELVET: regional section with external writers + panels
-- =============================================================

-- 1) WRITERS (external contributors)
CREATE TABLE public.hjernevelv_writers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,                          -- optional: link to auth.users if they have an account
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  avatar_url text,
  expertise text[] NOT NULL DEFAULT '{}',
  region_slug text REFERENCES public.editorial_regions(slug) ON DELETE SET NULL,
  website_url text,
  linkedin_url text,
  twitter_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hjernevelv_writers_region_idx ON public.hjernevelv_writers(region_slug);
CREATE INDEX hjernevelv_writers_active_idx ON public.hjernevelv_writers(active);

ALTER TABLE public.hjernevelv_writers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated readers can view active writers"
  ON public.hjernevelv_writers FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Staff can view all writers"
  ON public.hjernevelv_writers FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can manage writers"
  ON public.hjernevelv_writers FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER hjernevelv_writers_updated_at
  BEFORE UPDATE ON public.hjernevelv_writers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) ARTICLES (essays from writers)
CREATE TABLE public.hjernevelv_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id uuid NOT NULL REFERENCES public.hjernevelv_writers(id) ON DELETE CASCADE,
  region_slug text REFERENCES public.editorial_regions(slug) ON DELETE SET NULL,
  topic text,                            -- e.g. "AI i lokal forvaltning"
  title text NOT NULL,
  excerpt text NOT NULL,
  body text NOT NULL,
  read_time text,
  image_url text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hjernevelv_articles_writer_idx ON public.hjernevelv_articles(writer_id);
CREATE INDEX hjernevelv_articles_region_idx ON public.hjernevelv_articles(region_slug);
CREATE INDEX hjernevelv_articles_published_idx ON public.hjernevelv_articles(published, published_at DESC);

ALTER TABLE public.hjernevelv_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated readers can view published articles"
  ON public.hjernevelv_articles FOR SELECT
  TO authenticated
  USING (published = true);

CREATE POLICY "Staff can view all hjernevelv articles"
  ON public.hjernevelv_articles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can manage hjernevelv articles"
  ON public.hjernevelv_articles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER hjernevelv_articles_updated_at
  BEFORE UPDATE ON public.hjernevelv_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) PANELS (quarterly Q&A events)
CREATE TABLE public.hjernevelv_panels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug text REFERENCES public.editorial_regions(slug) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  topic text,
  format text NOT NULL DEFAULT 'digital',  -- 'digital' | 'physical' | 'hybrid'
  status text NOT NULL DEFAULT 'planned',  -- 'planned' | 'open' | 'live' | 'completed' | 'cancelled'
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,                            -- physical address OR meeting link
  meeting_url text,
  max_attendees integer,
  cover_image_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hjernevelv_panels_format_check CHECK (format IN ('digital','physical','hybrid')),
  CONSTRAINT hjernevelv_panels_status_check CHECK (status IN ('planned','open','live','completed','cancelled'))
);

CREATE INDEX hjernevelv_panels_region_idx ON public.hjernevelv_panels(region_slug);
CREATE INDEX hjernevelv_panels_scheduled_idx ON public.hjernevelv_panels(scheduled_at DESC);

ALTER TABLE public.hjernevelv_panels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated readers can view non-draft panels"
  ON public.hjernevelv_panels FOR SELECT
  TO authenticated
  USING (status <> 'planned' OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Staff can manage panels"
  ON public.hjernevelv_panels FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER hjernevelv_panels_updated_at
  BEFORE UPDATE ON public.hjernevelv_panels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) PANELISTS (writers participating in a panel)
CREATE TABLE public.hjernevelv_panelists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid NOT NULL REFERENCES public.hjernevelv_panels(id) ON DELETE CASCADE,
  writer_id uuid NOT NULL REFERENCES public.hjernevelv_writers(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'panelist',   -- 'panelist' | 'moderator'
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(panel_id, writer_id)
);

CREATE INDEX hjernevelv_panelists_panel_idx ON public.hjernevelv_panelists(panel_id);

ALTER TABLE public.hjernevelv_panelists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view panelists"
  ON public.hjernevelv_panelists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage panelists"
  ON public.hjernevelv_panelists FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- 5) QUESTIONS (reader-submitted, moderated)
CREATE TABLE public.hjernevelv_panel_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid NOT NULL REFERENCES public.hjernevelv_panels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,                       -- snapshot at submission
  question text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected' | 'answered'
  is_anonymous boolean NOT NULL DEFAULT false,
  upvotes integer NOT NULL DEFAULT 0,
  moderator_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hjernevelv_questions_status_check CHECK (status IN ('pending','approved','rejected','answered')),
  CONSTRAINT hjernevelv_questions_length_check CHECK (length(question) BETWEEN 5 AND 1000)
);

CREATE INDEX hjernevelv_questions_panel_idx ON public.hjernevelv_panel_questions(panel_id, status);
CREATE INDEX hjernevelv_questions_user_idx ON public.hjernevelv_panel_questions(user_id);

ALTER TABLE public.hjernevelv_panel_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view approved/answered questions"
  ON public.hjernevelv_panel_questions FOR SELECT
  TO authenticated
  USING (status IN ('approved','answered'));

CREATE POLICY "Users can view own questions"
  ON public.hjernevelv_panel_questions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all questions"
  ON public.hjernevelv_panel_questions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Authenticated users can submit questions"
  ON public.hjernevelv_panel_questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending questions"
  ON public.hjernevelv_panel_questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending questions"
  ON public.hjernevelv_panel_questions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Staff can moderate questions"
  ON public.hjernevelv_panel_questions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER hjernevelv_questions_updated_at
  BEFORE UPDATE ON public.hjernevelv_panel_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) REGISTRATIONS (panel attendees)
CREATE TABLE public.hjernevelv_panel_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id uuid NOT NULL REFERENCES public.hjernevelv_panels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text,
  email text,
  comment text,
  attended boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(panel_id, user_id)
);

CREATE INDEX hjernevelv_registrations_panel_idx ON public.hjernevelv_panel_registrations(panel_id);
CREATE INDEX hjernevelv_registrations_user_idx ON public.hjernevelv_panel_registrations(user_id);

ALTER TABLE public.hjernevelv_panel_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own registrations"
  ON public.hjernevelv_panel_registrations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all registrations"
  ON public.hjernevelv_panel_registrations FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE POLICY "Users can register themselves"
  ON public.hjernevelv_panel_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own registration"
  ON public.hjernevelv_panel_registrations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can mark attendance"
  ON public.hjernevelv_panel_registrations FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- 7) Helper view-friendly RPC: panel summary with counts (avoids N+1 in UI)
CREATE OR REPLACE FUNCTION public.hjernevelv_panel_counts(_panel_id uuid)
RETURNS TABLE (registration_count bigint, approved_question_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.hjernevelv_panel_registrations WHERE panel_id = _panel_id),
    (SELECT COUNT(*) FROM public.hjernevelv_panel_questions WHERE panel_id = _panel_id AND status IN ('approved','answered'));
$$;