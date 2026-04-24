-- ============================================================
-- Sikkerhetsstramming: linter-varsler 0008, 0014, 0024, 0025
-- ============================================================

-- 1) 0025: Fjern redundante SELECT-policies på public storage buckets.
--    Public buckets er allerede tilgjengelige via offentlige URL-er;
--    SELECT-policy på storage.objects gjør kun at klienter kan liste
--    innholdet (footgun).
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view article images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view job images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view job logos" ON storage.objects;

-- 2) 0008: tip_rate_limits hadde RLS på, men ingen policies.
--    Tabellen skal kun brukes av submit-tip edge-funksjonen via
--    service role (som bypasser RLS). Vi legger til en eksplisitt
--    "deny-all for klienter"-policy ved å gi admin lese-tilgang for
--    overvåking, og ingen andre policies — alle anon/authenticated
--    kall blir nektet.
CREATE POLICY "Admins can view rate limits"
  ON public.tip_rate_limits
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) 0024: Stram article_views UPDATE-policy.
--    Tidligere: USING (true) — alle kunne oppdatere alle rader.
--    Nå: kun rader fra de siste 2 timer kan oppdateres (en aktiv
--    leseøkt). Dette er fortsatt åpent for anonyme oppdateringer
--    (kreves for tracking uten innlogging) men begrenser angreps-
--    overflaten dramatisk.
DROP POLICY IF EXISTS "Anyone can update own session view" ON public.article_views;
CREATE POLICY "Sessions can update recent own view"
  ON public.article_views
  FOR UPDATE
  TO public
  USING (viewed_at > now() - interval '2 hours')
  WITH CHECK (viewed_at > now() - interval '2 hours');

-- 4) 0024: Stram article_views INSERT — krev gyldig session_id
DROP POLICY IF EXISTS "Anyone can log article views" ON public.article_views;
CREATE POLICY "Anyone can log article views"
  ON public.article_views
  FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) BETWEEN 8 AND 128
    AND article_id IS NOT NULL
    AND length(article_id) BETWEEN 1 AND 256
  );

-- 5) 0024: Stram user_events INSERT — krev gyldig session_id og event_type
DROP POLICY IF EXISTS "Anyone can log user events" ON public.user_events;
CREATE POLICY "Anyone can log user events"
  ON public.user_events
  FOR INSERT
  TO public
  WITH CHECK (
    session_id IS NOT NULL
    AND length(session_id) BETWEEN 8 AND 128
    AND event_type IS NOT NULL
    AND length(event_type) BETWEEN 1 AND 64
  );

-- 6) 0024: tips INSERT-policy — innsendinger skal gå via submit-tip
--    edge-funksjonen (service role). Fjern direkte anon insert.
DROP POLICY IF EXISTS "Anyone can submit tips" ON public.tips;

-- 7) 0014: Flytt vector extension ut av public schema.
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;