# Progress

## Bolk 6 — ytelse: indekser + liste-select-innsnevring (2026-07-07)

- **Bolk 6 (beslutninger: 6a/6c ja, 6b init-plan utsatt til etter launch, 6d noteres kun)** — 2026-07-07, branch `perf/bolk6-indexes-and-selects`
  - Migrasjon `20260707150000_bolk6_performance_indexes.sql` (additiv): de 13 uindekserte FK-ene fra prod-advisor (bl.a. `tips.reviewed_by`, `group_messages.group_id/article_id`, `job_listings.employer_profile_id`, `articles.created_by`); partial `tips(status) WHERE status='new'` (admin-badge); partial `articles(published_at DESC) WHERE published` (kanonisk feed-query); funksjonell `business_accounts(lower(email_domain))` (matcher `has_active_subscription`-oppslaget som ellers seq-scanner inne i RLS).
  - 6c: `NewsFeed` (40 rader) og `TrendingSection` (via ny `PUBLISHED_ARTICLE_LIST_SELECT`) henter ikke lenger `body`/`body_en`; `fetchPublishedJobs` bytter `select("*")` → navngitte kolonner uten `description_html`. `toUiArticle` tåler radene uten body (excerpt-fallback); `description_html` er valgfri i `JobListing`-typen med guards i `StillingDetail`/JSON-LD. `feed-api` beholder body bevisst (API-kontrakt; premium alt gated i bolk 3b).
  - Verifisert: `tsc --noEmit` rent, eslint 0 errors, vitest 127/127. Browser-verifisert i preview: forside-queryene går uten `body` (begge selects inspisert i nettverket), «Trending nå»/«Siste nyheter» rendrer, `/stillinger` uten `description_html`, null konsollfeil.
  - **Gjenstår:** migrasjon mot prod (Magnus' go) — deretter `explain` mot feed/tips/domene-query for å bekrefte indeksbruk. 6d (71 ubrukte indekser) bevisst urørt til etter launch.

## Bolk 2 — robusthet: timeouts mot eksterne API-er (2026-07-07)

- **Robusthet/timeouts** — 2026-07-07, branch `robustness/external-api-timeouts` (fra code review 2026-07-06)
  - Deno-`fetch` har ingen default-timeout → et hengt oppstrøms (socket åpen, ingen respons) blokkerte hele edge-invokasjonen til plattformen drepte den. La til `AbortSignal.timeout()` på de delte hjelperne som arves av ~15 funksjoner: `_shared/ai-client.ts` (chat 60s / streaming 120s, env-overstyrbar) og `_shared/ssb.ts` (10s). Env leses inne i funksjonene (ikke på modulnivå) så vitest-suiten som importerer `resolveMaxTokens` ikke brekker.
  - `brreg-proxy`: ny lokal `brregGet()` som setter 8s-timeout, guarder `res.ok` og fanger `res.json()`-parsefeil (BRREG-feilside kastet før rå `SyntaxError`); alle 9 fetch-steder rutet gjennom den. `while(true)`-regnskapsloopen fikk hard `BRREG_MAX_PAGES`-cap (speiler Python-scriptets `PAGINATION_CAP`). BRREG-heng kaskaderte tidligere inn i hengt `articles-chat`.
  - `extract-source` + `extract-source-async`: 10s-timeout på URL-hentingen (async-varianten strandet ellers kilde-rader i `status:"processing"`).
  - Verifisert: eslint 0 errors (uendret warning-count), vitest 130/130, `deno check` rent på alle 5 filer.
  - **Bolk 2b (gjenstår, egen PR):** streaming-feil-event i `articles-chat` (avkortet svar svelges), timeout på interne chat-hopp, retry/backoff i `scripts/jobbytte_diff.py`, Sentry breadcrumb-scrubbing, `refresh-mr-employers` paginerings-cap.
## Full code review + bolk 1-herding (2026-07-06)

- **Code review (kartlegging, ingen kode)** — 2026-07-06
  - Full gjennomgang av 47 edge functions, ~95 migrasjoner, frontend + Python-script over 6 kategorier (sikkerhet, datamodell, feilhåndtering, arkitektur, ytelse, vedlikehold). 5 parallelle review-strømmer + direkte verifisering mot prod (`oemzrhlybemakwpyhcno`): RLS-policyer, advisors, cron, storage-bøtter, `validate_api_key`, rate-limit-race.
  - Hovedfunn (topp 5): Stripe-webhook returnerer 200 ved feilet skriv; `profiles` UPDATE mangler WITH CHECK; «kun mennesker publiserer» ikke håndhevet i kode; `feed-api` lekker premium-body (validate_api_key sjekker ikke aktiv sub); ingen timeout på eksterne kall. Kildevern, admin-tilgang og Stripe-idempotens-fundament bekreftet solide.
  - Bekreftet mot prod: `supabase_realtime`-publiseringen er tom (tips streamer ikke — bra; admin-badge-realtime er dødt; CLAUDE.md-påstand utdatert). Lagret i minne.
- **Bolk 1 — live, lav-risiko herding** — 2026-07-06, branch `security/bolk1-live-hardening` (PR #139)
  - Én migrasjon `20260706120000_bolk1_live_hardening.sql`: (1) `profiles` UPDATE får `WITH CHECK (auth.uid() = user_id)` (lukker row-hijack); (2) fjerner brede list-SELECT-policyer på alle 6 public storage-bøtter (stopper enumerering av upubliserte utkast-bilder); (3) fast `search_path` på `slugify_display_name`.
  - Designnotat: `docs/security-bolk1-live-hardening.md`. Verifisert: eslint 0 errors, vitest 130/130. **Gjenstår:** anvend migrasjon mot prod etter review (venter på Magnus' go); slå på Leaked Password Protection (magnus-todo).

## Sikkerhetsgjennomgang abonnement/API/paywall (2026-06-10)

- **F7 — per-nøkkel rate-limit på feed-api** — 2026-06-10, branch `security/f7-feed-api-rate-limit` (Magnus valgte alt. a)
  - Ny tabell `api_key_rate_limits` (migrasjon `20260610150000`): vindusteller per API-nøkkel, FK → `api_keys` med CASCADE, RLS uten policies (kun service-role) — samme mønster som `tip_rate_limits`.
  - Ny `_shared/rate-window.ts` (`evaluateRateWindow` — ren, testbar fixed-window-logikk). `feed-api` håndhever 300 kall/time per nøkkel; over grensen → 429 med `Retry-After`. Feiler åpent hvis tabellen mangler (ingen brudd for abonnenter).
  - Tester: `src/test/rate-window.test.ts` (5 stk — bump, cap, vindusreset, grenseverdi, avrunding). `deno check` rent.
  - Utrulling: migrasjon kjørt mot prod 2026-06-10; `feed-api` deployes etter merge.

- **F5 + F6 — herding (input-validering + webhook-idempotens)** — 2026-06-10, branch `security/f5-f7-hardening`
  - **F5:** ny `_shared/validate-chat.ts` (`validateChatMessages` — form + størrelsesgrenser: maks 50 meldinger, 8000 tegn/melding, 24000 totalt). `articles-chat` bruker den før kall til AI-gatewayen, så ugyldig form/stort fritekst-input avvises (DoS/kost-misbruk). Vitest: `src/test/validate-chat.test.ts`.
  - **F6:** `payments-webhook` re-prosesserer nå en webhook hvis et tidligere forsøk crashet etter `stripe_events`-insert men før `processed_at` ble satt (skipper kun når `processed_at` finnes). Handlerne er idempotente (upserts), så re-prosessering er trygt.
  - **F7 (feed-api per-nøkkel rate-limit): IKKE gjort — krever DB-migrasjon (din godkjenning).** Se magnus-todo. `api_keys` har `request_count`/`last_used_at` men ingen vindusteller; en ekte rate-limit trenger ny tabell eller endring av `validate_api_key`-RPC. Lav severity (krever gyldig abonnent-nøkkel).
  - Verifisert: `tsc` rent, eslint 0 errors, vitest grønt.
- **F1 — Stripe-miljø bestemmes server-side (ikke av klienten)** — 2026-06-10, branch `security/f1-stripe-env-server-side`
  - Bakgrunn: klienten sendte selv `environment` til checkout/portal, så en bruker kunne (når Stripe er live) kjøre sandbox-checkout med testkort og få ekte tilgang i prod. Ingen aktiv risiko i dag (Stripe ikke satt opp), men pre-launch-gate.
  - Beslutning (Magnus): valg A = alt. 1 (egen sandbox-DB/blokker i prod), fjern environment fra klient nå.
  - Ny `stripeEnvironment()` i `_shared/stripe.ts` (leser `STRIPE_ENVIRONMENT`, default `sandbox`). Fjernet `environment` fra `BodySchema` i `create-checkout`, `create-portal-session`, `create-job-premium-checkout`, `create-event-featured-checkout`; alle utleder nå miljø server-side.
  - `payments-webhook`: ny guard som ignorerer events hvis `?env` ≠ `STRIPE_ENVIRONMENT` (blokkerer sandbox-events i prod selv om korrekt signert).
  - Klient: fjernet `environment: getStripeEnvironment()` fra alle 5 checkout/portal-kall (SubscriptionSection, StripeEmbeddedCheckout, JobPremiumCheckout, EventFeaturedCheckout, BusinessPanel). `getStripeEnvironment` beholdt for lese-filter i `useSubscription` + testbanner.
  - Verifisert: `tsc --noEmit` rent, eslint 0 errors, vitest grønt. Ingen lese-side migrasjon (alt. 1 ⇒ prod = kun live).
- **F2 — krypter tips-e-post ved innsending + dekrypt-UI i admin** — 2026-06-10, branch `security/f2-encrypt-tip-email`
  - Bakgrunn: `submit-tip` skrev `follow_up_email` i klartekst selv om kryptert kolonne (`follow_up_email_encrypted bytea`) og `decrypt-tip-email` allerede fantes. Kildebeskyttelse (CLAUDE.md fase 1.2).
  - Ny `_shared/tip-crypto.ts` (`sealEmailToBytea` — libsodium `crypto_box_seal`, returnerer Postgres bytea-hex `\x…`). `submit-tip` krypterer nå e-posten til `follow_up_email_encrypted` og skriver aldri klartekst. Feiler lukket (503) hvis `TIP_ENCRYPTION_PUBLIC_KEY` mangler — aldri klartekst-fallback.
  - `TipsList.tsx`: erstattet klartekst-`mailto` med «Dekrypter e-post»-dialog (lim inn privatnøkkel → `decrypt-tip-email` → viser e-post + mailto). Vises kun når tipset har kryptert e-post.
  - Tester: `_shared/tip-crypto.test.ts` (deno, manuell — kjør `deno test --node-modules-dir=auto …`): seal→open rundtur + at feil nøkkel ikke åpner. `tsc --noEmit` rent, eslint 0 errors, vitest 115/115.
  - Ikke verifisert i browser: dekrypt-dialogen krever innlogget admin + et tips med kryptert e-post (deploy + privatnøkkel). Krypto-korrektheten er dekket av deno-rundturtesten.
- **F3 + F4 — CORS-konsolidering + salt-hygiene** — 2026-06-10, branch `security/f3-f4-cors-salt-hygiene`
  - F3: Erstattet hardkodet wildcard-CORS (`Access-Control-Allow-Origin: *`) med allowlist via `_shared/cors.ts` i `decrypt-tip-email`, `newsletter-manage`, `generate-article-audio`, `clone-author-voice`, `daily-edition`. `article-provenance` beholder bevisst åpen CORS (offentlig endepunkt, dokumentert). `json`-hjelperne flyttet inn i handleren (per-request `corsHeaders(req)`, trygt under samtidighet).
  - F4: Ny `_shared/hash.ts` (`hashIp(ip, salt)` + `rateLimitSalt()`); `submit-tip` og `article-provenance` bruker nå `RATE_LIMIT_SALT` i stedet for `SUPABASE_SERVICE_ROLE_KEY` i IP-hashen.
  - Tester: `src/test/rate-limit-hash.test.ts` (vitest, kjører i CI). Magnus-TODO: sett `RATE_LIMIT_SALT`, deploy de fem funksjonene.
  - Del av sikkerhetsgjennomgangen 2026-06-10 (funn F3/F4). Se plan i økt-notat.

## Region-filtrering, seksjoner & redaksjons-krav (2026-06-09)

Økt med flere uavhengige fikser, alle merget til `main` (deployes via Vercel).
Rekkefølge-tabbe oppdaget og rettet underveis (se nederst).

- **#124 `fix/spraakvask-godta-forslag`** — Inline språkvask: «godta» (✓) virket likt som «avvis» (✕). Chip-knappene ligger inne i ProseMirror og holder fokus (mousedown+preventDefault), og `RichTextEditor` synker ikke `content`-propen mens editoren har fokus → den godtatte teksten nådde `form.body` men aldri visningen. Fix: `updateBodyFromProof` pusher nå rett inn i editor-instansen (`setContent`, `emitUpdate:false`), hopper over i collab-modus. Fil: `src/components/admin/ArticleEditor.tsx`.
- **#125 `feat/utforsk-multiseksjon-filter`** — Utforsk-seksjonslinjen: multi-select (én ELLER flere seksjoner samtidig), filteret holder kanoniske kategorinavn (treffer riktig også på engelsk). Fil: `src/components/NewsFeed.tsx`.
- **#130 `fix/utforsk-skjult-scrollbar-indikatorer`** — Oppfølger på #125 etter tilbakemelding: tilbake til én horisontal rad, men **skjult scrollbar** + **venstre/høyre chevron + fade** som kun vises når det finnes mer i den retningen. Måler overflow på nytt etter paint (`requestAnimationFrame`). Fil: `src/components/NewsFeed.tsx`.
- **#126 `feat/admin-seksjoner`** — Ny **Seksjoner**-manager i admin (admin-only): rediger/slå sammen kategorier. Siden `articles.category` er denormalisert TEXT, propageres endringer via to `SECURITY DEFINER`-RPC-er (`rename_category`, `merge_categories`, speiler `merge_tags`). Migrasjon `20260609120000_category_admin_rpcs.sql` **kjørt i prod av Magnus** (manuelt via SQL Editor). Typene lagt inn kirurgisk i `types.ts` (ikke full regen, pga. migrasjons-drift). Filer: `src/components/admin/SectionsManager.tsx` (ny), `AdminDashboard.tsx`, `src/integrations/supabase/types.ts`, migrasjon.
- **#127/#131 region-bytte filtrerer forsiden** — `NewsFeed` følger nå `useRegion().current` i stedet for sin egen profil-seedede region; fjerner død profil-seeding + ubrukt region-state. (Se rekkefølge-tabben under — endte som #131.) Fil: `src/components/NewsFeed.tsx`.
- **#129 `fix/hovedredaksjon-paakrevd-for-publisering`** — En sak kan ikke lenger publiseres uten hovedredaksjon: nytt blokkerende punkt «Hovedredaksjon er valgt» i publiseringssjekklisten. Auto-utfylling fra `profiles.editorial_region` fantes alt (ProfileEditor setter, ArticleEditor seeder nye saker). Filer: `src/components/admin/PrePublishChecklist.tsx`, `ArticleEditor.tsx`.
- **#128 `docs/per-region-abonnement`** — Designnotat for per-region abonnement + besluttede valg (se åpen tråd under). Fil: `docs/per-region-subscription-design.md`.

**Prod-data (gjort av Magnus):** alle saker uten hovedredaksjon tilegnet `nordvestlandet` — nå har alle 19 artikler `region_slug=nordvestlandet`, 0 står uten. Delingene i `article_shared_regions` (midt-norge 5, østlandet 2, m.fl.) er **bevisste** (Magnus bekreftet at «resten skal være tomme» var feilhukommelse). Ingen dataopprydding gjenstår.

**Læring — stablet-PR-tabbe:** #127 (region) var stablet på #125-branchen. #125 ble merget til `main` *først*, så #127 ble merget inn i den nå-døde #125-branchen og nådde **aldri `main`**. Oppdaget ved å sjekke `main` etterpå; re-landet ved å cherry-picke commiten rett på `main` som **#131**. Lærdom: merg base-PR-en og la GitHub retarge­te den stablede FØR du merger den stablede.

### Åpen tråd — per-region abonnement (ikke startet, venter på Stripe-direkte 1.6)
Designnotat: `docs/per-region-subscription-design.md`. Beslutninger tatt 2026-06-09:
1. **Prising:** felles pris + `region_slug` som metadata (ikke egne priser per region).
2. **Bunt:** ja — eget «hele kjeden»/«Nasjonal+»-abo som gir alle regioner (eget Stripe-produkt).
3. **Nasjonalt:** ethvert aktivt abo (enkelt-region ELLER bunt) låser opp premium `nasjonal`-saker; ikke-premium nasjonalt er åpent.
4. **Datamodell:** `subscriptions.access_scope` (`'region'` | `'all'`); `region_slug` NOT NULL kun når scope=`'region'`. (0 abonnement i prod → ingen datavask.)
5. **Rekkefølge:** bygges sammen med Stripe-direkte (1.6) + multi-region, ikke som bolt-on.

Når det startes, blir det egne PR-er: (a) skjema `access_scope` + RLS/`can_read_premium()`, (b) checkout/webhook setter region+scope, (c) frontend `useSubscription.hasAccessToRegion(slug)`, (d) Stripe bunt-produkt. Begge (Stripe + RLS) er «spør først» i CLAUDE.md.

## Spør — regnskapstall (2026-06-04)

- **Skjerpet Spør med regnskapstall fra Regnskapsregisteret** — 2026-06-04, branch `feat/spor-regnskapstall`
  - Bakgrunn: «Spør databasen»-modulen ble skrotet (branch `chore/fjern-spor-databasen`). Den hadde regnskapsoppslag som hovedmodulen «Spør» (`articles-chat`) manglet — `fetchBrreg` traff kun Enhetsregisteret. Denne PR-en gjenvinner den kapasiteten, nå vevet sammen med artikkelreferanser.
  - Edge function `articles-chat`: ny `fetchRegnskap(orgnr)` (siste årsregnskap → driftsinntekter/driftsresultat/årsresultat/egenkapital, valuta-aware) + `fetchEnhet(orgnr)` for direkte org.nr-oppslag. Planleggeren (`planBrregQueries`) flagger nå `financials` på navngitte selskaps-økonomispørsmål. Tall hentes etter disambiguerings-gaten, festes på selskaps-objektene og legges i eget promptblokk. Maks 3 oppslag per forespørsel (cache 24t). Eksplisitt org.nr fra bruker prioriteres.
  - Klient: `BrregCompany.regnskap?` (ny `BrregRegnskap`-type); selskapskortet i `ConversationView` viser omsetning/resultat med riktig valuta, kildekreditt utvides til «enhets- og regnskapsregisteret».
  - Verifisert: API-feltstier bekreftet mot live Regnskapsregisteret (org.nr 923609016), `tsc --noEmit` + eslint rene (0 errors). Full E2E krever deploy av funksjonen (staging).
  - Filer: `supabase/functions/articles-chat/index.ts`, `src/lib/articles-chat.ts`, `src/components/ConversationView.tsx`.

## Sikkerhetsgjennomgang abonnement (2026-06-03)

- **Funn #2 — paywall stolte på `subscriber`/`business`-rolle** — 2026-06-03, branch `fix/paywall-subscriber-role-gating`
  - `check-article-access` ga full tilgang basert på rå rollemedlemskap (`STAFF_ROLES` inkluderte `subscriber` + `business`). Rollen revokeres aldri ved oppsigelse, så utløpte abonnenter beholdt premium-tilgang permanent — `has_active_subscription` (som sjekker `current_period_end`) ble omgått.
  - Fix: fjernet `subscriber`/`business` fra `STAFF_ROLES` — betalt tilgang går nå utelukkende via `has_active_subscription`. Redaksjonelle roller (`admin`/`editor`/`journalist`) beholder ubegrenset tilgang.
  - Gjorde `userId`-utledning injiserbar (`resolveUserId`-dep) så den sikkerhetskritiske rolle-stien kan enhetstestes uten ekte JWT. La til 4 tester (aktiv sub → full, admin → full, utløpt abonnent → preview, business uten sub → kvote ikke ubegrenset).
  - Verifisert: `deno test` 15/15 grønt, `deno check` + eslint rene. Filer: `supabase/functions/check-article-access/{index,index.test}.ts`.
  - **Merk (separat gap):** CI (`ci.yml`) kjører kun vitest (`src/**`), ikke Deno-testene under `supabase/functions/`. Disse må kjøres manuelt med `deno test`. Verdt å legge til et Deno-steg i CI senere.
- **Funn #1 — Stripe sandbox gir ekte tilgang** — designnotat skrevet, venter på Magnus. Se `docs/security-stripe-environment-isolation.md` + `docs/magnus-todo.md`.
- **Funn #3 — `article_views` UPDATE `USING(true)`** — flagget, ikke fikset (RLS-endring krever din godkjenning).

## Fase 1 — Sikkerhets-sprint

- **1.5 .env ut av git** — 2026-05-17, branch `chore/env-out-of-git`
  - Fjernet `.env` og `.env.development` fra git-tracking
  - Lagt til `.env*` i `.gitignore`, opprettet `.env.example`
  - Erstattet Lovable-README med prosjekt-relevant README
  - Filer endret: `.gitignore`, `.env.example` (ny), `README.md`

## Fase 3 — Next.js-migrering

- **3.x Fullføring av rute-paritet** — 2026-06-01, branch `fix/revision-log-dates-and-captions`
  - Next.js-migreringen var strukturelt komplett (alle `src/app/*` page/_loader/client-trioer på plass, `next build` grønn). Lukket gjenværende rute-gap mellom React Router (`src/App.tsx`) og App Router:
    - Ny rute `/kommer-snart` (ComingSoon) — manglet i Next. Filer: `src/app/kommer-snart/{page,_loader,client}.tsx`
    - Bro-redirect `/reset-password` → `/nullstill-passord` (Supabase passord-reset-epost peker hit; hash med recovery-token bevares)
    - Bro-redirect `/abonnement/takk` → `/abonnement/retur` (Stripe return-URL; `session_id`-query bevares)
  - Begge redirects satt `permanent: false` siden Vite- og Next-appen sameksisterer. Filer endret: `next.config.ts`, `.claude/launch.json` (next-dev preview-config)
  - Verifisert i `next dev`: `/kommer-snart` rendrer fullt, begge redirects bevarer query/hash, ingen console-feil.
  - **Gjenstår (Magnus' beslutning):** flippe default `build`/`dev`-script fra Vite til Next + Vercel-cutover (fase 5). Ikke gjort unilateralt — deployment/routing er redaksjonell/forretningsbeslutning.

## Samredigering (Yjs + tiptap)

- **Fase A — grunnmur** — 2026-06-02
  - Migrasjon `20260601130000_yjs_collab_infrastructure.sql` kjørt mot prod (`oemzrhlybemakwpyhcno`): `yjs_snapshots`-tabell (bytea-state, RLS for admin/editor/journalist) + `articles.collab_enabled`-flagg. Ingen nye security-advisories.
  - `types.ts` regenerert (PR #89). Merk: codegen returnerer `{"types":"…"}` — må pakkes ut til rå TS, ellers feller den eslint (jf. #88).

- **Fase B — auth + grunnleggende sync** — 2026-06-02, branch `feat/collab-fase-b`
  - **Transport-valg utsatt:** bygget bak en provider-abstraksjon (`src/lib/collab/`) med Liveblocks som første implementasjon. `createCollabProvider` er eneste bytte-punkt; editor/komponenter er transport-nøytrale, så et senere bytte til selvhostet Hocuspocus blir lite (dokumentmodellen overlever via `yjs_snapshots`).
  - Nye pakker: `yjs`, `@tiptap/extension-collaboration` + `-collaboration-caret` (3.23.4, matcher tiptap), `@liveblocks/client` + `/yjs` + `/node` (2.24.4).
  - `src/app/api/liveblocks-auth/route.ts` — verifiserer Supabase-JWT + `has_role` (admin/editor/journalist), minter scoped session-token. Returnerer 501 hvis `LIVEBLOCKS_SECRET_KEY` mangler (graceful fallback).
  - `RichTextEditor` fikk valgfri `collab`-prop (Collaboration + CollaborationCaret, Yjs eier undo/redo) — ingen duplisering av 680-linjers editor. `CollaborativeRichTextEditor` er tynn wrapper som `ArticleEditorBody` alltid bruker; faller selv tilbake til vanlig editor når `collab_enabled` er av eller rommet ikke er tilkoblet.
  - Verifisert: lint exit 0, vitest 58/58, vite build + tsc (app & next) grønt.
  - **Gjenstår for å gå live:** (1) Magnus oppretter Liveblocks-konto + legger `LIVEBLOCKS_SECRET_KEY` i `.env.local` og Vercel. (2) To-vinduers synktest (krever nøkkelen). (3) Fase C: presence-avatarer, `collab-sync`-persistering, cold-start fra `yjs_snapshots`.
  - **Live i prod** 2026-06-02 (PR #88–#93): auth-fiks (token-basert), editor-mount-fiks, og av/på-knapp for samredigering i editoren (default av).

- **Fase C — presence + tilgang** — 2026-06-02, branch `feat/collab-fase-c-presence`
  - **Presence-avatarer:** `PresenceAvatars` viser hvem som redigerer brødteksten nå (fargede initial-avatarer via Yjs `awareness`, transport-nøytralt). Vises over editoren kun i collab-modus.
  - **Tilgang på collab-knapp:** gated til redaksjonelle roller (`hasAnyRole(['admin','editor','journalist'])`) — journalister kan nå styre samredigering, konsistent med auth-routens roller.
  - **Persistering:** allerede dekket av eksisterende auto-lagring (collab `onUpdate` → `onChange` → debounced save holder `articles.body` fersk) + seed-on-empty fra HTML ved cold-start. Binær `yjs_snapshots`-persistering (webhook / Hocuspocus `onStoreDocument`) er bevisst utsatt til transport-valget er tatt — en Liveblocks-webhook nå kan bli kastet bort ved et Hocuspocus-bytte.
  - Verifisert: eslint exit 0, tsc (app) rent, vite build grønt. Live presence-test krever to innloggede økter (Magnus' steg).

### Gjenoppta samredigering her (snapshot 2026-06-02)

**Live i prod:** sanntids sync + presence + av/på-knapp (redaksjonelle roller, default av). `LIVEBLOCKS_SECRET_KEY` satt i `.env.local` og Vercel.

**Arkitektur (alt bak ett bytte-punkt):**
- `src/lib/collab/index.ts` → `createCollabProvider(roomId, getToken)` — ENESTE sted å bytte transport. I dag `liveblocks.ts`; for Hocuspocus: lag `hocuspocus.ts` med samme signatur og bytt importen her.
- `src/lib/collab/liveblocks.ts` — eneste fil som importerer `@liveblocks/*`. authEndpoint sender Supabase-JWT som Bearer.
- `src/hooks/useCollabProvider.ts` — åpner/lukker rom (`article:<id>`), gir `getToken` fra Supabase-sesjon.
- `src/app/api/liveblocks-auth/route.ts` — verifiserer JWT + `has_role`, minter token. 501 uten nøkkel (graceful fallback).
- `src/components/admin/RichTextEditor.tsx` — valgfri `collab`-prop (Collaboration + CollaborationCaret).
- `src/components/admin/CollaborativeRichTextEditor.tsx` — wrapper: useCollabProvider + seed-on-empty + PresenceAvatars; `key` remounter ved av/på.
- `src/components/admin/PresenceAvatars.tsx` — avatarer via Yjs awareness (transport-nøytralt).
- Toggle + rolle-gate: `src/components/admin/ArticleEditorBody.tsx`; flagget lastes/lagres i `ArticleEditor.tsx`.
- DB: `yjs_snapshots`-tabell + `articles.collab_enabled` (migrasjon kjørt i prod).

**Neste (krever beslutning):** velg transport (Liveblocks vs Hocuspocus) → bygg så server-side binær persistering til `yjs_snapshots` + cold-start derfra (fjerner dobbel-seed-race ved samtidig første-åpning). Detaljert plan: `~/.claude/plans/jeg-vil-ha-muligheten-hashed-moore.md` (Fase C punkt 8–10 + Fase D).

**Lokal kjøring:** `npm run dev:next` → http://localhost:3000/admin → Artikler → åpne artikkel → toggel «Samredigering». Manuelle Magnus-steg: `docs/magnus-todo.md`.

## Fase 2 — Kjede-arkitektur

- **2.2 Multi-region-skjema kjørt mot prod** — 2026-06-04, branch `feat/naeringsbarometer-skjema` (PR #102)
  - Drift-audit avdekket at `20260518200000_multi_region_schema.sql` aldri var kjørt i prod (repo-mappa ≠ prod-fasit — prod gjenoppbygd fra snapshot 05-26). Full analyse: `docs/migration-drift-audit.md`.
  - Rettet latent bug i migrasjonen: kun 4/9 FK-er til `editorial_regions(slug)` hadde `ON UPDATE CASCADE` → slug-omdøpingen ville feilet mot `articles` m.fl. La til CASCADE på `articles`, `article_shared_regions`, `employer_profiles`, `job_listings`, `profiles` + eksplisitt `UPDATE profiles.region` (ikke FK).
  - Kjørt mot prod (`oemzrhlybemakwpyhcno`): `more-og-romsdal→nordvestlandet`, `trondelag→midt-norge`, `region_slug` på 7 tabeller (subscriptions, business_accounts, groups, polls, native_ads, job_changes, tips), `region_hidden_articles`. Verifisert: 12 artikler kaskadert, ingen advisor-regress utover eksisterende mønster.
  - Frontend-slugs oppdatert i `Onboarding.tsx`, `ProfileEditor.tsx`, `NewsFeed.tsx`. Types regenerert. lint 0 errors, tsc rent, 58/58 tester.
  - **Gjenstår av fase 2:** frontend regionalt skall (RegionProvider/subdomene) — 2.3.
  - **Gjenstår drift (Magnus' beslutning):** 5 andre uanvendte migrasjoner (stripe_events, encrypt_tip_email, 2 cron-jobber, live_streams) — se `docs/magnus-todo.md`.

## Næringsbarometer

- **PR 1 — skjema** — 2026-06-04, branch `feat/naeringsbarometer-skjema` (PR #102)
  - `20260604100000_naeringsbarometer_schema.sql` kjørt mot prod: `barometer_modules` (konfig/"spaken"), `barometer_datapoints` (SSB-tall, RLS-gated på tilgangsnivå), `barometer_signals` (avvik→godkjenningskø, speiler `job_changes`). `barometer_tilgang`-enum (åpen|metered|lukket). Region-bevisst (`region_slug`).
  - Hjelpefunksjoner: `has_editorial_role` + region-scopet `has_barometer_access` (SECURITY DEFINER). Muren håndheves server-side i RLS (bevisst avvik fra EF-paywallen — `docs/decisions.md`).
  - Seed: 11 moduler for nordvestlandet. Verifisert: 11 rader, 4 åpne, funksjoner+policies på plass.
  - Rute besluttet: `/næringspuls`. Design: `docs/naeringsbarometer-design.md`. **Gjenstår:** PR 2 (SSB-henting + avviksdetektor-EF-er + cron), PR 3 (`/næringspuls`-frontend), PR 4 (metered-RPC + teaser), PR 5–7.

- **Admin-UI for proveniens** — 2026-06-09, branch `feat/proveniens-admin-ui`
  - `ArticleProvenancePanel` (CollapsibleSection) + `useArticleProvenance`-hook (last/lagre, delete+insert som article_tags). Redaksjonen fyller inn kilder/tilsvar/rettelser + `agent_exposure` per sak.
  - Note-tilbakelesing: `provenance-admin-notes` edge function (service-role, editorial-rolle-gate) — `note` er REVOKE-et for authenticated, så lesing tilbake krever service-role. Skriving går via vanlig klient.
  - Soft-advarsel i `PrePublishChecklist` (advisory-flagg, blokkerer ikke publisering).
  - Ingen migrasjon — gjenbruker eksisterende tabeller/RLS fra lag 1.
  - Fanget at main sin `types.ts` manglet alle proveniens-tabellene (regenerering tapt i tidligere merge) → regenerert mot prod.
  - Verifisert: vitest 110/110, deno 23/23, eslint 0 errors, tsc rent. **Gjenstår (Magnus):** deploy `provenance-admin-notes`-funksjonen; klikk gjennom panelet etter deploy.
