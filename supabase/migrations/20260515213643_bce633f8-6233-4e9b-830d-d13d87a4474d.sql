
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  location_url text,
  url text,
  organizer text,
  category text,
  region_slug text,
  image_url text,
  status text NOT NULL DEFAULT 'pending',
  moderation_note text,
  moderated_by uuid,
  moderated_at timestamptz,
  submitted_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_status_check CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX idx_events_status_start ON public.events (status, start_at);
CREATE INDEX idx_events_submitted_by ON public.events (submitted_by);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved events
CREATE POLICY "Anyone can view approved events"
ON public.events FOR SELECT
USING (status = 'approved');

-- Submitter can view own events
CREATE POLICY "Users can view own events"
ON public.events FOR SELECT
USING (auth.uid() = submitted_by);

-- Staff can view all
CREATE POLICY "Staff can view all events"
ON public.events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Subscribers can submit (always pending)
CREATE POLICY "Subscribers can submit events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = submitted_by
  AND status = 'pending'
  AND (has_active_subscription(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
);

-- Submitter can delete own pending events
CREATE POLICY "Users can delete own pending events"
ON public.events FOR DELETE
USING (auth.uid() = submitted_by AND status = 'pending');

-- Staff can update (moderate)
CREATE POLICY "Staff can update events"
ON public.events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

-- Admins can delete anything
CREATE POLICY "Admins can delete events"
ON public.events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
