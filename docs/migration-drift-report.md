# Drift-rapport: repo-migrasjoner vs faktisk prod

> Følger `docs/migration-drift-warning.md`. Konkret diff mellom hva
> `supabase/migrations/` hevder og hva prod-databasen (`oemzrhlybemakwpyhcno`)
> faktisk har. Verifisert 2026-06-03 med lese-spørringer (`pg_policies`,
> `pg_class`, `pg_proc`, `pg_get_functiondef`) mot prod.
>
> Formål: vite hva vi kan stole på, og hva som er misvisende, frem til
> historikken er forsont (se `docs/migration-reconciliation-runbook.md`).

## Funn som krever handling

### 🔴 `stripe_events`-tabellen finnes IKKE i prod
- **Repo:** `supabase/migrations/20260518120000_stripe_events_idempotency.sql`
  oppretter `stripe_events` (PK `event_id`) for webhook-idempotens (fase 1,
  oppgave 1.3).
- **Prod:** tabellen eksisterer ikke. Migrasjonen er fra før re-baselinen
  (2026-05-26) og ble aldri tatt med.
- **Konsekvens:** `payments-webhook` gjør `INSERT INTO stripe_events …` for å
  hindre dobbeltprosessering. Mot en manglende tabell feiler inserten — koden
  logger «Failed to record stripe event» men **fortsetter** å prosessere, så
  idempotensen er reelt **ute av funksjon**. Dvs. en Stripe-event som leveres to
  ganger ville blitt behandlet to ganger.
- **Status:** sovende nå (Stripe ikke satt opp, ingen webhooks fyrer).
- **Må gjøres FØR Stripe skrus på:** opprett `stripe_events` i prod (kjør
  migrasjonens DDL). Ellers er en fase-1-sikkerhetsgaranti borte ved lansering.

## Funn der prod er TRYGGERE enn repo (repo-fila er utdatert)

### `article_views` — UPDATE-policy
- **Repo** (`20260417082616_…sql`): `USING (true) WITH CHECK (true)` — alle kan
  oppdatere alle rader. (Dette utløste den feilaktige funn #3 / lukkede PR #99.)
- **Prod:** `"Users can update own recent view"` —
  `auth.uid() IS NOT NULL AND user_id = auth.uid() AND viewed_at > now() - interval '2 hours'`.
  Korrekt avgrenset.

### `article_views` / `user_events` — INSERT-policy
- **Repo:** `WITH CHECK (true)`.
- **Prod:** validerer lengde på `session_id` (8–128) og `article_id`/`event_type`.
  Strengere enn repo.

### `tips` — INSERT-policy
- **Repo** (`20260116134810_…sql`): `"Anyone can submit tips" … WITH CHECK (true)`
  (anonym klient-INSERT).
- **Prod:** ingen INSERT-policy. Innsending går via edge function (service role),
  så klienten kan ikke skrive direkte. Mer innelukket enn repo.

## Funn verdt å merke (ikke nødvendigvis feil)

### `user_roles` — `"Public can read public roles"`
- Prod har en SELECT-policy: `role = ANY('journalist','contributor','editor')` —
  altså **hvem som helst kan lese hvilke brukere som er journalist/bidragsyter/
  redaktør**. Sannsynligvis bevisst (offentlige byline-/forfatterprofiler), og
  `profiles` har en speilende «Public can read journalist profiles». Ikke en
  lekkasje av sensitive roller (`admin`/`subscriber`/`business` eksponeres ikke),
  men verdt å være klar over. Stod ikke i den repo-migrasjonen vi gjennomgikk.

## Funn der prod MATCHER repo (trygt å stole på)

| Objekt | Status |
|--------|--------|
| `has_active_subscription` (funksjonsdef) | Matcher repo eksakt (sjekker `current_period_end` for alle tre tilgangsveier). |
| `subscriptions` RLS | Egen + staff SELECT, ingen skrive-policy. Matcher. |
| `business_accounts` RLS | Eier SELECT/UPDATE, staff SELECT. Matcher. |
| `business_seats` RLS | Eier ALL, bruker SELECT egen, staff SELECT. Matcher. |
| `user_roles` skriving | Ingen INSERT/UPDATE/DELETE-policy → kun via `admin_grant_role`/`admin_revoke_role` (SECURITY DEFINER). Matcher mønsteret. |
| `tips` lesing | `USING (false)` for offentlig + admin/journalist SELECT. Matcher. |
| `premium_article_grants` | Finnes, RLS på, 0 policies = service-role-only. Som tiltenkt (paywall-kvote virker). |
| `group_messages` RLS | Visibility-basert via `is_group_member`/`is_group_admin`. Ser korrekt ut. |
| `profiles` RLS | Egen SELECT/INSERT/UPDATE + offentlig lesing av journalistprofiler. |
| 37 `SECURITY DEFINER`-funksjoner | Til stede med fornuftige signaturer (rolle, abonnement, analytics, grupper). |

## Konfidens / dekning

- **Sammenlignet:** RLS-policies (alle, men detaljert diff kun for de
  sikkerhetskritiske tabellene over), tabell-eksistens + RLS-på for de samme
  tabellene, `SECURITY DEFINER`-funksjonsliste (alle 37), og full def for
  `has_active_subscription`.
- **IKKE uttømmende sammenlignet:** kolonne-for-kolonne-diff på alle tabeller,
  indekser, constraints, triggere i detalj, og funksjonsdef for de øvrige 36
  funksjonene. Disse bør fanges av en faktisk `supabase db pull` (se runbook) —
  denne rapporten dekker sikkerhetsoverflaten, ikke hele skjemaet.
- Alle påstander over er hentet direkte fra prod 2026-06-03, ikke fra
  migrasjonsfiler.
