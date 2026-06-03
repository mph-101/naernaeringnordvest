# Runbook: forsone migrasjonshistorikk repo ↔ prod

> Følger opp `docs/migration-drift-warning.md` og `docs/migration-drift-report.md`.
> Mål: gjøre `supabase/migrations/` til pålitelig fasit for prod igjen, slik at
> fremtidige review-er og `supabase db push` kan stoles på.
>
> **Status:** klargjort av Claude. Stegene under som krever Supabase CLI +
> DB-credentials må kjøres av Magnus (jeg har kun lese-MCP, ikke CLI/secrets).
> Jeg kan verifisere resultatet etterpå.

## Kort oppsummering av problemet

Prod ble re-baselined 2026-05-26 (`step24…step35`). De lokale migrasjonsfilene
eldre enn dette stammer fra den gamle Lovable-instansen og ble **aldri kjørt mot
nåværende prod**. Resultat: lokal historikk ≠ prod-historikk, og enkelte
lokale filer beskriver et utdatert skjema (f.eks. `article_views`-policyen).

## Viktig regel-avklaring FØR vi starter

CLAUDE.md sier: **«Aldri slett Supabase-migrasjoner … de er kjørt i prod.»**
Den regelen gjelder migrasjoner som faktisk er kjørt. De drift-rammede lokale
filene er trolig *ikke* kjørt mot nåværende prod. Forsoningen innebærer å
**arkivere** (ikke nødvendigvis slette) disse. Dette er en bevisst beslutning du
må ta — ikke gjør det automatisk. Anbefaling: flytt til `supabase/migrations/_archive_pre_rebaseline/` i stedet for `rm`, så historikken bevares i git uansett.

## Anbefalt fremgangsmåte (trygg rekkefølge)

### 0. Backup først (ikke hopp over)
- Bekreft at Supabase daglig backup / PITR er aktiv (Pro-plan). Noter siste
  gjenopprettingspunkt før du rører historikken.

### 1. Test på en Supabase-branch, ikke direkte mot prod
Supabase støtter preview-brancher (egen DB-kopi). Gjør forsoningen der først:
- I Supabase-dashboardet eller via CLI: opprett en dev/preview-branch fra prod.
  *(Merk: dette koster litt — bekreft kostnad. Det er verdt det for en
  historikk-operasjon.)*
- Kjør steg 2–4 mot branchen, verifiser, og bruk samme oppskrift mot prod først
  når den er bevist.

### 2. Link CLI mot prosjektet
```bash
supabase link --project-ref oemzrhlybemakwpyhcno
supabase migration list      # viser lokal vs remote — du vil se divergensen
```
`migration list` viser hvilke versjoner som finnes remote (step24…) men ikke
lokalt, og omvendt. Det er det konkrete drift-kartet.

### 3. Hent en sann baseline fra prod
```bash
supabase db pull             # introspekterer remote, skriver
                             # supabase/migrations/<ts>_remote_schema.sql
```
Dette gir én fil som faktisk speiler prod-skjemaet. Hvis CLI klager på
historikk-avvik, bruk `supabase migration repair --status applied <version>` /
`--status reverted <version>` for å få den lokale historikk-tabellen til å
matche remote (CLI-en foreslår vanligvis nøyaktig hvilke kommandoer som trengs).

### 4. Arkiver de drift-rammede filene
- Flytt alle lokale migrasjonsfiler eldre enn baselinen (de fra Lovable-tiden)
  til `supabase/migrations/_archive_pre_rebaseline/`. Behold de inkrementelle
  som faktisk matcher remote (`add_tip_status_and_reviewer`,
  `fix_duplicate_tag_notifications`, `add_scheduled_publish`,
  `schedule_auto_publish_cron`, `yjs_collab_infrastructure`).
- Resultatet skal være: `<ts>_remote_schema.sql` (ny baseline) + de få ekte
  inkrementelle = nøyaktig det prod har.

### 5. Verifiser
```bash
supabase db diff --linked    # skal være TOMT hvis lokal == prod
```
Tom diff = forsont. Jeg kan i tillegg kryss-sjekke utvalgte policies/funksjoner
via lese-MCP mot den nye baselinen.

### 6. Regenerer typer fra sann kilde
```bash
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```
(Husk pakke-ut-trikset hvis codegen returnerer `{"types":"…"}`, jf. tidligere
PR-er.)

## Forebygging: CI-driftsjekk

Legg til et CI-steg (eller en ukentlig `/schedule`-jobb) som feiler ved drift:
```bash
supabase db diff --linked --schema public   # ikke-tom = drift = feil
```
Krever en `SUPABASE_ACCESS_TOKEN` + DB-passord som GitHub secret. Da fanges
fremtidig manuell prod-endring som ikke er speilet i repo automatisk.

## Hva jeg (Claude) kan gjøre i denne jobben
- ✅ Levert: verifisert drift-rapport (`docs/migration-drift-report.md`) basert på
  lese-spørringer mot prod.
- ✅ Kan: kryss-sjekke den nye baselinen mot prod etter at du har kjørt `db pull`.
- ❌ Kan ikke: kjøre `supabase link/db pull/migration repair` (krever CLI +
  DB-credentials/secrets som er dine), og skal ikke arkivere/slette migrasjoner
  uten din eksplisitte beslutning.

## Neste steg
Når du er klar: si fra, så går vi gjennom steg 1–6 sammen. Du kjører
CLI-kommandoene; jeg verifiserer output og hjelper med `migration repair`-avgjørelser
og typegenerering.
