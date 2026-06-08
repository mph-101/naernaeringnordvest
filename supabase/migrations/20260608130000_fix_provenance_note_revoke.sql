-- Fiks: skjerm article_provenance_responses.note ordentlig
-- ======================================================================
-- Forrige migrasjon (20260608120000) brukte:
--     REVOKE SELECT (note) ON ... FROM anon, authenticated;
-- Det er en NO-OP når rollen har TABELL-nivå SELECT (som Supabase gir anon/
-- authenticated by default på nye tabeller). Postgres sporer tabell-grant og
-- kolonne-grant separat; en tabell-grant dekker alle kolonner implisitt og kan
-- ikke "hulles" med en kolonne-revoke. Resultat: note var fortsatt lesbar for
-- anon/authenticated via PostgREST (verifisert i prod 2026-06-08).
--
-- Riktig mønster: fjern tabell-nivå SELECT, og grant SELECT eksplisitt på alle
-- kolonner UNNTATT note. Da kan offentlige roller lese statusen (åpen proveniens)
-- men ikke den interne merknaden. service_role berøres ikke (BYPASSRLS, egne
-- privilegier) og forblir eneste vei til note.

BEGIN;

REVOKE SELECT ON public.article_provenance_responses FROM anon;
REVOKE SELECT ON public.article_provenance_responses FROM authenticated;

GRANT SELECT (
  id, article_id, party_name, party_role, status, sort_order, created_at, updated_at
) ON public.article_provenance_responses TO anon;

GRANT SELECT (
  id, article_id, party_name, party_role, status, sort_order, created_at, updated_at
) ON public.article_provenance_responses TO authenticated;

COMMIT;
