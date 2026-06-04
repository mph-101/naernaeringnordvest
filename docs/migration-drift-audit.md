# Migrasjons-drift: audit (repo ↔ prod)

Dato: 2026-06-04
Utløst av: barometer-arbeidet avdekket at `subscriptions.region_slug` mangler i
prod selv om migrasjonen finnes i repoet. Magnus ba om full audit før videre
feature-arbeid.
Prod-prosjekt: `oemzrhlybemakwpyhcno`.

## TL;DR

`supabase/migrations/`-mappa er **ikke** en pålitelig fasit på hva som er kjørt i
prod. Seks migrasjonsfiler ligger i repoet men er **aldri kjørt** mot prod. To av
dem er sikkerhet/betaling-relevante (men ingen er en akutt nedetid). Flere
deployede edge functions refererer objekter som mangler.

Ingenting er endret i prod under denne auditen — kun lesespørringer
(`information_schema`, `pg_proc`, `cron.job`, `pg_policies`) og
`list_edge_functions`.

## Hvorfor skjedde dette

Prod ble **gjenoppbygd fra et snapshot 2026-05-26** (`step24`–`step35` i
prod-loggen — jf. `docs/migration-*-snapshot.md`). Snapshotet fanget de
migrasjonene som faktisk var kjørt på det tidspunktet. Migrasjoner som var
skrevet i repoet, men aldri kjørt før 05-26, kom derfor heller ikke med i
snapshotet — og ble heller aldri kjørt etterpå.

Konsekvens: prod-loggen bruker **andre tidsstempler og navn** enn repo-filene
(f.eks. `add_tip_status_and_reviewer` er `20260531185935` i prod, `20260531140000`
i repoet). Navnematching er derfor verdiløs — denne auditen sjekker isteden om
hver migrasjons **faktiske effekt** (tabell/kolonne/funksjon/cron) finnes i prod.

## Uanvendte migrasjoner (finnes i repo, mangler i prod)

| # | Fil | Manglende effekt | Deployet kode som refererer den | Faktisk konsekvens | Alvor |
|---|-----|------------------|--------------------------------|--------------------|-------|
| 1 | `20260518120000_stripe_events_idempotency.sql` | `stripe_events`-tabell | `payments-webhook` (ACTIVE) INSERT/UPDATE | Idempotens er **stille av**. Webhooken provisjonerer fortsatt abonnement (feilen er ikke-fatal, kun logget — `payments-webhook/index.ts:214-220`). Risiko: dupliserte Stripe-leveranser dobbeltbehandles. | **Betaling-korrekthet** (ikke nedetid) |
| 2 | `20260518130000_encrypt_tip_email.sql` | `tips.follow_up_email_encrypted` (bytea) | `submit-tip` skriver **plaintext** `follow_up_email` (fungerer); `decrypt-tip-email` (ACTIVE) ville feilet | Krypteringen (fase 1.2) ble aldri fullført. Tips fungerer, men e-post lagres i klartekst. **OBS:** filen er destruktiv (NULL-er eksisterende plaintext + dropper constraint) og inkonsistent med at `submit-tip` fortsatt skriver plaintext. **Skal IKKE kjøres frittstående.** | **Sikkerhets-posture** (kildevern) |
| 3 | `20260518200000_multi_region_schema.sql` | `region_slug` på 7 tabeller, slug-omdøping, `region_hidden_articles`, RLS | Frontend hardkoder slug (`Onboarding.tsx:9`, `NewsFeed.tsx:50`, `ProfileEditor.tsx:10`) | Blokkerer barometer + fase 2. Omdøpingen `more-og-romsdal → nordvestlandet` **kan ikke kjøres som ren DB-endring** — frontend bruker fortsatt `more-og-romsdal` som id. Må endres i lås. | **Blokker** (ingen aktiv feil) |
| 4 | `20260521120000_schedule_financials_refresh.sql` | cron `refresh-financials-cache-monthly` | EF `refresh-financials-cache` deployet, men cron er ikke planlagt | `company_financials` auto-oppdateres aldri → ferske regnskap hentes ikke. | Funksjonell luke |
| 5 | `20260521150000_schedule_roles_status_refresh.sql` | cron `refresh-roles-and-status-weekly` | EF `refresh-roles-and-status` deployet, men cron er ikke planlagt | Følger-varsler ved rolle-/konkursendringer fyrer aldri. | Funksjonell luke |
| 6 | `20260522120000_live_streams.sql` | `live_streams`-tabell + `live_streams_public`-view | `cloudflare-stream` + `-webhook` (ACTIVE) + `JournalistProfile.tsx` | Live-strøm-funksjonen er brutt; journalistprofil-visning kan kaste feil ved spørring mot `live_streams`. | **Aktiv feature-feil** |

Prod har **kun én** cron-jobb i dag: `auto-publish-scheduled-articles` (`*/5 * * * *`).

## Omvendt drift (i prod, ingen repo-fil) — lavt alvor

- **Storage-RLS:** 33 policies på `storage.objects` finnes (prod-logg
  `20260528090607_storage_objects_rls_policies`). Fanget i
  `docs/migration-storage-policies-snapshot.md`. OK.
- **`schedule_auto_publish_cron`** (prod-logg `20260601093050`): cron-planlegging
  uten egen repo-fil (repoet har `add_scheduled_publish` som lager kolonnen).
  Cron-jobben kjører. OK.

## Ikke verifisert (atferds-migrasjoner — bør sjekkes ved opprydding)

Disse endrer triggere/data og kan ikke probes med ren objekt-eksistens:
- `20260522090000_fix_notification_triggers_uuid_cast.sql`
- `20260522110100_notify_user_followers_on_article_publish.sql`
- `20260522110200_notify_user_followers_on_group_message.sql`
- `20260522110300_username_backfill.sql`

`user_follows`-tabellen finnes (journalist-følge er anvendt), så hoveddelen av
`20260522110000` er inne — men trigger-fiksene over bør bekreftes konkret.

## Anbefalt opprydding (rekkefølge)

Ingen av dette er gjort. Krever Magnus' go-ahead per steg (prod-skjemaendring).

1. **Kjappe, additive fikser (lav risiko, ingen app-koordinering):**
   `stripe_events` (#1), `live_streams` (#6), de to cron-planene (#4, #5).
   Gjenoppretter tiltenkt oppførsel. Kjøres som nye migrasjoner mot prod.
   - Merk #1: vurder samtidig en Vitest på webhook-idempotens (jf. fase 1.3).
2. **Multi-region (#3)** — DB-migrasjon **+** frontend-slug (`more-og-romsdal →
   nordvestlandet` i `Onboarding.tsx`, `NewsFeed.tsx`, `ProfileEditor.tsx`, og
   evt. flere) i **samme PR**. Dette låser opp barometeret.
3. **Tip-kryptering (#2 / fase 1.2)** — egen, bevisst oppgave: fullfør
   pipelinen (oppdater `submit-tip` til å kryptere, keypair i env, test
   `decrypt-tip-email`) før kolonnen legges til. Ikke kjør den bare kolonnen.
   Til da: e-post lagres i klartekst (status quo).
4. **Barometer** — `20260604100000_naeringsbarometer_schema.sql` kjører rent
   først når multi-region (#3) er inne (default-slug `nordvestlandet` + region-FK).

## Fremover: én fasit for migrasjoner

Dual-track-tidsstemplene er rotårsaken til at dette var usynlig. Anbefaling:
vedta én anvendelses-mekanisme (enten `supabase db push` fra mappa, eller
konsekvent MCP `apply_migration`) og hold mappa autoritativ, slik at «filen
finnes» = «kjørt i prod». Verifiser med en objekt-diff (som denne auditen) etter
hver større endring.
