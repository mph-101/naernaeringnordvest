ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS featured_amount_nok integer,
  ADD COLUMN IF NOT EXISTS featured_stripe_session_id text,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_events_featured ON public.events (is_featured, start_at) WHERE is_featured = true;

-- Allow any authenticated user to submit events (no longer subscriber-gated).
DROP POLICY IF EXISTS "Subscribers can submit events" ON public.events;
CREATE POLICY "Authenticated users can submit events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Submitters can view their own (any status) and update their own pending submissions
DROP POLICY IF EXISTS "Submitters can view own events" ON public.events;
CREATE POLICY "Submitters can view own events"
  ON public.events FOR SELECT
  TO authenticated
  USING (auth.uid() = submitted_by);

DROP POLICY IF EXISTS "Submitters can delete own pending events" ON public.events;
CREATE POLICY "Submitters can delete own pending events"
  ON public.events FOR DELETE
  TO authenticated
  USING (auth.uid() = submitted_by AND status = 'pending');