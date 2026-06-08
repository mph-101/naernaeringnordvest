# Decisions

## 2026-06-04 — Spør: én AI-flate for arkiv + bedriftsdata

Kontekst: vi hadde to separate AI-spørreflater. **Spør** (`articles-chat`) — samtale
mot artikkelarkivet, allerede beriket med Brønnøysund (Enhetsregisteret) og
Tall-data (etablering/konkurs/arbeidsmarked/bolig). Og **«Spør databasen»** — en
egen fane i `/tall` (`CompanyQuery` + edge function `brreg-query`) som kun gjorde
natural-language oppslag mot Brønnøysund, inkludert regnskapstall.

Beslutninger:

1. **Konsolider til én flate.** «Spør databasen» skrotes; «Spør» er eneste
   AI-spørrekanal. Overlappende funksjon, og to flater forvirrer leseren.
   (PR #108, branch `chore/fjern-spor-databasen`.) Fjernet: `CompanyQuery.tsx`,
   edge function `brreg-query`, query-fanen i `/tall`. `/tall`-URL-en består —
   kun fanen forsvinner, så ingen redaksjonell rute-endring.
2. **Ingen kapasitet skal gå tapt.** Det «Spør databasen» kunne som «Spør» ikke —
   **regnskapstall** (Regnskapsregisteret) — foldes inn i «Spør». (PR #109,
   branch `feat/spor-regnskapstall`.) Navngitte selskaps-økonomispørsmål henter nå
   siste årsregnskap (omsetning/driftsresultat/årsresultat/egenkapital), vevet
   sammen med artikkelreferanser i samme svar.
3. **Samme leverandør, ingen ny flate-overflate.** Regnskap hentes direkte fra
   `data.brreg.no/regnskapsregisteret` i `articles-chat` — ingen ny edge function,
   ingen ny npm-pakke, ingen DB/RLS. Valuta-bevisst (enkelte selskap rapporterer i
   USD). Maks 3 oppslag/forespørsel, 24t cache.
4. **Oppfølging (utenfor kode):** den deployede `brreg-query`-funksjonen må slettes
   manuelt i Supabase-dashbordet (repo-sletting av-deployer den ikke) — se
   `docs/magnus-todo.md`. `articles-chat` må deployes på vanlig vis (staging-test)
   før regnskap virker live.

## 2026-06-04 — Næringsbarometer

Kontekst: implementering av næringsbarometeret (`docs/naeringsbarometer-design.md`).

1. **Muren håndheves i RLS, server-side** — ikke kun via edge function slik
   artikkel-paywallen gjør (`docs/paywall.md`). Bevisst avvik. Tier `metered`
   trenger i tillegg en SECURITY DEFINER-RPC med forbruksteller (RLS er stateless).
2. **Barometeret er region-bevisst fra dag én** — `region_slug` på alle
   barometer-tabeller fra start, default `nordvestlandet`. Bygger på eksisterende
   `editorial_regions`, blokkeres ikke av resten av fase 2.
3. **Designdokument først** — godkjennes før migrasjoner skrives.
4. **Rute-navn: kanonisk `/naeringspuls` (ASCII)** — oppdatert 2026-06-04 etter
   404-fiks. Opprinnelig valgt `/næringspuls`, men `æ` i URL-segment fungerer ikke
   pålitelig med Next sin fil-baserte routing (NFC/NFD-normalisering; bekreftet 404
   med æ-mappe). Derfor er kanonisk rute ASCII `/naeringspuls`, og `/næringspuls`
   redirecter dit (Next `next.config` + Vite `<Navigate>`). Begge URL-er virker;
   bruk `/naeringspuls` i lenker. Erstatter `/barometer` / `/naeringspulsen`.

## 2026-06-08 — Agent-proveniens / metadata-lag

Kontekst: maskinlesbar journalistisk proveniens for AI-agenter og søkemotorer
(`docs/agent-provenance-design.md`). To lag: schema.org/NewsArticle (JSON-LD, SSR)
+ eget `provenance`-endepunkt.

1. **To lag, ingen erstatter den andre.** JSON-LD = standardlaget agenter/søk leser
   i dag; eget `provenance`-objekt = det journalistisk unike schema.org ikke dekker
   («part avslo å kommentere», antall uavhengige kilder). IKKE C2PA (fil-/bilde-
   proveniens, stripes i transitt — feil verktøy for artikkel-metadata).
2. **Proveniens-feltene er offentlige** (RLS `USING(true)`), men `article_responses.note`
   er intern — column-level `REVOKE SELECT` fra anon+authenticated, kun service_role.
3. **Bygger på `id` (uuid), ikke slug.** `articles.id` er uuid, ingen slug-kolonne.
   Endepunktet er identifikator-agnostisk så slug kan legges til i Fase 3.3 (som
   uansett planlegger `/sak/[slug]` + 301 fra uuid-URL) uten kontraktsbrudd. (Magnus, A.)
4. **`/provenance` helt åpent + rate-limit** (Magnus). Maks synlighet nå; user-agent
   logges (Trinn 4) så API-nøkkel kan innføres senere. `api_keys`-infra finnes alt.
5. **`source_count`/`document_count` beregnes live**, ikke lagret — ingen sync-triggere.
6. **Drift-forbehold:** MCP lesesperret i økten; migrasjon idempotent, bygd på
   genererte typer, må verifiseres mot prod før kjøring.

   **Renavn (2026-06-08, under bygging):** proveniens-tabellene prefikses
   `article_provenance_*` — `article_sources` var allerede tatt (trusted-sources
   for Spør/extract-source), oppdaget via tsc mot genererte typer. Korrekthetsfiks,
   ikke designendring; API-kontrakt uendret.

   **Trinn 3+4 — endepunkt + instrumentering (2026-06-08):**
   1. Edge function `article-provenance`, helt åpen (`*` CORS, verify_jwt=false),
      rate-limitet 300/time/IP (hash med service-role-salt, IP aldri lagret rått).
   2. `machine_note` i right_of_reply er status-utledet (fast norsk streng), ALDRI
      den interne `note`. `independent_source_count` = distinkte intervjuobjekter.
   3. `provenance_access_log` logger user-agent + seksjoner + eksponering, INGEN IP
      (Trinn 4). Mål: måle om agent-trafikk konverterer til abonnement.
   4. Logg-retensjon: daglig pg_cron sletter logg >90 dager + rate-limit-vinduer
      >1 døgn. Holder den eneste fritt-voksende posten flat (kostnadskontroll).
   5. Kostnad: rate-limiten begrenser misbruk, ikke normal volum. Reell driver er
      logg-lagring (nå løst) + invokasjoner (innenfor 2M/mnd Pro-kvote i lang tid).
      Fremtid: flytt rate-limiting til Cloudflare (Fase 4.4) → fjerner 2 DB-skriv/req.
