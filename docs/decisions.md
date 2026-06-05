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
