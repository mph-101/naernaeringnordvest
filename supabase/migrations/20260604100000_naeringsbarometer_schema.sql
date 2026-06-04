-- Næringsbarometer — skjema (PR 1 av barometer-oppgaven)
-- ======================================================================
-- Tre tabeller + tilgangsnivå-enum + RLS + hjelpefunksjoner + seed.
--
-- Muren håndheves SERVER-SIDE i RLS. Dette er et bevisst avvik fra
-- artikkel-paywallen, som gater via edge function (docs/paywall.md).
-- Beslutning logget i docs/decisions.md (2026-06-04). Designet ligger i
-- docs/naeringsbarometer-design.md.
--
--   barometer_modules    - konfigurasjon ("spaken"): tilgangsnivå per modul,
--                          admin-redigerbar. Offentlig lesbar (frontend må
--                          vite at en modul finnes for å rendre teaser), men
--                          selve TALLENE er gated.
--   barometer_datapoints - de beregnede SSB-tallene; arver modulens
--                          tilgangsnivå via RLS. Skrives kun av service_role
--                          (refresh-EF, PR 2).
--   barometer_signals    - avvik → godkjenningskø. Speiler job_changes:
--                          provenance + AI-draft + status-livssyklus.
--                          Insert kun av service_role (detektor-EF, PR 2).
--
-- Region-bevisst fra dag én: alt har region_slug FK → editorial_regions(slug),
-- default 'nordvestlandet'. Bygger på multi-region-skjemaet (20260518200000),
-- der subscriptions.region_slug og business_accounts.region_slug allerede finnes.

BEGIN;

-- ----------------------------------------------------------------------
-- 0. Tilgangsnivå-enum
-- ----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.barometer_tilgang AS ENUM ('åpen', 'metered', 'lukket');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------
-- 1. Hjelpefunksjoner (SECURITY DEFINER, jf. has_role-mønsteret)
-- ----------------------------------------------------------------------

-- Redaksjonell rolle: admin/editor/journalist.
CREATE OR REPLACE FUNCTION public.has_editorial_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.has_role(_user_id, 'editor'::app_role)
      OR public.has_role(_user_id, 'journalist'::app_role)
$$;

-- Region-bevisst barometer-tilgang: aktivt abonnement FOR DEN REGIONEN, en
-- aktiv bedrifts-seat i den regionen, eller redaksjonell rolle. Speiler
-- has_active_subscription, men filtrert på region_slug (per-region-abonnement).
CREATE OR REPLACE FUNCTION public.has_barometer_access(_user_id uuid, _region_slug text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Redaksjonen har alltid full tilgang
  IF public.has_editorial_role(_user_id) THEN
    RETURN true;
  END IF;

  -- 1. Personlig abonnement for denne regionen
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND region_slug = _region_slug
      AND (
        (status IN ('trialing', 'active', 'past_due')
          AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled'
          AND current_period_end IS NOT NULL AND current_period_end > now())
      )
  ) THEN
    RETURN true;
  END IF;

  -- 2. Aktiv bedrifts-seat der kontoen tilhører denne regionen
  IF EXISTS (
    SELECT 1 FROM public.business_seats bs
    JOIN public.business_accounts ba ON ba.id = bs.business_account_id
    WHERE bs.user_id = _user_id
      AND ba.region_slug = _region_slug
      AND ba.status IN ('trialing', 'active', 'past_due')
      AND (ba.current_period_end IS NULL OR ba.current_period_end > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ----------------------------------------------------------------------
-- 2. barometer_modules — konfigurasjon ("spaken")
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barometer_modules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug  text NOT NULL DEFAULT 'nordvestlandet'
                 REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE,
  module_key   text NOT NULL,
  title        text NOT NULL,
  -- Default 'lukket' = deny by default. Åpning er en bevisst handling.
  tilgangsniva public.barometer_tilgang NOT NULL DEFAULT 'lukket',
  sort_order   int NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_slug, module_key)
);

CREATE INDEX IF NOT EXISTS idx_barometer_modules_region
  ON public.barometer_modules(region_slug);

ALTER TABLE public.barometer_modules ENABLE ROW LEVEL SECURITY;

-- Offentlig lesbar: frontend må vite hvilke moduler som finnes (for teaser).
-- Tilgangsnivået i seg selv er ikke sensitivt — det er TALLENE som gates.
CREATE POLICY "Anyone can read barometer modules"
  ON public.barometer_modules FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage barometer modules"
  ON public.barometer_modules FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  );

CREATE TRIGGER trg_barometer_modules_updated_at
  BEFORE UPDATE ON public.barometer_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------
-- 3. barometer_datapoints — de beregnede tallene
-- ----------------------------------------------------------------------
-- nace_code er NOT NULL DEFAULT '' slik at UNIQUE-nøkkelen (og dermed
-- ON CONFLICT-upsert i refresh-EF) fungerer — NULL-er regnes som distinkte
-- i Postgres og ville brutt idempotens. '' betyr "ingen NACE / total".
CREATE TABLE IF NOT EXISTS public.barometer_datapoints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug  text NOT NULL DEFAULT 'nordvestlandet'
                 REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE,
  module_key   text NOT NULL,
  indicator    text NOT NULL,                 -- konkurser | etableringer | omsetning ...
  nace_code    text NOT NULL DEFAULT '',      -- bokstav- ELLER intervallkode (se design §7)
  period       text NOT NULL,                 -- '2024', '2025T6', '2025-04' (indikator-avhengig)
  label        text,
  value        numeric,
  unit         text,                          -- antall | prosent | nok
  meta         jsonb NOT NULL DEFAULT '{}'::jsonb,  -- avvik %, baseline, sesongnormal
  source_table text,                          -- SSB-tabell-ID (08551 ...) for kildeangivelse
  computed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region_slug, module_key, indicator, nace_code, period),
  FOREIGN KEY (region_slug, module_key)
    REFERENCES public.barometer_modules (region_slug, module_key)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_barometer_datapoints_lookup
  ON public.barometer_datapoints(region_slug, module_key);
CREATE INDEX IF NOT EXISTS idx_barometer_datapoints_indicator
  ON public.barometer_datapoints(indicator, period);

ALTER TABLE public.barometer_datapoints ENABLE ROW LEVEL SECURITY;

-- KJERNE-POLICYEN: et datapunkt er synlig hvis modulen er 'åpen', ELLER
-- brukeren har region-bevisst barometer-tilgang. 'metered' og 'lukket'
-- oppfører seg likt HER (begge krever tilgang) — den gratis metered-kvoten
-- serveres via en egen SECURITY DEFINER-RPC (consume_barometer_meter, PR 4)
-- som er den eneste kontrollerte veien rundt denne policyen. Default-deny.
CREATE POLICY "Barometer datapoint visibility by tilgangsniva"
  ON public.barometer_datapoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.barometer_modules m
      WHERE m.region_slug = barometer_datapoints.region_slug
        AND m.module_key  = barometer_datapoints.module_key
        AND m.is_active
        AND (
          m.tilgangsniva = 'åpen'::public.barometer_tilgang
          OR public.has_barometer_access(auth.uid(), m.region_slug)
        )
    )
  );
-- Ingen INSERT/UPDATE/DELETE-policy: skrives kun av service_role (refresh-EF).

-- ----------------------------------------------------------------------
-- 4. barometer_signals — avvik → godkjenningskø (speiler job_changes)
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.barometer_signals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_slug     text NOT NULL DEFAULT 'nordvestlandet'
                    REFERENCES public.editorial_regions(slug) ON UPDATE CASCADE,
  indicator       text NOT NULL,
  nace_code       text NOT NULL DEFAULT '',
  period          text NOT NULL,
  direction       text NOT NULL CHECK (direction IN ('opp', 'ned')),
  deviation_pct   numeric,
  observed_value  numeric,
  baseline_value  numeric,
  source_table    text,                              -- kilde for kildeangivelse i saken
  source_payload  jsonb NOT NULL DEFAULT '{}'::jsonb, -- rå tall detektoren så (revisjonsspor)
  generated_draft jsonb,                             -- AI-vinkling {title, ingress, key_points, body}
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'published', 'rejected')),
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  -- Samme avvik (region+indikator+nace+periode) skal ikke dobbelt-tipses.
  UNIQUE (region_slug, indicator, nace_code, period)
);

CREATE INDEX IF NOT EXISTS idx_barometer_signals_status
  ON public.barometer_signals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_barometer_signals_region
  ON public.barometer_signals(region_slug);

ALTER TABLE public.barometer_signals ENABLE ROW LEVEL SECURITY;

-- Kun redaksjonelle roller ser og behandler signaler (som job_changes-køen).
CREATE POLICY "Staff can read barometer signals"
  ON public.barometer_signals FOR SELECT
  TO authenticated
  USING (public.has_editorial_role(auth.uid()));

CREATE POLICY "Staff can update barometer signals"
  ON public.barometer_signals FOR UPDATE
  TO authenticated
  USING (public.has_editorial_role(auth.uid()))
  WITH CHECK (public.has_editorial_role(auth.uid()));

CREATE POLICY "Admins can delete barometer signals"
  ON public.barometer_signals FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
-- Ingen INSERT-policy: signaler inserts kun av service_role (detektor-EF).

-- ----------------------------------------------------------------------
-- 5. Seed: modulkonfigurasjon for Nordvestlandet
-- ----------------------------------------------------------------------
-- Tilgangsnivåene speiler åpent-vs-mur-tabellen i overleveringen. Muren er
-- en "spak å dra" — disse verdiene kan endres av redaksjonen i admin.
-- Merk åpent punkt §11.1: slug→SSB-regionkode-mapping (nordvestlandet → '15')
-- løses i refresh-EF (PR 2), ikke baket inn her.
INSERT INTO public.barometer_modules (region_slug, module_key, title, tilgangsniva, sort_order) VALUES
  ('nordvestlandet', 'naeringspuls_kpi',     'Næringspuls — KPI-råtall',          'åpen',     10),
  ('nordvestlandet', 'naeringspuls_avvik',   'Næringspuls — avvikstolkning',      'lukket',   20),
  ('nordvestlandet', 'konkursgraf_12mnd',    'Konkurser — inneværende 12 mnd',    'åpen',     30),
  ('nordvestlandet', 'konkursgraf_normal',   'Konkurser — mot historisk normal',  'lukket',   40),
  ('nordvestlandet', 'kommune_grunntall',    'Kommuneprofil — grunntall',         'åpen',     50),
  ('nordvestlandet', 'kommune_benchmark',    'Kommune-mot-kommune',               'lukket',   60),
  ('nordvestlandet', 'bransje_snapshot',     'Bransjebarometer — øyeblikksbilde', 'åpen',     70),
  ('nordvestlandet', 'bransje_drilldown',    'Bransjebarometer — drill-down',     'lukket',   80),
  ('nordvestlandet', 'barometer_forsidesak', 'Barometer-utløst forsidesak',       'metered',  90),
  ('nordvestlandet', 'kvartalsrapport',      'Kvartalsvis synteserapport',        'lukket',  100),
  ('nordvestlandet', 'toppleder',            'Toppleder-barometeret',             'lukket',  110)
ON CONFLICT (region_slug, module_key) DO NOTHING;

COMMIT;
