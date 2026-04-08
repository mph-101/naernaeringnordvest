
CREATE TABLE public.job_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  new_role text,
  new_company text,
  old_role text,
  old_company text,
  change_type text NOT NULL DEFAULT 'new_job',
  source_url text,
  source_text text,
  generated_notice text,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid,
  reviewed_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_changes ENABLE ROW LEVEL SECURITY;

-- Anyone can view published notices
CREATE POLICY "Anyone can view published job changes"
ON public.job_changes FOR SELECT TO public
USING (status = 'published');

-- Authenticated users can submit
CREATE POLICY "Authenticated users can submit job changes"
ON public.job_changes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = submitted_by);

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
ON public.job_changes FOR SELECT TO public
USING (auth.uid() = submitted_by);

-- Admins/editors can view all
CREATE POLICY "Staff can view all job changes"
ON public.job_changes FOR SELECT TO public
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'journalist'));

-- Staff can update (approve/reject)
CREATE POLICY "Staff can update job changes"
ON public.job_changes FOR UPDATE TO public
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

-- Staff can delete
CREATE POLICY "Staff can delete job changes"
ON public.job_changes FOR DELETE TO public
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_job_changes_updated_at
  BEFORE UPDATE ON public.job_changes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
