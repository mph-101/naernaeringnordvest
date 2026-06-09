# CLAUDE.md — Arbeidsinstruksjoner for Claude Code

> Dette dokumentet ligger i roten av repoet og leses av Claude Code ved oppstart av hver økt. Det erstatter ikke en grundig gjennomlesing av kodebasen, men gir nødvendig kontekst og spilleregler.

---

## Hva dette prosjektet er

**Nær Næring Nordvest** er en regional næringslivsavis for Møre og Romsdal, første utgivelse i en planlagt kjede av regionale aviser (Nær Næring Nord, Midt, Øst, Vest). Bygget av Magnus Peter Harnes (CEO, ansvarlig redaktør) — som også er den primære utvikleren. Dette er ikke et team-prosjekt. Du jobber direkte med Magnus.

Stack i dag: Vite + React + React Router + Supabase (Postgres + Auth + Storage + Edge Functions) + Stripe via Lovable-gateway + Tailwind + shadcn/ui + tiptap.

Stack vi flytter mot: Next.js App Router (Vercel) + samme Supabase + Stripe direkte + samme komponentbibliotek. Migreringen er gradvis, ikke big-bang.

---

## Antagelser dette dokumentet bygger på

Disse er besluttet sammen med Magnus før Claude Code begynner. Hvis noen av disse endrer seg, må dokumentet oppdateres FØR videre arbeid.

1. **Tipskanal i fase 1:** Ærlig downgrade — fjern løftet om kildebeskyttelse, erstatt med Signal-nummer for sensitive saker. GlobaLeaks vurderes i fase 4.
2. **Hjernevelvet, mascot, games:** Parkeres bak feature flags. Koden beholdes, men rutene skjules ved lansering. Ikke slett. **Idrett er unntaket:** sports-/fotballfeaturen var rester av et tidligere prosjekt og er fjernet helt (2026-06-09) — `idrett-chat`-edge-funksjonen, Idrett/KlubbProfil/Sammenlign-visningene, `clubs.ts` og `FEATURE_IDRETT`. `/idrett*`-URL-er redirecter til `/tall`.
3. **Multi-region:** Bygges nå, før lansering. Nordvest blir første region i et multi-tenant skjema.
4. **Lovable:** Vi forlater plattformen. Stripe-kall går direkte til Stripe (ikke via `connector-gateway.lovable.dev`). Lovable-spesifikke pakker fases ut.
5. **Arbeidsflyt:** PR-basert. Aldri push direkte til `main`. Hver PR er fokusert på én oppgave fra arbeidslisten under.
6. **Tidshorisont:** Lansering siktes mot ~14 uker. Magnus jobber rundt 30 timer i uka på dette ved siden av annet.

---

## Spilleregler for Claude Code i dette prosjektet

### Aldri uten å spørre

- Aldri kjør `git push --force` på `main` eller delte brancher
- Aldri slett Supabase-migrasjoner, selv om de ser overflødige ut (de er kjørt i prod)
- Aldri rotér eller endre Stripe-keys, Supabase service_role-keys eller andre secrets
- Aldri push commits med hemmeligheter, selv `pk_test`-keys (de hører i `.env.local` ikke i koden)
- Aldri kjør destructive SQL (`DROP`, `TRUNCATE`, `DELETE FROM` uten WHERE) mot prod-databasen
- Aldri commit `.env`, `.env.development`, `.env.local`, `.env.production`

### Alltid

- Les denne filen ved oppstart av hver økt
- Sjekk `docs/decisions.md` for arkitekturbeslutninger som er tatt (hvis du ikke finner filen, opprett den med en tom mal)
- Følg eksisterende kodemønstre i repoet — ikke introduser nye biblioteker uten å diskutere
- Skriv tester for ny logikk i sikkerhetskritiske områder (abonnement, auth, tips)
- Bruk norsk språk i UI-tekst (med engelsk fallback der `language === "en"`-pattern er etablert)
- Norsk bokmål i kommentarer og commit-meldinger som handler om redaksjonelle/produkt-valg
- Engelsk i kommentarer og commit-meldinger som handler om kode/teknikk

### Når du er usikker

Spør Magnus før du tar avgjørelsen. Han er teknisk og foretrekker korte direkte spørsmål framfor at du tar arkitekturvalg på egenhånd. Eksempler på ting som ALLTID skal forelegges:

- Ny database-tabell eller endring av eksisterende skjema
- Ny ekstern avhengighet (`npm install ...`)
- Endring av RLS-policies
- Endring i Stripe-integrasjonen utover ren refaktorering
- Endring i tips-håndtering (følsomt område — kildebeskyttelse)
- Endring av routing-struktur (URL-er er en redaksjonell beslutning, ikke teknisk)

---

## Arkitekturoversikt

```
naernaeringnordvest/
├── src/
│   ├── App.tsx              # React Router-oppsett (alle ruter her)
│   ├── pages/               # Side-komponenter
│   ├── components/
│   │   ├── admin/           # CMS-komponenter (ArticleEditor er 2341 linjer — må splittes)
│   │   ├── ui/              # shadcn/ui base-komponenter
│   │   └── ...              # Domene-komponenter (NewsFeed, TipForm, ConversationView)
│   ├── hooks/               # useAuth, useTheme, useSubscription
│   ├── integrations/
│   │   └── supabase/        # Generert types + client
│   ├── lib/                 # Forretningslogikk og hjelpere
│   └── data/                # Statisk data (clubs, regions)
├── supabase/
│   ├── migrations/          # 57 migrasjoner per 16.05.2026 — kjør aldri av-rekkefølge
│   └── functions/           # 37 Edge Functions
└── public/                  # Statiske assets
```

### Sentrale Supabase-mønstre brukt i prosjektet

**Roller:** `user_roles`-tabell med `app_role` enum (`admin`, `editor`, `journalist`, `reader`, `subscriber`, `contributor`, `business`). Aldri INSERT/UPDATE på user_roles fra klienten — alltid via `admin_grant_role` / `admin_revoke_role` RPC-funksjoner med SECURITY DEFINER.

**RLS:** SECURITY DEFINER-funksjoner brukes for å unngå rekursjon (`has_role`, `is_group_member`, `is_group_admin`). Følg dette mønsteret når du legger til nye relasjonsbaserte policies.

**Edge Functions:** Bruker `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` for service-role-tilgang. Caller-identitet verifiseres ved å lage en `userClient` med Authorization-header og kalle `auth.getUser()`. Mønsteret finnes i `admin-create-user/index.ts`.

**Stripe:** I dag via `connector-gateway.lovable.dev`. Skal byttes til direkte. Webhook-verifikasjon i `_shared/stripe.ts` følger Stripe's signaturmønster (timestamp + HMAC-SHA256).

---

## Arbeidsliste, fase for fase

Hver oppgave under er én PR med mindre annet er spesifisert. Når du fullfører en oppgave, marker den som ferdig i `docs/progress.md` med dato og PR-lenke.

### Fase 1 — Sikkerhets-sprint (uke 1-2)

Mål: kritiske sikkerhetshull fikset uten andre endringer.

#### 1.1 Fjern villedende kildebeskyttelses-løfter
- Endre `src/components/TipForm.tsx`:
  - Fjern teksten "kryptert og kan ikke spores tilbake til deg"
  - Erstatt med: "Tipset sendes over en sikker forbindelse. For sensitive saker hvor full kildebeskyttelse er kritisk, kontakt redaksjonen via Signal: [Signal-nummer kommer] eller fysisk møte med en journalist."
  - Samme på engelsk i `labels`-objektet
- Endre `is_anonymous` i submit-tip til `true` kun hvis ingen `follow_up_email` er oppgitt — anonymitet og oppfølgings-email er gjensidig utelukkende. Hvis e-post oppgitt, sett `is_anonymous: false`.
- Legg til en infoseksjon i tip-form som forklarer hva som logges (IP hos infrastruktur-leverandører, transport-kryptering, ikke ende-til-ende)

#### 1.2 Krypter `follow_up_email` ved hjelp av libsodium sealed boxes
- Lag ny migrasjon: legg til `follow_up_email_encrypted bytea`, behold `follow_up_email TEXT` midlertidig
- Generer keypair for redaksjonen, lagre publickey i Edge Function env, privatkey distribueres manuelt til journalister
- Modifiser `submit-tip` Edge Function til å kryptere e-post før insert
- Lag en `decrypt-tip-email` Edge Function som krever admin/journalist-rolle og privatkey-passord
- Etter migrering: slett `follow_up_email`-kolonnen
- **Forelegg arkitekturen til Magnus før kode skrives** — keypair-håndtering er kritisk

#### 1.3 Stripe-webhook idempotency
- Lag ny migrasjon: `stripe_events`-tabell med `event_id PRIMARY KEY`, `type`, `processed_at`, `payload jsonb`
- Modifiser `payments-webhook/index.ts`:
  - Før handler-switch: INSERT i `stripe_events`, fang `23505` (unique violation), returner tidlig hvis duplikat
  - Etter handler: oppdater `processed_at`
- Skriv test i Vitest som simulerer dobbel webhook med samme event_id

#### 1.4 Fix Admin.tsx rolle-sjekk
- I `src/pages/Admin.tsx`: bytt `setHasRole(!!roles && roles.length > 0)` med eksplisitt sjekk for `admin`, `editor`, eller `journalist`
- Skriv en `useAdminAccess` hook som returnerer `{ loading, hasAccess, role }` — gjenbrukes andre steder
- Sett en `Forbidden`-komponent som vises hvis bruker er innlogget men mangler rolle

#### 1.5 .env ut av git
- Legg til `.env*` i `.gitignore`
- `git rm --cached .env .env.development`
- Lag `.env.example` med tomme verdier og kommentarer som forklarer hver variabel
- Oppdater README med oppsett-instruksjoner
- **Magnus må rotere `VITE_SUPABASE_PUBLISHABLE_KEY` i Supabase dashboard etterpå** — denne er ikke hemmelig, men det er god praksis

#### 1.6 Stripe direkte (fjern Lovable-gateway)
- Modifiser `supabase/functions/_shared/stripe.ts`:
  - Fjern `GATEWAY_STRIPE_BASE`-rerouting
  - Bruk `new Stripe(getEnv("STRIPE_SECRET_KEY"), { apiVersion: "..." })` direkte
  - Erstatt `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY` med `STRIPE_TEST_SECRET_KEY` / `STRIPE_LIVE_SECRET_KEY`
- Magnus må sette nye secrets i Supabase: `STRIPE_TEST_SECRET_KEY`, `STRIPE_LIVE_SECRET_KEY`, beholde `PAYMENTS_SANDBOX_WEBHOOK_SECRET` og `PAYMENTS_LIVE_WEBHOOK_SECRET`
- Fjern `@lovable.dev/cloud-auth-js` fra `package.json` hvis ikke brukt andre steder (verifiser med grep først)
- Test grundig i sandbox før merge

#### 1.7 CORS-låsing
- Legg til `ALLOWED_ORIGINS` env-var i Edge Functions
- Erstatt `Access-Control-Allow-Origin: "*"` med dynamisk sjekk mot `req.headers.get("origin")`
- Lokal dev: tillat `localhost:5173`, `localhost:3000`
- Produksjon: kun `naernaering.no` (eller hva domenet blir) og preview-deployments

#### 1.8 Sentry-oppsett
- Legg til `@sentry/react` på frontend, `@sentry/deno` på Edge Functions
- DSN i env-var, aldri hardkodet
- Source maps lastes opp ved bygg
- Filtrer ut støy-feil (network errors, ResizeObserver) før send

**Fase 1 leveranse:** Sikkerhetspatch deployet til staging. Magnus tester manuelt og godkjenner før fase 2 starter.

---

### Fase 2 — Kjede-arkitektur (uke 3-5)

Mål: skjemaet støtter multi-region drift før vi lager noe nytt på toppen.

#### 2.1 Designdokument først
- Skriv `docs/multi-region-design.md` med:
  - Hvordan `regions`-tabellen ser ut
  - Hvilke tabeller får `region_id` (artikler, abonnement, stillinger, grupper, events, panel, hjernevelv)
  - Hvordan stamme-sak modelleres: én sak med `origin_region_id` og mulig `shared_to_regions[]`, eller separate rader per region som peker på en `master_article_id`?
  - Hvordan brukere håndteres: én konto på tvers, men abonnement er per-region — kan en bruker ha Nordvest-abonnement og Østlandet-abonnement separat?
  - Hvordan redaktøransvar er isolert juridisk (kobling til utgiverselskap per region)
- **Forelegg dokumentet til Magnus før migrasjoner skrives.** Dette er forretningsmodellbeslutninger, ikke tekniske.

#### 2.2 Implementer skjemaendringer
- Migrasjoner for `regions`-tabell, seed med Nordvest
- Legg til `region_id` på relevante tabeller med default Nordvest for eksisterende rader
- Oppdater RLS-policies til å håndtere region-tilhørighet
- Oppdater TypeScript-typer (generer på nytt med `supabase gen types`)

#### 2.3 Frontend regionalt skall
- Domain-routing: `nordvest.naernaering.no` (eller `naernaering.no/nordvest`?) — diskuter med Magnus
- Region-kontekst som React Provider, leveres til alle komponenter
- Header viser tydelig hvilken region brukeren er i
- "Bytt region"-meny der det er relevant (i framtidig multi-region-fase)

---

### Fase 3 — Next.js-migrering (uke 6-9)

Mål: ny stack med SEO-vennlig rendering.

#### 3.1 Sett opp Next.js-prosjekt
- Ny `app/`-mappestruktur parallelt med eksisterende `src/`
- Konfigurer Tailwind, shadcn/ui, Supabase-client (server + client)
- Sett opp middleware for auth-sjekk
- Konfigurer Vercel-deployment med preview-branches

#### 3.2 Flytt statiske sider først
- `/om-oss`, `/kontakt`, `/redaksjonelle-prinsipper`, `/personvern`, `/vilkar`, `/innholdsmerking`, `/eierskap`, `/cookies`, `/tilgjengelighet`, `/team`
- Alle disse rendres statisk med generateStaticParams

#### 3.3 Flytt artikkel-rendering
- `/sak/[slug]` med ISR (revalidate: 60 sek, on-demand når artikkel publiseres/redigeres)
- Generer Open Graph-tags, JSON-LD Article schema, kanonisk URL
- 301-redirect fra gamle `/article/:id` URL-er til nye slug-URL-er
- Sjekk at preview-modus virker for redaksjonen (utkast-visning)

#### 3.4 Flytt forsiden og oversikter
- `/` (forside med NewsFeed, MarketTicker, TrendingSection)
- `/tag/[slug]`
- `/stillinger`, `/arrangementer`
- `/abonnement` (statisk produktbeskrivelse, dynamic checkout)

#### 3.5 Flytt brukerflyter (CSR)
- `/login`, `/profil`, `/reset-password`, `/velkommen`
- `/grupper/*`, `/mine-delte-notater`
- Disse er bak auth og trenger ikke SSR

#### 3.6 Flytt admin sist
- Hele `/admin/*` forblir CSR
- Mens du gjør dette, splitt `ArticleEditor.tsx` (2341 linjer) i mindre komponenter:
  - `ArticleEditorShell.tsx` (orchestrator)
  - `ArticleEditorBody.tsx` (tiptap-redaktør)
  - `ArticleAIPanel.tsx` (AI-utkast, key points, subheadings)
  - `ArticleMetaPanel.tsx` (tagger, kategori, faktabokser)
  - `ArticlePublishPanel.tsx` (PrePublishChecklist, scheduling)
- Tilsvarende for `ConversationView.tsx` (1112 linjer) — splitt etter ansvarsområde

#### 3.7 Skjul parkerte features bak feature flags
- Lag `src/lib/features.ts` med boolean flags lest fra env-vars
- `FEATURE_IDRETT`, `FEATURE_HJERNEVELV`, `FEATURE_MASCOT`, `FEATURE_GAMES`
- Skjul ruter i App-routingen, skjul navigasjon i Header
- Settings i Vercel: alle disse `false` for produksjon, `true` for staging slik at de kan utvikles videre

---

### Fase 4 — Pre-launch hardening (uke 10-12)

#### 4.1 Sikkerhetsgjennomgang
- Kjør `npm audit` og adresser kritiske
- Verifiser alle RLS-policies manuelt med en intern test-bruker som mangler roller
- Kjør OWASP ZAP eller lignende mot staging
- Sjekk at alle Edge Functions har input-validering med zod
- Verifiser at Supabase Realtime ikke lekker data (kun `group_messages` skal være på `supabase_realtime`-publication)

#### 4.2 GDPR-rutiner
- `/min-konto/eksporter-data` — Edge Function som returnerer alt om brukeren som JSON
- `/min-konto/slett-konto` — soft delete med 30-dagers grace, deretter hard delete
- Samtykke-logger for nyhetsbrev, analytikk
- Personvern-side oppdatert til faktisk datapraksis

#### 4.3 Redaktørplakat-implementering
- `audit_log`-tabell som logger alle publiseringer, endringer, slettinger med `actor_id`, `action`, `target_id`, `before`, `after`, `timestamp`
- Vis "Publisert av X, sist endret av Y" på artikler i admin-UI
- Hver region peker på sitt juridiske utgiverselskap i `regions`-tabellen
- Impressum-tekster genereres dynamisk per region

#### 4.4 Backup og DR
- Verifiser at Supabase backup-rutiner kjører (Pro-plan har daglig)
- Test restore mot en throwaway-instans
- Dokumenter DR-prosedyre i `docs/disaster-recovery.md`
- Sett opp Cloudflare foran Vercel for ekstra DDoS-beskyttelse

#### 4.5 Beta
- Inviter 20-30 betatestere fra Møre og Romsdal
- Magnus håndterer rekruttering; du leverer en feedback-form og en lukket Slack/Discord eller bare e-post-flyt
- Daglig debrief-runde gjennom Magnus i 2 uker
- Fiks-iterasjoner fortløpende

---

### Fase 5 — Lansering (uke 13-14)

#### 5.1 Stripe live-mode
- Magnus aktiverer live-mode i Stripe dashboard
- Sett `STRIPE_LIVE_SECRET_KEY` og `PAYMENTS_LIVE_WEBHOOK_SECRET` i Supabase
- Endre `VITE_PAYMENTS_CLIENT_TOKEN` til `pk_live_...` i produksjon
- Test en ekte transaksjon med Magnus' eget kort, refundér umiddelbart

#### 5.2 DNS og produksjon
- Pek domenet mot Vercel
- Verifiser TLS-sertifikater
- Verifiser at Sentry mottar feil fra produksjon
- Verifiser at observabilitet (Vercel Analytics + Supabase metrics) er på

#### 5.3 Innholdspipeline
- Magnus publiserer 5-10 startartikler
- Verifiser at Spør-arkivchat indekserer disse korrekt
- Verifiser at sosial deling fungerer (Open Graph på Facebook, Twitter Card, LinkedIn)

#### 5.4 Lansering
- Pressemelding ut (Magnus håndterer)
- Overvåk Sentry og Supabase aktivt første 48 timer
- Vær klar for hotfix-PR-er

---

## Kjente fallgruver i denne kodebasen

Disse er ikke bugs som skal fikses umiddelbart, men ting du må være obs på:

- **`Admin.tsx`-mønsteret er fragilt.** Tilgangskontroll skjer i RLS, ikke i UI. Hvis du legger til nye admin-funksjoner, bekreft alltid med RLS-policy, ikke bare UI-sjekk.
- **Edge Functions bruker både `npm:` og `https://esm.sh/`** for samme pakker (`@supabase/supabase-js` for eksempel). Standardiser på `npm:`-spec for nyere Deno-kompatibilitet ved migrering.
- **`is_anonymous` på tips er ikke ekte anonymitet.** Det er en boolean i databasen, ikke en garanti.
- **`articles.author` er en TEXT-felt**, ikke en foreign key til `profiles`. Det er bevisst (forfattere kan være eksterne bidragsytere), men det betyr du må håndtere konsistens manuelt.
- **`ArticleEditor.tsx` har gjenstander og state som glir mellom AI-funksjoner.** Når du splitter den, vær ekstra forsiktig med å bevare state-flyt mellom AI-utkast, key points-generering og publisering.
- **Realtime er på `group_messages`.** Hvis du legger til realtime på andre tabeller, sjekk RLS NØYE — Realtime respekterer RLS, men feiler i stillhet hvis policies er feil.
- **Supabase migrations kjøres i alfabetisk rekkefølge.** Datostempler er kritiske. Aldri rediger en allerede-kjørt migrasjon — skriv en ny.

---

## Kvalitetskrav på PR-er

Hver PR skal:

- Ha en tittel som beskriver _hva_ (f.eks. "feat(tips): krypter follow_up_email med libsodium")
- Ha en beskrivelse som forklarer _hvorfor_ og refererer til oppgave-nummer fra denne filen
- Inkludere tester for ny logikk i sikkerhetskritiske områder (auth, tips, abonnement, RLS)
- Passere `npm run lint` og `npm run test`
- Ikke endre `package.json` med mindre det er nødvendig — og da nevne det i PR-beskrivelsen
- Ikke endre migrasjoner som allerede er kjørt i prod

Magnus reviewer alle PR-er før merge. Det betyr: ikke press for stor PR. 200-500 linjer er gullsonen.

---

## Kommunikasjonsmønstre

- Når du er i tvil om en arkitektur-beslutning: **spør først, kod etterpå.**
- Når du finner noe som ser ut som en bug i eksisterende kode: **flagg det, ikke bare fiks det.** Magnus vil vurdere om det er en bug eller bevisst valg.
- Når du skal gjøre noe stort (ny tabell, ny ekstern integrasjon, endring i auth-flyt): **skriv et kort designdokument i `docs/`** og få godkjenning før implementasjon.
- Når du fullfører en oppgave: **oppdater `docs/progress.md`** med dato, hva som ble gjort, og hvilke filer som ble endret.
- Når noe trenger Magnus' handling utenfor kode (rotere secret, aktivere Stripe live, godkjenne i Supabase dashboard): **sett en tydelig TODO i `docs/magnus-todo.md`**.

---

## Domene-ordliste (norsk → forklaring)

- **Næringsavis** — business news publication
- **Forretningsplan** — business plan
- **Stamme-sak** — trunk article (deles på tvers av regioner med lokal kommentar-overlay)
- **Bedriftsabonnement** — corporate subscription (multi-seat)
- **Ansvarlig redaktør** — editor-in-chief (juridisk ansvarlig)
- **Redaktørplakat** — Norwegian editorial independence charter
- **Vær Varsom-plakaten** — Norwegian press ethics code
- **Næringslivspanel** — business sentiment panel
- **Hjernevelvet** — opinion/essay section (parkeres ved lansering)
- **Tipskanal** — anonymous tip line
- **Spør** — AI-powered Q&A against article archive
- **Stillingsmarked** — job listings
- **Faktaboks** — factbox (sidebar info)
- **Brønnøysund** — Norwegian business registry

---

## Versjonshistorikk for dette dokumentet

- **2026-05-16:** Initial versjon. Etablerer fase 1-5 plan og arbeidsregler.
- **2026-06-09:** Antagelse #2 oppdatert — idrett fullt fjernet (var rester av tidligere prosjekt); hjernevelv/mascot/games fortsatt parkert.
