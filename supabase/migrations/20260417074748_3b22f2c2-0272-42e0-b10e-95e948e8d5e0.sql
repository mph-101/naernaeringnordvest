-- Editorial guidelines per article type
CREATE TABLE public.editorial_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_type text NOT NULL UNIQUE,
  display_name text NOT NULL,
  min_paragraphs integer NOT NULL DEFAULT 3,
  max_words integer NOT NULL DEFAULT 500,
  rules text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.editorial_guidelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guidelines" ON public.editorial_guidelines FOR SELECT USING (true);
CREATE POLICY "Admins can manage guidelines" ON public.editorial_guidelines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER update_editorial_guidelines_updated_at
  BEFORE UPDATE ON public.editorial_guidelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults reflecting user-stated rules
INSERT INTO public.editorial_guidelines (article_type, display_name, min_paragraphs, max_words, rules) VALUES
('news', 'Nyhetsartikkel', 3, 500,
$$- Minst 3 avsnitt, maks 500 ord.
- I tredje avsnitt skal det være et sitat dersom det er tilgjengelig i kildene.
- Direkte referat fra skriftlige kilder skal markeres med hermetegn: «referat».
- Muntlige sitater skal gjengis med tankestrek først: – Sitatet her, sa person.
- Kilder skal alltid oppgis. Lenk til kilden der URL er tilgjengelig (Markdown: [tekst](url)).
- Skriv på norsk bokmål, nøytral journalistisk tone.
- Start med en informativ ingress som svarer på hvem, hva, hvor.$$),
('reportage', 'Reportasje', 5, 1200,
$$- Minst 5 avsnitt, maks 1200 ord.
- Bruk scenesetting og beskrivelser fra kildematerialet.
- Inkluder flere sitater fordelt utover teksten.
- Direkte skriftlige referat: «referat». Muntlige sitater: – Sitat, sa person.
- Kilder skal oppgis og lenkes der det er tilgjengelig.$$),
('notice', 'Notis', 1, 150,
$$- Kort notis, 1-2 avsnitt, maks 150 ord.
- Faktabasert, ingen sitater nødvendig.
- Kilde skal oppgis til slutt, lenk hvis URL er tilgjengelig.$$);

-- Source uploads for AI article generation
CREATE TABLE public.article_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('text', 'document', 'audio', 'image', 'url')),
  title text NOT NULL,
  content text,
  source_url text,
  file_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  used_in_article uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.article_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all sources" ON public.article_sources FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'journalist'::app_role));

CREATE POLICY "Staff can insert sources" ON public.article_sources FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'journalist'::app_role)));

CREATE POLICY "Staff can update sources" ON public.article_sources FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR (auth.uid() = uploaded_by AND has_role(auth.uid(), 'journalist'::app_role)));

CREATE POLICY "Staff can delete sources" ON public.article_sources FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR (auth.uid() = uploaded_by AND has_role(auth.uid(), 'journalist'::app_role)));

CREATE TRIGGER update_article_sources_updated_at
  BEFORE UPDATE ON public.article_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for source files (documents, images)
INSERT INTO storage.buckets (id, name, public) VALUES ('article-sources', 'article-sources', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can read source files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'article-sources' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'journalist'::app_role)));

CREATE POLICY "Staff can upload source files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'article-sources' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'journalist'::app_role)));

CREATE POLICY "Staff can delete source files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'article-sources' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role) OR has_role(auth.uid(), 'journalist'::app_role)));