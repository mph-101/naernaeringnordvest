# Magnus — handlinger utenfor kode

Ting som krever din handling i dashboards / secrets / DB, utenfor det Claude kan gjøre.

## Åpne

### Herding F5–F7 (2026-06-10)
- **Deploy** `articles-chat` (F5 input-validering) og `payments-webhook` (F6 idempotens-fiks).
- **F7 — beslutning kreves:** `feed-api` mangler per-nøkkel rate-limit. Brute-force
  er urealistisk (krever gyldig abonnent-API-nøkkel), så dette er fair-use-vern, lav
  severity. To alternativer, begge DB-migrasjon (= din godkjenning):
  (a) ny `api_key_rate_limits`-tabell (vindusteller, som `tip_rate_limits`), eller
  (b) endre `validate_api_key`-RPC til å returnere `last_used_at` + håndheve et
  minimumsintervall. Si fra hvilken, så lager jeg migrasjon + edge-endring som egen PR.

### Stripe-miljøisolering F1 (2026-06-10)
- **Sett `STRIPE_ENVIRONMENT`** som edge-secret per deploy: `live` i prod,
  `sandbox` i staging/preview. Koden defaulter til `sandbox` (trygt) hvis usatt —
  så prod MÅ settes til `live` før Stripe live-mode, ellers brukes test-nøkler.
- **Egen sandbox-DB (valg A/alt.1):** ved Stripe-oppsett, la sandbox-webhooken
  peke på en egen Supabase-instans (eller la den prod-deployede webhooken stå med
  `STRIPE_ENVIRONMENT=live` — kode-guarden ignorerer da sandbox-events). Prod-DB
  skal være ren live-data; derfor er det IKKE lagt til miljøfilter på lese-siden.
- **Deploy** `create-checkout`, `create-portal-session`,
  `create-job-premium-checkout`, `create-event-featured-checkout`, `payments-webhook`.
- Klienten sender ikke lenger `environment` — ingen handling der.

### Tips-e-post kryptering F2 (2026-06-10)
- **Bekreft at `TIP_ENCRYPTION_PUBLIC_KEY`** er satt som edge-secret. `submit-tip`
  krever den nå for å ta imot tips med oppfølgings-e-post (feiler med 503 ellers —
  aldri klartekst). `decrypt-tip-email` bruker samme nøkkelpar.
- **Privatnøkkelen** må distribueres til journalister manuelt (ikke i kode). Den
  limes inn i «Dekrypter e-post»-dialogen i admin → Tips.
- **Deploy `submit-tip`** (kryptering) på nytt.
- **Regenerer typer** (`supabase gen types`) så `follow_up_email_encrypted` kommer
  inn i `types.ts` — da kan `(supabase.from("tips") as any)`-castet i `TipsList.tsx`
  fjernes.
- **Senere opprydding:** når kryptering er verifisert i drift, kan klartekst-kolonnen
  `tips.follow_up_email` droppes i en egen migrasjon (den nulles allerede og skrives
  ikke lenger). Egen PR — schema-endring krever din godkjenning.

### Sikkerhetsherding F3+F4 (2026-06-10)
- **Sett `RATE_LIMIT_SALT`** som secret på edge functions (en lang tilfeldig
  streng). Brukes nå til IP-hashing for rate-limiting i `submit-tip` og
  `article-provenance` i stedet for `SUPABASE_SERVICE_ROLE_KEY` (F4). Hvis den
  ikke settes, faller koden tilbake til tom salt — rate-limiting virker fortsatt,
  men er ikke nøklet til en hemmelighet. Sett den før prod.
- **Deploy edge functions** som ble endret i CORS-konsolideringen (F3):
  `decrypt-tip-email`, `newsletter-manage`, `generate-article-audio`,
  `clone-author-voice`, `daily-edition` — de bruker nå allowlist-CORS
  (`_shared/cors.ts`) i stedet for `*`. Bekreft at `ALLOWED_ORIGINS` dekker
  prod-domenet når det settes.

### Seksjons-admin + region-filter (2026-06-09)
Fire fikser i denne runden (egne PR-er):
- **Kjør migrasjon** `20260609120000_category_admin_rpcs.sql` mot prod. Den legger
  til `rename_category()` + `merge_categories()` (SECURITY DEFINER, admin-only).
  **Seksjons-admin (rediger/slå sammen) virker ikke før denne er kjørt** — RPC-ene
  finnes ikke i prod ennå.
- **Regenerer typer** etterpå: `supabase gen types` → `src/integrations/supabase/types.ts`.
  Da kan `(supabase as any).rpc(...)`-castene i `SectionsManager.tsx` byttes til typede kall.
- **Region-data (din opprydding):** byttet-til-region viser nå riktig innhold i
  feeden, men dataene matcher ikke «resten skal være tomme». Prod 2026-06-09:
  7 publiserte artikler har `region_slug = NULL`, og `article_shared_regions` sprer
  saker til midt-norge (5), østlandet (2), vestlandet/nord-norge/sørlandet (1 hver).
  Rydd via admin/SQL: sett de 7 NULL-artiklene til riktig region, og fjern delinger
  unntatt den ene Nordvestlandet+Midt-Norge-saken du nevnte. (Jeg rører ikke prod-data.)
- **Per-region abonnement:** designnotat skrevet i
  [`docs/per-region-subscription-design.md`](per-region-subscription-design.md) —
  trenger dine svar på 5 beslutninger før kode (Stripe + RLS, begge «spør først»).

### Kostnadskontroll på AI/APIer (2026-06-09) — ingen akutt $-lekkasje, men hull
Full analyse i [`docs/kostnadsoversikt.md`](kostnadsoversikt.md). Prod-verifisert:
alle dyre AI-endepunkter krever JWT (ikke vidåpne). Restrisiko = innlogget/anon-nøkkel-
bruker som spammer AI, siden følgende mangler:
- **Krever din handling (utenfor kode):** sett **budsjett-alarm** i OpenRouter,
  ElevenLabs og Supabase-dashbordene. Ingenting i koden varsler på forbruk i dag
  (Sentry fanger kun feil).
- **Beslutning du må ta:** skal `improve-article-body` fortsette på `gemini-2.5-pro`
  (dyrest modell, ~3× flash), eller settes til flash? Og er feature-flag-av nok for
  `idrett-chat` (eneste åpne AI-endepunkt), eller vil du at jeg stenger/rate-limiter det?
- **Kode jeg kan ta når du sier fra:** default `max_tokens` i `_shared/ai-client.ts`,
  per-IP rate-limit på `brreg-proxy`, og evt. per-bruker AI-kvote.
- **Drift-funn:** prod har en edge function som ikke finnes i repoet —
  `detect-barometer-signals` (`verify_jwt=false`). Vurder å slette den fra Supabase
  hvis den er utdatert, ev. legg kilden tilbake i repoet (jf. `brreg-query`-saken under).

### Av-deploy `idrett-chat` fra prod (2026-06-09)
`idrett-chat` (eneste åpne AI-endepunkt, utdatert Eliteserien-data 2020–2023) er
**slettet fra repoet** + fjernet fra `config.toml`. Men å slette kilden av-deployer
den **ikke** fra Supabase — funksjonen ligger igjen i prod (samme som `brreg-query`).
- **Gjør:** Slett i Supabase-dashbordet (Edge Functions → `idrett-chat` → delete),
  ev. `supabase functions delete idrett-chat --project-ref oemzrhlybemakwpyhcno`.
  Lav risiko: ingen frontend-kode kaller slug-en (verifisert med grep).
- **NB CLAUDE.md:** dette overstyrer antagelse #2 ("Ikke slett" for idrett). Den
  bredere idrett-frontfeaturen (FEATURE_IDRETT-flagg, evt. Idrett-side) er IKKE rørt —
  kun chat-backenden. Si fra om du vil at jeg også oppdaterer CLAUDE.md / fjerner
  resten av idrett-frontend.

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

## Proveniens-endepunkt (Trinn 3+4, 2026-06-08)

- [ ] **Kjør migrasjon** `20260608140000_provenance_endpoint_infra.sql` (rate-limit
      + tilgangslogg) mot prod — venter på din godkjenning av skjemaet.
- [ ] **Deploy edge function** `article-provenance` (config.toml har verify_jwt=false).
- [ ] **Sett `SITE_URL`** som secret på edge functions (full URL, f.eks.
      `https://naernaering.no`) — brukes i `article.url` og `editorial_standards`.
      Default i koden er `https://naernaering.no`.
