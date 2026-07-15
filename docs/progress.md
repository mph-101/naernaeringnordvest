# Progress

## Impeccable polish-pass mot main etter merge av bunken (2026-07-15)

- **Polish-PR** — 2026-07-15, branch `design/polish-pass`. Flyt per polish.md: kritikk-snapshot 2026-07-08 gjennomgått mot dagens main (P0/P1 alt fikset i #148–#163), detektor kjørt på nytt over kildene (23 funn → 16 utenfor admin, hvorav spinner/regex-treff er kjente falske positive).
  - **FeatureWalkthrough → Radix Dialog:** håndrullet overlay manglet dialog-rolle, fokusfelle og Escape (samme klasse feil som paywall-en i #158); bunn-ark-layout på mobil bevart via egne klasser på primitivene; ikonflis `text-accent` → `text-accent-ink`; progress-dots `aria-hidden` (telleren bærer info); lukkeknapp fikk 40px-gulv.
  - **SubscriptionTrialBanner:** `text-accent` som tekstfarge → `accent-ink`; rå amber-klasser (utenfor Kystlys) → nøytral secondary-flate for «canceled» (brukerens valg ≠ feil); `text-destructive` → `destructive-ink`; inline `rgba(0,0,0,0.06)` som drepte hover-tilstanden på CTA fjernet → `bg-foreground/5 hover:bg-foreground/10`; 40px-gulv på begge knappene.
  - **Proofread-chips (index.css):** rå `hsl(142 71% …)`-emerald → `var(--positive)`-tokenet; `.dark`-overriden slettet (dark-tokenet tar over automatisk).
  - **CompanyMiniProfile:** inert `w-4.5 h-4.5` (finnes ikke i Tailwind-skalaen — ikonet rendret på 24px-default) → `w-5 h-5`; `hover:shadow-soft` på ikke-klikkbart kort fjernet (flat-i-ro).
  - **Arrangementer-skjemaets `.form-input`:** radius `.6rem` → `.75rem` (på skalaen).
  - Vurdert og bevisst ikke rørt: ViewToggle `window.location.href` (Next-kompat-kommentar + routing er redaksjonelt), featured-etter-filter (bevisst rekomputering), Bitcoin i ticker (redaksjonelt spørsmål), gradient-warm-literals i dark (gradient-stops må være literals), spinner-`border-b-2` (detektor-falskpositiv).
  - Verifisert: eslint 0 errors, vitest 127/127, build OK; dialog i preview: `role=dialog`, `aria-labelledby`, fokus fanget, dots skjult, accent-ink-ikon.

## P2/P3-bunken fra re-auditen: PR-stabel #158→#160→#161→#162 + typer (2026-07-15)

- **PR #158 opprettet** for a11y-branchen fra 2026-07-11 (PR-opprettelsen falt ut i forrige økt); rebast mot main etter at #157 (trending-RPC + React Query) ble merget 2026-07-10. CI grønn.
- **PR #159 `chore/regen-supabase-types`** (mot main, uavhengig): typer regenerert via MCP — eneste diff er `get_trending_articles`-signaturen; `(supabase.rpc as any)`-casten i TrendingSection fjernet. Build (tsc) bekrefter. CI grønn.
- **PR #160 `aria/state-consistency`** (stablet på #158): «Alle»-pillen `aria-pressed`, «Meld inn» `aria-expanded`+`aria-controls`, NewsFeed-spinner `role=status`+sr-only, poll-resultater i vedvarende `aria-live=polite`-region. Preview-verifisert i DOM (poll unntatt — ingen aktiv avstemning i basen). CI grønn.
- **PR #161 `design/card-and-token-cleanup`** (stablet på #160): ny delt `.card-interactive`-utility koder DESIGN.md §5 én gang (Myk i ro, Hevet ved hover) og erstatter fire ad-hoc hover-skygge-oppskrifter på 11 leserflate-kort; `hover:-translate-y-1` fjernet (TeamSection); Konkurs-badge + negative årsresultat → `--negative`-token; RelatedArticles-ikonflisen fjernet; bounce→pulse-dots (ConversationView, SporAIChat); «Foreslåtte oppfølginger»-eyebrow → rolig etikett; `.border-accent-left` slettet (verifisert ubrukt). Admin-kort bevisst ikke rørt (CMS-territorium). CI grønn.
- **PR #162 `type/px-to-rem-microtypography`** (stablet på #161): mekanisk sveip `text-[10px]`→`text-[0.625rem]`, `text-[11px]`→`text-[0.6875rem]` — 120 forekomster i 52 filer; identisk rendering, men skalerer nå med leserens skriftinnstillinger.
- Alle: eslint 0 errors, vitest 127/127, preview-verifisert. **Merge-rekkefølge: #158 → #160 → #161 → #162, slett branch på hvert steg** (stabel-lærdommen fra #150–#155). #159 kan merges uavhengig.
- Gjenstår fra backloggen: `/impeccable polish` + ny re-audit — venter til stabelen er merget (måler main, ikke stabelen).

## Re-audit a11y-bunken: region-bytte overalt, ekte dialog, 40px-gulv (2026-07-11)

- **A11y-PR fra re-auditen (punkt 1–4 + tre P2-mikrofunn)** — 2026-07-11, branch `a11y/targets-dialog-region` (stablet på #157)
  - **[P0] Region-bytte:** Headerens håndrullede dropdown (blur-timeout som lukket før tastaturet nådde listen, falsk `aria-haspopup`) erstattet med shadcn/Radix `DropdownMenu` — roving fokus, Escape og menu-roller gratis; og region-seksjon lagt i mobilmenyen (7 knapper ≥40px) — mobilbrukere var låst til sist valgte region.
  - **[P1] Paywall-modal:** RelatedArticles' håndrullede overlay → Radix `Dialog` (dialog-rolle, aria-modal, fokusfelle, Escape, navngitt lukkeknapp; `DialogTitle`/`DialogDescription` koblet).
  - **[P1] Opacity-på-tekst forbudt i praksis:** ticker-kildelenker `/70` → full `muted-foreground`; headerens region-/språketiketter `/70` → `/80`; Trending-ranktallene `text-accent/30` (1,26:1) → `text-accent-ink`.
  - **[P1] 40px-gulvet:** `min-w-10 min-h-10` på samtlige ikon-kontroller (header-knapper/-lenker, hamburger, søk, banner-lukk, kalender-eksport, feed-chevroner, stjerne); interaktive piller (kategori, range, hero-chips, Tilpass) → `min-h-10`; ViewToggle-etiketter alltid synlige (ikon-only + title-tooltip var ubrukelig på touch). Range-piller fikk `aria-pressed` i samme slengen.
  - **Mikrofunn:** marquee-klonene `aria-hidden` + `tabIndex=-1` (lenker dobles ikke lenger i tab-rekkefølgen) + `group-focus-within`-pause; synlig fokusring (`ring-accent-ink`) på begge søkefelt; FirstVisitBanner stables på mobil (320px-funnet).
  - Verifisert: eslint 0 errors, vitest 127/127, live i preview (Radix-attributter på trigger, 12 kloner skjult, 0 mål under 40px blant synlige kontroller, region-seksjon i mobilmeny, faneetiketter synlige).


## Design-audit optimize A+B: Trending-RPC + React Query i forside-widgetene (2026-07-10)

- **Data-lags-PR fra re-auditen (optimize del A+B; del C blokkert på free plan → magnus-todo)** — 2026-07-10, branch `perf/data-layer-rpc-react-query`
  - **Del A:** Ny RPC `get_trending_articles(days, max_rows)` (migrasjon `20260710120000`, applisert mot prod via MCP og verifisert med testkall) — SECURITY DEFINER/STABLE/låst search_path per husmønster; aggregerer «Mest lest» server-side så klienten mottar ≤12 rader i stedet for rå `article_views`-dump (payload vokste lineært med trafikken). `viewed_at DESC`-indeks fantes fra bolk 6. NB: `article_views.article_id` er TEXT, ikke uuid. TrendingSection språk-refetch fjernet — rå rader caches språknøytralt, `toUiArticle` i `useMemo`.
  - **Del B:** Alle seks forside-widgets (NewsFeed ×5 spørringer, TrendingSection, EventsFeed, JobChangeFeed, FrontpagePoll ×3, MarketTicker) konvertert fra rå useEffect+useState til `useQuery` med nøkler og staleTime per datatype; MarketTickers setInterval → `refetchInterval`; poll-stemme invaliderer resultat-query; NewsFeeds avledede maps (tags/shared-regions/topTags) → `useMemo`. «Prøv igjen» → `refetch()`.
  - **Målt i preview:** 0 nye Supabase-kall ved Spør↔Utforsk-bytte begge veier (før: ~8–10 refyrte kall med spinnere); RPC-en i bruk, rå article_views-fetch borte; null konsollfeil. eslint 0 errors, vitest 127/127.
  - Typer: `supabase gen types` bør regenereres (RPC-kallet er `as any`-castet inntil da, samme mønster som `native_ads`).

## Design-audit clarify: språk og tillitstekster (2026-07-10)

- **Clarify-PR fra forside-auditen (alle fire tekstvalg tatt av Magnus i økt)** — 2026-07-10, branch `copy/clarify-front-page` (stablet på quieter-branchen)
  - «Trending nå» → **«Mest lest»** (EN «Most read»); redundant undertekst droppet.
  - «Tall»-fanen beholdes (etablert produktnavn; tooltip/aria forklarer).
  - AI-lyd-påstanden beholdt, men med **innholdsmerking-kobling**: «Slik merker vi AI-innhold» → /innholdsmerking under DailyEditionCTA-kortet (egen linje — unngår nøstet interaktivt) og i AudioModeSection i profilinnstillingene. Headphones-ikonene → accent-ink i samme slengen.
  - Hero-løftet «Få svar basert på verifiserte data» → **«Svarene siterer kildene rett fra artikkelarkivet»** (NO+EN) — presist og etterprøvbart; beskriver hva Spør faktisk gjør.
  - Verifisert: eslint 0 errors, vitest 127/127, live i preview («Mest lest» rendrer, merkelenken synlig i feed, ny hero-tekst i søkevisning, gammel formulering borte).

## Design-audit quieter: rustrose-reservasjon, scaffolding-fjerning, semantiske tokens (2026-07-10)

- **Quieter-PR fra forside-auditen (P2-funn: mal-scaffolding + Én-stemme-brudd)** — 2026-07-10, branch `design/quieter-front-page` (stablet på animate-branchen)
  - Ikon-i-tonet-flis-seksjonsheaderen fjernet alle 4 steder (NewsFeed, TrendingSection, JobChangeFeed, EventsFeed) — Lora-titlene bærer seksjonene alene (Lora-først-regelen); NewsFeeds redundante «Siste nyheter og analyser»-undertekst droppet.
  - Rustrose reservert feil: Flame-flisen borte; EventsFeeds «I dag»-status og dato-flis bruker aksent i stedet for destructive; pulserende dot fjernet (uro uten informasjon).
  - Uppercase-eyebrows nøytralisert: «Populære spørsmål» (SearchHero) og «Ukens spørsmål» (FrontpagePoll) er nå rolige normal-case-etiketter; hero-linje 2 mistet aksentfargen (hierarki via serif, ikke farge).
  - Nye semantiske tokens `--positive`/`--negative` (markedsretning, hue-forskjøvet fra destructive) og `--sponsored`/`--sponsored-foreground` (annonsemerking, dempet i dark mode) — erstatter rå emerald/rose/amber-klasser i MarketTicker og NativeAdCard.
  - Fallback-artikkelkunsten dempet (S ≤ 30 % i stedet for 60–80 %) — kategorikoding uten å sprenge Én-stemme-regelen ved bildeløse artikler.
  - Verifisert: eslint 0 errors, vitest 127/127, live i preview (0 ikon-fliser, 0 destructive-elementer på leserflaten, 0 eyebrows, 0 rå palettklasser; positive/negative-tokens i bruk i tickeren).

## Design-audit animate: global reduced-motion + ticker-pause (2026-07-09)

- **Animate-PR fra forside-auditen (funn 4–5: siste WCAG Nivå A-brudd)** — 2026-07-09, branch `a11y/animate-reduced-motion` (stablet på onboard-branchen)
  - Global `@media (prefers-reduced-motion: reduce)`-blokk i index.css: alle animasjoner/overganger fullfører øyeblikkelig (inkl. `animation-delay: 0` så fadeUp-innhold med fill-mode both aldri holdes usynlig). Oppfyller DESIGN.md-kravet «hver animasjon skal ha et reduced-motion-alternativ».
  - MarketTicker: synlig pause/play-knapp (40×40px, `aria-pressed`, veksler `animation-play-state`) — lukker WCAG 2.2.2-bruddet der marqueen kun kunne pauses med hover; ved redusert bevegelse rendres en statisk, scrollbar enkeltrad uten duplisering; `role="region"` så aria-labelen faktisk eksponeres.
  - Slettet død `src/App.css` (Vite-boilerplate; inneholdt repoets eneste — villedende — reduced-motion-query).
  - Verifisert: eslint 0 errors, vitest 127/127 (én flake under maskinbelastning, grønn på re-kjøring ×2), live i preview (region-rolle, 40px-knapp, running→paused + aria-pressed, CSS-blokk aktiv). Reduced-motion-JS-stien (statisk rad) krever OS-innstilling for å se live; CSS-laget dekker uansett som forsvar i dybden.

## Design-audit onboard: avisa først — feed som standard, onboarding tøylet (2026-07-09)

- **Onboard-PR fra forside-auditen (handlingsplan punkt 3, retning besluttet av Magnus: «Feed som standard»)** — 2026-07-09, branch `ux/onboard-feed-first` (stablet på perf-branchen)
  - Feed som standardvisning: `defaultView`-fallback i useTheme «search» → «feed» (også ved resetAllSettings); eksplisitte valg i localStorage vinner fortsatt. `getInitialView` i views/Index + app/frontpage-client: URL-param → eksplisitt «search» → ellers feed.
  - Tvungen `/velkommen`-redirect fjernet i begge runtimes — førstegangsbesøkende ser avisa umiddelbart. Erstattet av ny `FirstVisitBanner` (lukkbar stripe under fanene): tilbyr region-/startside-valget via lenke til /velkommen; lukking setter hasOnboarded (nager aldri igjen). /velkommen-siden uendret og fortsatt fullt funksjonell som opt-in.
  - FeatureWalkthrough (11-korts touren) auto-åpner ikke lenger ved første besøk — konkurrerte med selve avisa; startes fortsatt manuelt fra profilinnstillingene via `nn:feature-walkthrough-start`.
  - Verifisert: eslint 0 errors, vitest 127/127, live i preview som førstegangsbesøkende (ren `/` blir på `/`, feed rendrer, banner synlig, tour åpner ikke; lukking fjerner banner og persisterer).

## Design-audit perf: ekte <img> i feeden + lazy chunk-splitting (2026-07-09)

- **Bilde-/chunk-PR fra forside-auditen (funn 8–9)** — 2026-07-09, branch `perf/feed-images-lazy-chunk` (stablet på harden-branchen)
  - Feed-grafikk som ekte `<img>`: featured (eager + `fetchpriority="high"`), grid-kort og annonsekort (`loading="lazy"` + `decoding="async"`), `object-fit: cover` + `object-position` fra crop/focal-matematikken — piksel-identisk rendering (background-size var alltid `cover`, kun posisjon varierer; verifisert live med presisjonsposisjon 56.28%/43.72%). Gradient-fallback beholdt som div for bildeløse artikler. Fjernet `will-change: background-position` + `backfaceVisibility` som lå inert på hvert kort (titalls unødvendige GPU-lag).
  - Chunk-splitting: ConversationView (m/ react-markdown-treet) er React.lazy i både views/Index.tsx og app/frontpage-client.tsx — lastes først når noen søker; `LazyJobChangeForm` var falsk lazy (`const X = JobChangeForm` etter statisk import) og er nå ekte `lazy(() => import(...))`; SporAIChat-FAB-en (som også drar react-markdown globalt via App.tsx) er egen async-chunk som ikke blokkerer kritisk render.
  - `getArticleImage` flyttet til ny `lib/article-image.ts` (re-eksportert fra `lib/articles.ts` for bakoverkomp.) — NewsFeed og article-data importerer direkte, så mock-datasettet (~300 linjer artikkel-bodies) er ute av forsidechunken.
  - Fonter: CSS `@import` i index.css (kjedet font-CSS bak stylesheet-nedlastingen) erstattet med `<link rel="preconnect">` + stylesheet i index.html — samme mønster som app/layout.tsx allerede brukte for Next.
  - Utsatt: Supabase Storage image-transforms/srcset (krever verifisering av render-endepunktet i prod-planen); dypere SporAIChat-splitt (FAB-skall + lazy panel — meldingsstate bor i toppnivå, egen refaktor for optimize-steget); logo.png-nedskalering (79 KB servert i 40px — asset-jobb).
  - Verifisert: eslint 0 errors, vitest 127/127, live i preview (10 `<img>`: 1 eager m/ fetchpriority + 9 lazy; ConversationView/JobChangeForm/mock-data lastes ikke ved feed-visning; fonter via link, Lora rendrer).

## Design-audit harden: lenke-semantikk + navngitte kontroller + ærlige feiltilstander (2026-07-09)

- **Harden-PR fra forside-auditen (funn 6–7 + av-nøsting + feiltilstander)** — 2026-07-09, branch `a11y/harden-front-page-semantics`
  - Lenke-semantikk: alle artikkelkort (NewsFeed featured/grid, TrendingSection) er nå `<Link>` i stedet for `<button>+navigate()` — midtklikk/deling/visited/SEO virker; Header-navigasjonen (desktop-ikoner + mobilmeny + Logg inn) er ekte lenker; RelatedArticles' døde `href="#"` peker til `/?view=feed`. Trygt i begge runtimes (Next kjører komponentene i BrowserRouter + NavigationInterceptor).
  - Av-nøsting (stretched-mønsteret): EventsFeed-rader = tittel-`<Link>` med `after:inset-0` + kalender som ekte søsken-`<button>` (erstatter `span[role=button]` inni `<button>`); JobChangeFeed-rader = chevron-`<button aria-expanded>` med stretched overlay + Kilde-lenke på `z-10`; `ul > div > li` fikset (key på `<li>`).
  - Navngitte kontroller: aria-label på chat-tilbake/-send, Header-søk og alle ikon-knapper; aria-label på begge søkefelt; `aria-expanded`/`aria-haspopup` på region-velgeren; `aria-pressed`/`aria-current` + aria-label på ViewToggle-fanene og stjernen; sr-only `<h1>` i feed-visning; `role="log"` på chat-transkriptet.
  - Ærlige feiltilstander: MarketTicker skjules ved feil (ikke evig «Henter markedstall…»); NewsFeed viser feilmelding + «Prøv igjen»-knapp ved nettverksfeil (ikke «Ingen publiserte artikler ennå»); inert `w-4.5` → `w-[18px]`.
  - **Flagget for Magnus:** «Tips redaksjonen» i EventsFeed pekte på `/tips` som ikke finnes (404) — omdirigert til `/kontakt` (TipForm bor i TeamSection); si fra hvis annen destinasjon er riktig.
  - Bevisst utsatt til egen PR: `<img>`-migrering av feed-bildene + ekte lazy-splitting av ConversationView/JobChangeForm (audit-funn 8–9).
  - Verifisert: eslint 0 errors, vitest 127/127, live i preview (14 artikkel-lenker, 0 nøstede interaktive, expand-toggle og Kilde-lenke fungerer, h1 til stede, siden rendrer rent).

## Design-audit P0/P1: kontrast-tokens light mode (2026-07-09)

- **Token-PR fra forside-auditen (funn 1–3: P0×2, P1×1)** — 2026-07-09, branch `fix/audit-p0-contrast-tokens`
  - `src/index.css`: light `--accent-foreground` og `--destructive-foreground` hvit → mørk blekk (2,4:1/3,15:1 → 6,7:1/5,1:1 på egne flater; retter DESIGN.md-regelen «aldri hvit tekst på fersken/terrakotta»); `--muted-foreground` 50 % → 42 % L (3,7:1 → 4,9:1). Nye tekst-trygge tokens `--accent-ink`/`--primary-ink`/`--destructive-ink` (light + dark) eksponert i `tailwind.config.ts` — pastellene forbeholdes flater.
  - Sveip av forsidekomponentene (Header, SearchHero, NewsFeed, ViewToggle, JobChangeFeed, EventsFeed, TrendingSection, FrontpagePoll, ConversationView, RelatedArticles): `text-accent`/`text-primary`/`text-destructive` som tekst-/ikonfarge → ink-variantene (~45 forekomster). Token-endringene alene reparerer alle ~115 `accent-foreground`- og ~1150 `muted-foreground`-brukssteder site-wide.
  - Bevisst urørt: Flame-ikonet i TrendingSection (rustrose-dekorativt hører til quieter-steget); dark mode-verdier (besto AA fra før).
  - Verifisert: eslint 0 errors, vitest 127/127, live i preview (Logg inn/Søk-knapp mørk-på-fersken, kategori-piller lesbar terrakotta, dark mode intakt, null konsollfeil).
  - Audit-rapport og full funnliste: `.impeccable/critique/2026-07-08T12-36-45Z__src-views-index-tsx.md` + chat-økt 2026-07-08.

## Bolk 6 — ytelse: indekser + liste-select-innsnevring (2026-07-07)

- **Bolk 6 (beslutninger: 6a/6c ja, 6b init-plan utsatt til etter launch, 6d noteres kun)** — 2026-07-07, branch `perf/bolk6-indexes-and-selects`
  - Migrasjon `20260707150000_bolk6_performance_indexes.sql` (additiv): de 13 uindekserte FK-ene fra prod-advisor (bl.a. `tips.reviewed_by`, `group_messages.group_id/article_id`, `job_listings.employer_profile_id`, `articles.created_by`); partial `tips(status) WHERE status='new'` (admin-badge); partial `articles(published_at DESC) WHERE published` (kanonisk feed-query); funksjonell `business_accounts(lower(email_domain))` (matcher `has_active_subscription`-oppslaget som ellers seq-scanner inne i RLS).
  - 6c: `NewsFeed` (40 rader) og `TrendingSection` (via ny `PUBLISHED_ARTICLE_LIST_SELECT`) henter ikke lenger `body`/`body_en`; `fetchPublishedJobs` bytter `select("*")` → navngitte kolonner uten `description_html`. `toUiArticle` tåler radene uten body (excerpt-fallback); `description_html` er valgfri i `JobListing`-typen med guards i `StillingDetail`/JSON-LD. `feed-api` beholder body bevisst (API-kontrakt; premium alt gated i bolk 3b).
  - Verifisert: `tsc --noEmit` rent, eslint 0 errors, vitest 127/127. Browser-verifisert i preview: forside-queryene går uten `body` (begge selects inspisert i nettverket), «Trending nå»/«Siste nyheter» rendrer, `/stillinger` uten `description_html`, null konsollfeil.
  - **Gjenstår:** migrasjon mot prod (Magnus' go) — deretter `explain` mot feed/tips/domene-query for å bekrefte indeksbruk. 6d (71 ubrukte indekser) bevisst urørt til etter launch.
## Bolk 5 — dataintegritet + gjenstående RLS (2026-07-07)

- **Bolk 5 (beslutninger: 5-D1 ja, 5-D2 ja)** — 2026-07-07, branch `security/bolk5-data-integrity`
  - Migrasjon `20260707140000_bolk5_data_integrity.sql` (additiv, policy-navn verifisert mot prod):
    - **5a:** partial unique index `(user_id, environment) WHERE status IN (trialing,active,past_due)` på `subscriptions` — håndhever «én aktiv personlig sub per bruker»; dobbel-checkout gir nå 23505 → webhook 400 → Stripe-retry i stedet for stille dobbeltrad.
    - **5b:** `claim_business_seat()`-RPC (SECURITY DEFINER, service-role-only) — `FOR UPDATE`-lås på kontoraden gjør eierskap+kapasitet+insert atomisk (lukker TOCTOU der to samtidige invitasjoner sprengte `seat_count`); e-post-oppslag direkte i `auth.users` erstatter `listUsers({perPage:1000})`-scan som bommet stille forbi 1000 brukere.
    - **5c:** `notifications`-immutabilitets-trigger (kun `read_at` kan endres av brukere; service-role unntatt); `group_invitations` UPDATE får `WITH CHECK` (hindrer re-parenting til fremmed gruppe); `newsletter_subscriptions` INSERT-trigger tvinger `confirmed=false` + servergenererte tokens for ikke-stab (klient kunne forfalske bekreftet abonnement for andres e-post — skjemaet hadde allerede double-opt-in-felt, default var trygg, men `WITH CHECK true` lot klienten overstyre).
  - `invite-business-seat`: omskrevet til å kalle RPC-en; mapper `not_found`/`forbidden`/`full` → 404/403/400. Uendret respons-kontrakt mot frontend.
  - Verifisert: `deno check` rent, eslint 0 errors, vitest 127/127. Ingen frontend-endring nødvendig.
  - **Gjenstår:** migrasjon mot prod (Magnus' go; 5a krever duplikat-sjekk først — forventet 0 rader) → deploy `invite-business-seat`.
## Bolk 4 — myk publiseringsregel + Plattform/avis-proveniens (2026-07-07)

- **Bolk 4 (myk, per Magnus' D1-valg)** — 2026-07-07, branch `security/bolk4-publish-provenance`
  - Migrasjon `20260707130000_bolk4_publish_provenance.sql`: (1) ny tabell `agent_runs` (hvem *bestilte* AI-arbeid — `ordered_by`, funksjon, modell; service-role skriver, stab leser) — lukker gapet «ingen maskinlesbar spor av instruksjonskjeden» i Plattform/avis-skillet; (2) `articles.scheduled_by` + `BEFORE`-trigger `set_scheduled_by()` som stempler `auth.uid()` server-side når `scheduled_publish_at` (re)settes — kan ikke forfalskes fra klient; NULL = «ingen menneske planla» (revisjonssignal for auto-publish-cronen).
  - `generate-article-draft`: caller-auth (userClient + `getUser()`, mønster fra `admin-create-user`) + eksplisitt admin/editor/journalist-rollesjekk (lukker «enhver innlogget bruker kan brenne AI-kreditt og lese kildemateriale») + best-effort `agent_runs`-logging av hvert utkast.
  - Bevisst IKKE gjort (D1 = myk): ingen tvungen `publish_article`-RPC, ingen restriktiv `WITH CHECK` på `published` — publisering forblir rolle-gated som i dag.
  - Verifisert: `deno check` rent, eslint 0 errors, vitest 127/127. `.gitignore`: + `supabase/.temp/`, `deno.lock`.
  - **Gjenstår:** migrasjon mot prod (Magnus' go) → deretter deploy `generate-article-draft` + regenerer TS-typer.
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
