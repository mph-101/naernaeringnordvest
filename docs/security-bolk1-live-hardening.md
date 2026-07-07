# Designnotat — Sikkerhet bolk 1: live, lav-risiko herding

**Dato:** 2026-07-06
**Status:** Venter på Magnus' godkjenning før implementasjon (RLS-endring → forelegges per CLAUDE.md)
**Opphav:** Full code review 2026-07-06 (bolk 1 av foreslått fikse-rekkefølge)
**Mål:** Én fokusert PR som lukker de sikkerhetshullene som er *utnyttbare i prod nå* og har lav innsats/lav risiko. Ingen betalings- eller arkitektur-endringer (de kommer i egne bolker).

Alle fakta under er **verifisert mot prod** (`oemzrhlybemakwpyhcno`), ikke lest fra migrasjoner (jf. kjent migration-drift).

---

## Innhold i PR-en

| # | Endring | Type | Alvorlighet | Bryter noe? |
|---|---------|------|-------------|-------------|
| 1 | `profiles` UPDATE-policy får `WITH CHECK` | Migrasjon (RLS) | Høy | Nei (verifisert) |
| 2 | Fjern anon-liste-policy på `article-images`-bøtten | Migrasjon (storage RLS) | Medium | Nei (verifisert) |
| 3 | `slugify_display_name` får eksplisitt `search_path` | Migrasjon | Lav | Nei |
| 4 | Slå på «Leaked Password Protection» | Dashboard (Magnus) | Lav | Nei |

Estimat: ~40 linjer migrasjon + doc. Godt innafor 200–500-sonen.

---

## 1. `profiles` UPDATE-policy mangler `WITH CHECK` (Høy)

### Problem
Prod-policyen «Users can update their own profile» er:
```
FOR UPDATE  USING (auth.uid() = user_id)   -- WITH CHECK: (tom)
```
`USING` avgjør kun *hvilke rader* en bruker kan oppdatere. Uten `WITH CHECK` valideres ikke *resultatraden*. En innlogget bruker kan derfor sette `user_id` på sin egen rad til en **annen brukers** uuid (row-hijack), eller skrive en rad som ikke lenger tilhører dem. Klassisk USING-vs-WITH-CHECK-feil.

### Endring (ny migrasjon `20260706120000_profiles_update_with_check.sql`)
```sql
-- Security review bolk 1: the "Users can update their own profile" policy had a
-- USING clause but no WITH CHECK, so a user could set their row's user_id to
-- another user's id (row-hijack). Add WITH CHECK to validate the resulting row.
-- ALTER (not DROP+CREATE) so there is no window where the policy is absent.
ALTER POLICY "Users can update their own profile"
  ON public.profiles
  WITH CHECK (auth.uid() = user_id);
```

### Hvorfor dette IKKE bryter noe (verifisert)
- `ProfileEditor.tsx` oppdaterer alltid `.eq("user_id", userId)` og endrer **aldri** `user_id`-kolonnen. `WITH CHECK (auth.uid() = user_id)` er oppfylt for alle legitime egen-oppdateringer.
- **Bevisst NEDskopet:** vi låser IKKE `editorial_region` eller `spor_enabled`. Review-utkastet vurderte det, men koden viser at begge er *tilsiktede bruker-preferanser* — `ProfileEditor.tsx:91` (editorial_region) og `:120` (spor_enabled, per-bruker Spør-toggle synket via profilen, jf. `SporAIChat.tsx:38`). Å låse dem ville brutt profilinnstillingene. De forblir bruker-skrivbare.
- `username`-impersonering er allerede blokkert: prod har `idx_profiles_username_lower` UNIQUE på `lower(username)` — en bruker kan ikke overta en journalists brukernavn.

### Rollback
`ALTER POLICY "Users can update their own profile" ON public.profiles WITH CHECK (true);` (eller drop+recreate uten WITH CHECK). Ikke destruktivt.

---

## 2. `article-images` er public **og** listbar → utkast-bilder kan enumereres (Medium)

### Problem
Prod: bøtten `article-images` er `public=true` OG har en bred SELECT-policy «Anyone can view article-images» på `storage.objects`. Den brede SELECT-en lar hvem som helst *liste* alle filer i bøtten. Selv om utkast-*artikler* er skjult i RLS (`articles` SELECT `USING (published=true)`), kan et forsidebilde/motiv for en ikke-publisert sak dermed lekke via enumerering før publisering (scoop-lekkasje).

### Endring (samme migrasjon)
```sql
-- Public buckets serve objects via the public CDN URL WITHOUT an RLS SELECT
-- policy; the broad SELECT only enables *listing/enumeration*. Drop it so
-- unpublished draft images can't be enumerated. getPublicUrl() rendering is
-- unaffected.
DROP POLICY IF EXISTS "Anyone can view article-images" ON storage.objects;
```

### Hvorfor dette IKKE bryter bilderendering (verifisert)
- For `public=true`-bøtter serveres objektet via `/object/public/...` **uten** RLS-sjekk. Frontend bruker `getPublicUrl()` (`InlineImagePicker.tsx:159`) — konstruerer bare public-URL, trenger ikke SELECT-policyen.
- Ingenting i `src/` kaller `.list()` på noen storage-bøtte (verifisert med grep — kun `upload` + `getPublicUrl`). MediaArchive lister via `media_assets`-tabellen, ikke storage-API-et. Ingen list-avhengighet å bryte.

### Åpent valg (se spørsmål til slutt)
Samme liste-eksponering finnes på 5 andre public-bøtter: `avatars`, `author-avatars`, `event-images`, `job-images`, `job-logos`. Disse holder kun *publisert* innhold, så eksponeringen er ufarlig — men å fjerne list-policyen på alle 6 er identisk, trivielt, og rydder advisor-en helt. **Anbefaling:** ta `article-images` (den sensitive) nå; de 5 andre som valgfri opprydding i samme PR.

### Rollback
Gjenopprett policyen: `CREATE POLICY "Anyone can view article-images" ON storage.objects FOR SELECT USING (bucket_id = 'article-images');`

---

## 3. `slugify_display_name` har mutable `search_path` (Lav)

### Problem
Prod: `public.slugify_display_name(input text)` har `proconfig = null` (ingen fast `search_path`). Supabase-advisor flagger dette (search-path-injection-herding).

### Endring (samme migrasjon)
```sql
-- Pin search_path so the function can't be affected by a caller's search_path.
-- Body uses only pg_catalog builtins (lower/regexp_replace/trim) → empty path is safe.
ALTER FUNCTION public.slugify_display_name(text) SET search_path = '';
```
**Verifisering før merge:** bekreft at funksjonskroppen kun bruker pg_catalog-innebygde funksjoner (ingen tabell-/skjemareferanser). Hvis den refererer noe i `public`, bruk `SET search_path = public` i stedet.

### Rollback
`ALTER FUNCTION public.slugify_display_name(text) RESET search_path;`

---

## 4. Leaked Password Protection (Lav) — Magnus-handling

Ren dashboard-toggle (Supabase → Auth → Password protection → aktiver HaveIBeenPwned-sjekk). Ingen kode. Lagt i `docs/magnus-todo.md`.

---

## Hva som bevisst IKKE er i denne PR-en
- **Ikke** låsing av `editorial_region`/`spor_enabled` (tilsiktede bruker-prefs — se §1).
- **Ikke** betalings-/webhook-fikser, feed-api-paywall, rate-limit-atomisering (bolk 3).
- **Ikke** «kun mennesker publiserer»-RPC (bolk 4).
- **Ikke** de øvrige RLS-manglene (`notifications`-immutabilitet, `group_invitations` WITH CHECK) — samles i en egen RLS-herdings-PR (bolk 5) for å holde denne fokusert.

## Testplan
- `npm run test` (vitest) + deno-tester grønne (ingen logikk-kode endres, men CI kjører begge — jf. [[edge-function-vitest-pattern]]).
- Manuelt mot staging/prod-preview: (a) rediger egen profil (display_name, region, spor-toggle) → lagrer OK; (b) forsøk å sette `user_id` til annen uuid via rå PostgREST-kall → skal avvises av WITH CHECK; (c) last opp et artikkelbilde og bekreft at det fortsatt vises via public-URL; (d) bekreft at anon `storage.from('article-images').list()` nå gir tomt/avvist.
- Migrasjonen kjøres mot prod på vanlig vis (aldri av-rekkefølge; nytt datostempel `20260706120000`).

## Oppfølging (utenfor denne PR-en)
- `username`-impersonering er dekket av eksisterende unik-indeks — ingen handling.
- Vurder om `profiles.email` bør være bruker-skrivbar (lav risiko; egen vurdering).
