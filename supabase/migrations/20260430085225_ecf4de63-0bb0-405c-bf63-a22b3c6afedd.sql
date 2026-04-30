-- Native ads (sponset innhold) som kan festes til en posisjon i nyhetsfeeden
CREATE TABLE public.native_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  sponsor_name text NOT NULL,
  sponsor_logo_url text,
  cta_label text,
  cta_url text,
  pinned_position integer NOT NULL DEFAULT 2,
  active boolean NOT NULL DEFAULT true,
  start_at timestamptz,
  end_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_native_ads_active ON public.native_ads(active, pinned_position);

ALTER TABLE public.native_ads ENABLE ROW LEVEL SECURITY;

-- Public read for currently-live ads
CREATE POLICY "Anyone can view live native ads"
ON public.native_ads
FOR SELECT
USING (
  active = true
  AND (start_at IS NULL OR start_at <= now())
  AND (end_at IS NULL OR end_at >= now())
);

-- Staff can view all (including drafts/expired)
CREATE POLICY "Staff can view all native ads"
ON public.native_ads
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
  OR has_role(auth.uid(), 'journalist'::app_role)
);

-- Admin/editor full management
CREATE POLICY "Staff can insert native ads"
ON public.native_ads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);

CREATE POLICY "Staff can update native ads"
ON public.native_ads
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);

CREATE POLICY "Staff can delete native ads"
ON public.native_ads
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'editor'::app_role)
);

-- Updated_at trigger using existing helper
CREATE TRIGGER update_native_ads_updated_at
BEFORE UPDATE ON public.native_ads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();