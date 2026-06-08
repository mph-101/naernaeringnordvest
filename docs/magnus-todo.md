# Magnus — handlinger utenfor kode

Ting som krever din handling i dashboards / secrets / DB, utenfor det Claude kan gjøre.

## Åpne

### Stripe-priser: 249/kvartal + 890/år (2026-06-08) — KRITISK, ellers belastes feil beløp
Jeg har endret all UI-tekst og `docs/paywall.md` til de nye prisene (kvartal
199 → **249 kr**, år 699 → **890 kr**). Men beløpene som faktisk belastes ligger
**ikke i koden** — de bor på Stripe Price-objektene som `create-checkout` slår opp
via `lookup_key`. Til du oppdaterer Stripe vil kassen fortsatt trekke 199/699,
mens siden viser 249/890.
- **Gjør i Stripe-dashbordet (både sandbox OG live):** Stripe Price-objekter er
  immutable på beløp — du kan ikke redigere prisen. Opprett **nytt** Price på de
  to produktene (249 kr kvartalsvis, 890 kr årlig), arkivér de gamle, og **flytt
  `lookup_key`-ene `personal_quarterly` / `personal_yearly`** over til de nye
  (fjern key fra gammel pris først, ellers nekter Stripe duplikat). Da plukker
  `create-checkout` automatisk opp riktig beløp uten kodeendring.
- **Business-seter også økt** (2026-06-08): 1–9 599 → **690**, 10–29 499 → **590**,
  30+ 399 → **490** kr/sete/år. Samme Stripe-grep for lookup-keyene
  `business_seat_1_9` / `business_seat_10_29` / `business_seat_30_plus`. Til sammen
  fem priser å oppdatere (2 personlige + 3 business), i både sandbox og live.
- **Eksisterende abonnenter:** nye priser gjelder kun nye checkouts. Vil du
  prisjustere løpende abonnement må det gjøres som egen migrering i Stripe (si fra,
  så lager jeg evt. en plan — krever varsling til kundene).

### Spør: lokal arbeidsgiver-rangering (2026-06-05) — etter merge av PR-stabelen
Design: [`docs/spor-storste-arbeidsgivere-design.md`](spor-storste-arbeidsgivere-design.md).
Krever din handling etter at #112 → #113 → arbeidsgiver-PR-en er merget:
1. **Kjør de to migrasjonene** mot prod: `20260605120000_mr_companies.sql`
   (ny tabell) og `20260605120100_schedule_mr_employers_refresh.sql` (cron).
2. **Deploy `refresh-mr-employers`** edge function:
   `supabase functions deploy refresh-mr-employers --project-ref oemzrhlybemakwpyhcno`.
3. **Backfill nå** (ellers er tabellen tom til søndag): kjør funksjonen én gang
   manuelt (SQL Editor-snutten ligger nederst i schedule-migrasjonen). Spør
   faller tilbake på live-BRREG til tabellen er fylt, så det virker uansett —
   men backfill gir lokal rangering med en gang.
4. **Cron-GUC:** `refresh-mr-employers-weekly` krever at `app.settings.supabase_url`
   og `app.settings.service_role_key` er satt (samme GUC-er som de andre
   schedulerne). Verifiser:
   `SELECT * FROM cron.job WHERE jobname = 'refresh-mr-employers-weekly';`

### Slett deployet `brreg-query`-funksjon (2026-06-04)
"Spør databasen"-modulen er skrotet i koden (PR — branch `chore/fjern-spor-databasen`):
frontend-fanen i `/tall`, `CompanyQuery.tsx` og funksjonen `brreg-query` er fjernet
fra repoet. Men å slette en Edge Function fra repoet av-deployer den **ikke** fra
Supabase — `brreg-query` ligger igjen som en ubrukt funksjon i prod.
- **Gjør:** Slett funksjonen i Supabase-dashbordet (Edge Functions → `brreg-query` →
  delete), evt. `supabase functions delete brreg-query`. Lav risiko: ingenting kaller
  den lenger etter at PR-en er merget.

### Migrasjons-drift (2026-06-04) — delvis ryddet, 5 gjenstår
Full analyse i [`docs/migration-drift-audit.md`](migration-drift-audit.md).
**Seks repo-migrasjoner var aldri kjørt i prod.** Repo-mappa ≠ fasit (prod ble
gjenoppbygd fra snapshot 05-26 med egne tidsstempler).

- ✅ **Multi-region** (`20260518200000`) kjørt mot prod + frontend-slugs (PR #102).
  MCP-tokenet kan nå kjøre `apply_migration` (tidligere `permission denied`).
- **Gjenstår — kjappe additive fikser** (lav risiko, kan kjøres når du vil):
  `stripe_events` (idempotens stille av i `payments-webhook`), `live_streams`
  (brutt feature), de to manglende cron-jobbene (`refresh-financials-cache-monthly`,
  `refresh-roles-and-status-weekly` — cachene auto-oppdateres ikke i dag).
- **Gjenstår — egen oppgave:** `encrypt_tip_email` (fase 1.2, `20260518130000`):
  IKKE kjør frittstående — filen er destruktiv og pipelinen er uferdig. Inntil da
  lagres tips-e-post i klartekst.

### Stripe miljøisolasjon (2026-06-03) — KRITISK, krever din beslutning
- Sikkerhetsgjennomgang fant at klienten selv velger `environment` i
  `create-checkout`, slik at en bruker kan abonnere med Stripe **testkort** og få
  ekte premium-tilgang i prod. Detaljer + forslag: `docs/security-stripe-environment-isolation.md`.
- **Jeg har bevisst ikke rørt Stripe-flyten** (jf. arbeidsreglene). Jeg trenger
  svar på valg A/B/C i notatet før jeg lager PR.
- **Sjekk også:** finnes det allerede sandbox-rader i prod `subscriptions` /
  `business_accounts`? I så fall bør de ryddes (DELETE mot prod = din jobb).

### ✅ LØST: Bildetekst-funksjon (2026-05-31)
> **Verifisert kjørt i prod 2026-06-04** (drift-audit): kolonnene `image_caption`
> m.fl. finnes på `articles`. Ingen handling nødvendig. Beholdt for historikk.
- **Kjør migrasjonen `supabase/migrations/20260531120000_article_image_caption.sql`** mot prod.
  Claude fikk `permission denied` via MCP-tokenet og kunne ikke kjøre den selv.
  Den legger til `image_caption`, `image_credit`, `image_source` på `articles`.
- **Hvorfor kritisk:** Artikkel-editoren skriver nå disse tre feltene ved hver
  lagring. Uten kolonnene vil **all artikkellagring feile** ("column does not
  exist"). Migrasjonen MÅ kjøres før (eller samtidig som) frontend-koden går live.
- `src/integrations/supabase/types.ts` er allerede manuelt oppdatert til å matche
  migrasjonen. Når du kjører `supabase gen types` neste gang blir den uansett lik.

### Vercel preview-deploy for Next.js (2026-06-01)

Mål: få en ekte preview-deploy av Next-appen på Vercel **uten** å røre DNS, så vi
kan verifisere miljøet (env, middleware på edge, auth-cookies i SSR) før cutover.
Koden er klar — `vercel.json` peker allerede på `npm run build:next`, framework
`nextjs`, region `arn1` (Stockholm, matcher Supabase `eu-north-1`).

**Det du må gjøre i Vercel-dashbordet:**

1. **Eksisterende Vercel-prosjekt er allerede koblet til repoet** (`mph-101/naernaeringnordvest`).
   Bruk det — ikke lag nytt. `vercel.json` på `main` styrer byggingen, og preview-deploys
   fra feature-branch er isolerte (rører ikke det `main`/prod serverer). La `main`/DNS være urørt.
2. **Environment Variables** (Settings → Environment Variables). Verifisert fasit
   2026-06-02 ved å lese all `process.env`-bruk i Next-koden. **Nøyaktig tre** vars
   trengs (alle `NEXT_PUBLIC_` — inlines ved build, sendes til nettleser):
   | Variabel | Verdi | Scope |
   |----------|-------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://oemzrhlybemakwpyhcno.supabase.co` | Production + Preview |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key fra Supabase → Settings → API | Production + Preview |
   - **Demo-status (2026-06-02):** kun de to over er satt. `SUPABASE_SERVICE_ROLE_KEY`
     er slettet fra Vercel (✓). Stripe er bevisst ikke satt opp i demo, så
     `NEXT_PUBLIC_PAYMENTS_CLIENT_TOKEN` er **utelatt** med vilje. Checkout-komponenten
     viser da en pen «Betaling ikke tilgjengelig i demomodus»-melding i stedet for å
     crashe (guard i `StripeEmbeddedCheckout.tsx`). Legg til tokenet når betaling skal på.
   - Merk: `NEXT_PUBLIC_*` inlines ved build — du må **redeploye** etter endring.
   - **Skal IKKE ligge i Vercel** (ingen Next-kode leser dem):
     - `SUPABASE_SERVICE_ROLE_KEY` — RLS-bypass-overflate uten nytte. Hører hjemme i
       Edge Functions (Supabase), ikke frontend-deployet. Fjern med mindre du har en
       konkret server-side plan (f.eks. fremtidig Liveblocks-auth-route).
     - `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` — kun `vite.config.ts`
       bruker dem (Vite-byggets source-map-opplasting), ikke Next-bygget.
   - **Sjekk:** at den andre Supabase-varen faktisk er anon-key og ikke URL-en på nytt.
3. **Legg Vercel preview-domenet til i Supabase Auth → URL Configuration →
   Redirect URLs** (f.eks. `https://<branch>-<prosjekt>.vercel.app/**`). Ellers
   feiler innlogging/passord-reset på preview med "redirect not allowed".
4. **Verifiser etter deploy** (jeg kan hjelpe med å gå gjennom dette mot preview-URL-en):
   - Forside + en artikkel (`/sak/[id]`) rendrer, og artikkelen har OG-tags i
     `<head>` (view source — bekrefter at SSR-metadata virker i deployet kontekst).
   - Innlogging fungerer (auth-cookie settes av middleware på edge).
   - Checkout (innlogget): velg en plan → modalen skal vise «Betaling ikke
     tilgjengelig i demomodus», ikke crashe. (Når Stripe settes opp senere: legg til
     tokenet i Vercel og verifiser at ekte checkout laster.)
   - Bro-redirects: `/reset-password` → `/nullstill-passord`,
     `/abonnement/takk` → `/abonnement/retur`.

**Ikke gjort (venter på din beslutning):** flippe default `dev`/`build`-script til
Next og peke produksjons-DNS mot Vercel. Det er den ekte cutoveren (fase 5).

## Samredigering — LIVE i prod (Fase A+B+C delvis)

Status 2026-06-02: sanntids samredigering er live. Migrasjonen er kjørt,
`LIVEBLOCKS_SECRET_KEY` er satt i både `.env.local` og Vercel, og to-vinduers
sync + presence-avatarer er verifisert. Redaktører styrer det via av/på-knappen
i artikkeleditoren (default av, kun redaksjonelle roller).

**Gjenstående handlinger for deg:**

1. **Transport-beslutning (låser opp resten av Fase C).** Liveblocks (hosted, US-
   tredjepart får artikkel-body) vs selvhostet **Hocuspocus** (EU, ~$5–10/mnd).
   Alt ligger bak `src/lib/collab/createCollabProvider`, så byttet er lite. Når
   du har valgt, bygger Claude robust server-side persistering + cold-start fra
   `yjs_snapshots` (siste Fase C-bit). Inntil da: `articles.body` holdes fersk av
   eksisterende auto-lagring, og cold-start seeder fra HTML.
2. **Rydd test-artikkelen** «Tester nytt varslingssystem… Brunvoll AS»
   (id `2a67658b-7187-480a-887d-1877eeda5421`): har fortsatt `collab_enabled =
   true` + testtekst i body. Skru av via knappen i editoren (eller SQL), og fjern
   ev. testtekst via revisjonsloggen.
3. **(Lavt) bun-lockfiler utdaterte.** Collab-pakkene ble lagt til via npm, så
   `bun.lock`/`bun.lockb` er ikke oppdatert. CI bruker npm (`package-lock.json`),
   så det er ufarlig — men kjør `bun install` hvis noen bruker bun lokalt.

> Personvern: Liveblocks er US-basert og mottar artikkel-body. Hvis det er et
> problem, velg Hocuspocus-stien (punkt 1).

## Agent-proveniens (2026-06-08)

- [ ] **Kjør migrasjonen** `20260608120000_agent_provenance_schema.sql` mot prod
      (`supabase db push` eller dashboard). MCP var lesesperret i økten, så Claude
      kunne ikke verifisere skjema eller kjøre selv.
- [ ] **Regenerer typer** etter migrasjon: `supabase gen types` → oppdater
      `src/integrations/supabase/types.ts`. Da kan den midlertidige untyped-aksessoren
      i `src/lib/agent-provenance/server.ts` byttes til typede kall.
- [ ] **Sett `NEXT_PUBLIC_SITE_URL`** i Vercel (prod + preview) til faktisk domene.
      Default i koden er `https://naernaering.no` — JSON-LD `url`/canonical bruker den.
- [ ] **Rich Results Test:** etter deploy, kjør en premium-artikkel-URL gjennom
      https://search.google.com/test/rich-results og bekreft NewsArticle + paywall.
