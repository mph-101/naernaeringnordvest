-- Yjs collaboration infrastructure: snapshot storage and per-article collab flag.

-- Binary Yjs state for cold-starting collaboration rooms.
CREATE TABLE public.yjs_snapshots (
  article_id uuid PRIMARY KEY REFERENCES public.articles(id) ON DELETE CASCADE,
  yjs_state bytea NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.yjs_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage yjs snapshots"
ON public.yjs_snapshots FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'editor'::public.app_role)
  OR public.has_role(auth.uid(), 'journalist'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'editor'::public.app_role)
  OR public.has_role(auth.uid(), 'journalist'::public.app_role)
);

-- Feature flag for gradual rollout of collaborative editing.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS collab_enabled boolean NOT NULL DEFAULT false;
