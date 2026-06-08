-- Agent-proveniens — datamodell (Trinn 1 av agent-metadata-oppgaven)
-- ======================================================================
-- Maskinlesbar journalistisk proveniens for AI-agenter og søkemotorer:
-- HVEM er intervjuet, tilsvar-status ("part avslo å kommentere"),
-- dokument-/datagrunnlag, og rettelser. Disse feltene er ment å være
-- ÅPNE — de beskriver hvor godt en sak er kildebelagt, uten å lekke
-- selve brødteksten (som fortsatt følger paywallen via articles.premium).
--
-- Designet ligger i docs/agent-provenance-design.md. Bygger på
-- naeringsbarometer-mønsteret (enum via DO-block, has_editorial_role,
-- offentlig lese-policy, update_updated_at_column-trigger).
--
-- NB navnevalg: tabellene er prefikset `article_provenance_*`. Et eksisterende
-- `article_sources` (trusted-sources for Spør/extract-source) okkuperer det
-- korte navnet, og `article_*`-navnerommet er tett (article_comments m.fl.).
-- Prefikset unngår kollisjon og grupperer feature-tabellene.
--
--   article_provenance_sources      - intervjuobjekter, dokumenter, datasett.
--                          Offentlig lesbar. org_orgnr kobler intervjuobjekt
--                          til næringslivsdatabasen (mr_companies / Brreg).
--   article_provenance_responses    - samtidig imøtegåelse / tilsvar (VVP 4.14):
--                          hvem fikk komme til orde, og svarte de? `note` er
--                          en INTERN redaksjonell merknad og eksponeres ALDRI
--                          offentlig (column-level REVOKE under).
--   article_provenance_corrections  - rettelseslogg (VVP 4.13). Offentlig lesbar.
--
-- Nytt felt på articles:
--   agent_exposure       - hvor mye av innholdet proveniens-endepunktet og
--                          JSON-LD-laget får ekko av. Default 'headline_plus_dek'
--                          (ingress/excerpt er allerede offentlig i OG-tags).
--                          source_count/document_count beregnes LIVE i
--                          endepunktet (join), ikke lagret her — unngår
--                          denormaliserings-triggere.
--
-- Prinsipp: kun faktuelle, verifiserbare felter. Ingen selvrapporterte
-- vurderingsscorer (konfliktnivå, "viktighet"). Default-deny der det er tvil.

BEGIN;

-- ----------------------------------------------------------------------
-- 0. Enums (engelske verdier — dette er et maskinlesbart, kode-vendt lag)
-- ----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.article_source_kind AS ENUM ('interviewee', 'document', 'dataset');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.article_response_status AS ENUM ('responded', 'declined', 'no_reply', 'not_applicable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.article_agent_exposure AS ENUM ('headline_only', 'headline_plus_dek', 'summary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------
-- 1. article_provenance_sources — kildegrunnlag (intervju, dokument, data)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_provenance_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  kind        public.article_source_kind NOT NULL,
  name        text NOT NULL,                 -- personnavn / dokumenttittel / datasett-navn
  role        text,                          -- intervjuobjektets rolle ("daglig leder")
  org         text,                          -- tilknyttet organisasjon
  org_orgnr   text,                          -- 9-sifret orgnr → kobling mot mr_companies/Brreg
  doc_type    text,                          -- for kind=document: "årsregnskap", "rettsdok", ...
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_provenance_sources_article
  ON public.article_provenance_sources(article_id);

ALTER TABLE public.article_provenance_sources ENABLE ROW LEVEL SECURITY;

-- Offentlig lesbar: dette ER proveniens-laget agenter skal kunne lese.
CREATE POLICY "Anyone can read article provenance sources"
  ON public.article_provenance_sources FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage article provenance sources"
  ON public.article_provenance_sources FOR ALL
  TO authenticated
  USING (public.has_editorial_role(auth.uid()))
  WITH CHECK (public.has_editorial_role(auth.uid()));

CREATE TRIGGER trg_article_provenance_sources_updated_at
  BEFORE UPDATE ON public.article_provenance_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------
-- 2. article_provenance_responses — samtidig imøtegåelse / tilsvar (VVP 4.14)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_provenance_responses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  party_name  text NOT NULL,                 -- part som er imøtegått / bedt om tilsvar
  party_role  text,                          -- partens rolle i saken
  status      public.article_response_status NOT NULL,
  note        text,                          -- INTERN redaksjonell merknad — ALDRI offentlig
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_provenance_responses_article
  ON public.article_provenance_responses(article_id);

ALTER TABLE public.article_provenance_responses ENABLE ROW LEVEL SECURITY;

-- Radene er offentlig lesbare (selve tilsvar-statusen er åpen proveniens),
-- MEN `note` er intern. RLS er rad-nivå, ikke kolonne-nivå, så vi stenger
-- `note` med en eksplisitt column-level REVOKE under. Da kan verken anon
-- eller innlogget bruker lese den via PostgREST; kun service_role (edge
-- functions) ser den — og endepunktet velger uansett aldri kolonnen.
CREATE POLICY "Anyone can read article provenance responses"
  ON public.article_provenance_responses FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage article provenance responses"
  ON public.article_provenance_responses FOR ALL
  TO authenticated
  USING (public.has_editorial_role(auth.uid()))
  WITH CHECK (public.has_editorial_role(auth.uid()));

-- Forsvar i dybden: fjern lese-tilgang til `note` for de offentlige rollene.
-- service_role beholder full tilgang (BYPASSRLS + eier alle privilegier) og
-- er den eneste veien redaksjonen leser merknaden tilbake (via admin-EF, senere).
REVOKE SELECT (note) ON public.article_provenance_responses FROM anon;
REVOKE SELECT (note) ON public.article_provenance_responses FROM authenticated;

CREATE TRIGGER trg_article_provenance_responses_updated_at
  BEFORE UPDATE ON public.article_provenance_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------
-- 3. article_provenance_corrections — rettelseslogg (VVP 4.13)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.article_provenance_corrections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id    uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  corrected_at  timestamptz NOT NULL DEFAULT now(),
  summary       text NOT NULL,               -- hva ble rettet (offentlig)
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_provenance_corrections_article
  ON public.article_provenance_corrections(article_id, corrected_at DESC);

ALTER TABLE public.article_provenance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read article provenance corrections"
  ON public.article_provenance_corrections FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage article provenance corrections"
  ON public.article_provenance_corrections FOR ALL
  TO authenticated
  USING (public.has_editorial_role(auth.uid()))
  WITH CHECK (public.has_editorial_role(auth.uid()));

-- ----------------------------------------------------------------------
-- 4. articles.agent_exposure — hvor mye innhold agent-lagene får ekko av
-- ----------------------------------------------------------------------
-- Uavhengig av paywall (premium). Styrer kun hvor mye TEKST proveniens-
-- endepunktet og JSON-LD-description echo-er. Default 'headline_plus_dek':
-- tittel + ingress/excerpt, som allerede er offentlig i OG-/meta-tags.
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS agent_exposure public.article_agent_exposure
  NOT NULL DEFAULT 'headline_plus_dek';

COMMIT;
