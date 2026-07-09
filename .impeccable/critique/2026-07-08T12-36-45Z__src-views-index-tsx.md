---
target: forsiden (/)
total_score: 24
p0_count: 2
p1_count: 2
timestamp: 2026-07-08T12-36-45Z
slug: src-views-index-tsx
---
Method: dual-agent (A: design-review-agent · B: detector-agent)

# Design-kritikk: Forsiden (src/views/Index.tsx)

## Design Health Score

| # | Heuristikk | Score | Nøkkelfunn |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | MarketTicker-feil viser evig «Henter markedstall…»; fetch-feil svelges stille |
| 2 | Match System / Real World | 3 | God bokmål; «Trending nå»-anglisisme; «Tall»/«Hjernevelvet» er uforklart sjargong |
| 3 | User Control and Freedom | 2 | Marquee kan ikke pauses på touch/tastatur; artikler kan ikke åpnes i ny fane; tvungen onboarding-redirect |
| 4 | Consistency and Standards | 2 | Artikler er `<button>`, ikke `<a>`; nøstede interaktive elementer; `ul > div > li` |
| 5 | Error Prevention | 3 | Poll-dobbelstemme sikret; lite annet risikabelt |
| 6 | Recognition Rather Than Recall | 2 | Desktop-nav er 4 ikon-knapper uten tekst (kun title-tooltip) |
| 7 | Flexibility and Efficiency | 3 | Valgbar landingsside, URL-parametre, filtre, språkbytte — genuint bra |
| 8 | Aesthetic and Minimalist Design | 2 | 7 stablede moduler; ticker + tour + FAB + poll konkurrerer med journalistikken |
| 9 | Error Recovery | 2 | Nettverksfeil viser «Ingen publiserte artikler ennå» — en løgn |
| 10 | Help and Documentation | 3 | 10-stegs tour finnes (overivrig, men skippbar); Tilgjengelighet-side i footer |
| **Total** | | **24/40** | **Acceptable — betydelige forbedringer trengs** |

## Anti-mønster-dom

**Ikke flagrant AI-slop, men gjenkjennelig AI-æra malgrammatikk.** Kystlys-identiteten (krempapir + prikktekstur, Lora/Source Sans 3, terrakotta) er et ekte, dokumentert merkevarevalg — identitetsbevaring gjelder. Men: det sterkeste AI-tegnet er den firedoblede seksjonsoverskriften **ikon-i-tonet-avrundet-flis + tittel + undertittel** (NewsFeed/TrendingSection/JobChangeFeed/EventsFeed), pluss uppercase-eyebrows som er i ferd med å etablere seg (3 forekomster), pluss uniform `animate-fade-up` på alle kort. En designer ville sagt «AI hjalp til her».

**Deterministisk skann (detektoren, kjørt i rendret side):** 7 anti-mønstre. De seks kontrastbruddene er hovedfunnet — og de sammenfaller nøyaktig med designgjennomgangens uavhengige beregninger:
- `#ffffff` på `#DA9781` (terrakotta-knapper): **2,4:1** — 3 forekomster (Logg inn, Spør-submit, aktive kategori-piller)
- `#8A8075` på krem: **3,7:1** — 3 forekomster (utdrag, tidsstempler, hero-undertekst)
- `cream-palette` på body: treff, men bevisst identitetsvalg dokumentert i PRODUCT.md/DESIGN.md — avvises som funn
- `bounce-easing` + `layout-transition` på body: lav konfidens, trolig stylesheet-feilattribusjon (accordion-keyframes animerer height — verdt en grep senere)

**CLI-skann av kildefilene:** 1 treff — `border-accent-on-rounded` i NewsFeed.tsx:371. **Falskt positiv** (Tailwind-loading-spinneren, `border-b-2` + rotasjon ER spinneren).

**Hvor detektoren og gjennomgangen er enige:** kontrastbruddene (målt likt fra to uavhengige metoder — dette er sikre funn). **Hvor gjennomgangen fanget det detektoren ikke kan se:** knapper-i-stedet-for-lenker, informasjonsarkitekturen, mal-scaffoldingen, rustrose brukt på populærinnhold. **Detektorens unike bidrag:** bekreftelse i faktisk rendret DOM, ikke bare tokens.

Visuelle overlays: injeksjonen lyktes og logget funn, men en Vite-HMR-reload fjernet overlayene før de kunne inspiseres — konsollbeviset ble sikret først.

## Helhetsinntrykk

En gjennomført og modig merkevareidentitet — Kystlys-paletten, serif-kontrasten og impressum-footeren er ekte avis — men forsiden oppfører seg som en app-shell, ikke en avisforside. Journalistikken starter på scrolleposisjon 3, bak en ticker, en trending-modul i alarmfarge og en AI-lyd-oppsalg. Den største muligheten: la avisa være førsterommet i det varme handelshuset, og fiks de to kontrastbruddene som undergraver «lesbarhet er ikke forhandlingsbart».

## Hva som fungerer

1. **EventsFeed-tomtilstanden** (EventsFeed.tsx:179-227): forklarer *hvorfor* den er tom, tilbyr to graderte handlinger, varmt presist bokmål. Sidens best utformede tilstand.
2. **Footer-impressum** (SiteFooter.tsx:46-54): utgiver, ansvarlig redaktør, MBL, PFU, Vær Varsom-plakaten — PRODUCT.md-prinsipp 4 («troverdighet gjennom transparens») utført stille og troverdig. Annonsemerking likeså.
3. **Token-disiplin og dark mode-paritet:** alt går gjennom CSS-vars; dark mode er et reelt likeverdig tema — muted-tekst måler 5,6:1 der (består), og dark-mode `--accent-foreground` er korrekt mørk.

## Prioriterte funn

**[P0] Hvit tekst på terrakotta — 2,4:1.**
- **Hva:** `--accent-foreground: 0 0% 100%` (index.css:37) gir hvit 14px-tekst på #DA9781 i Logg inn-knappen, Spør-submit og aktive kategori-piller. Bekreftet av begge vurderinger uavhengig.
- **Hvorfor det betyr noe:** Halvparten av AA-kravet. Bryter DESIGN.md sin egen navngitte regel. Rammer de mest brukte interaktive elementene.
- **Fiks:** Sett light-mode `--accent-foreground` til mørk blekk (`30 20% 15%`) — dark mode gjør dette riktig allerede. Én linje, sidevis effekt.
- **Foreslått kommando:** /impeccable audit (systematisk kontrastpass) eller direkte fiks.

**[P0] Artikkelkort er `<button>`, ikke lenker.**
- **Hva:** NewsFeed.tsx:487/545, TrendingSection.tsx:103 — hver sak på forsiden av en *avis* kan ikke midtklikkes, høyreklikk-deles, har ingen visited-state og er usynlig for crawlere.
- **Hvorfor det betyr noe:** SEO er eksistensielt for Next.js-migreringen (fase 3); deling er distribusjon for en avis.
- **Fiks:** Render `<Link to="/article/:id">` stylet som kort; fikser samtidig de ordrike hele-kortet-accnames for skjermlesere.
- **Foreslått kommando:** /impeccable harden.

**[P1] Metatekst 3,7:1 ved 14px, overalt.**
- **Hva:** `--muted-foreground` (#8A8075 på krem) bærer alle utdrag, tidsstempler, bylines.
- **Hvorfor det betyr noe:** Publikummet inkluderer eldre lesere; PRODUCT.md sier «lesbarhet er ikke forhandlingsbart». Solveig (67) på iPad i dagslys leser ikke dette.
- **Fiks:** Mørkne til ~`30 8% 40%` (≈4,9:1); behold dark-mode-verdien (består allerede).
- **Foreslått kommando:** /impeccable audit.

**[P1] Bevegelse uten samtykke.**
- **Hva:** 60s evig marquee (kun hover-pause — ingenting for touch/tastatur, WCAG 2.2.2-brudd), staggered fade-up på alle kort, pulserende prikker — og **null** `prefers-reduced-motion`-håndtering i prosjekt-CSS (én rest i App.css), stikk i strid med DESIGN.md.
- **Fiks:** `motion-reduce:`-varianter på alle entrance-animasjoner; synlig pauseknapp på tickeren eller konverter til statisk stripe.
- **Foreslått kommando:** /impeccable animate (med reduced-motion som førsteprioritet).

**[P2] Mal-scaffolding + Én-stemme-brudd.**
- **Hva:** Ikon-flis-seksjonsheaderen ×4; «Trending nå» brenner rustrose/alarmfargen (+ rød Flame + røde «I dag»-fliser) på ikke-feil-innhold; hero-linje 2 bruker aksentfarge for hierarki mot Lora-først-regelen.
- **Fiks:** La Lora-titler alene bære seksjonene; reserver rødt; dropp heroens fargede linje.
- **Foreslått kommando:** /impeccable quieter + /impeccable layout.

## Persona-rødflagg

**Jordan (førstegangsbruker):** Tvungen `/velkommen`-redirect før noe innhold (Index.tsx:53); 10-stegs tour ved ankomst; standardvisning er en tom søkeboks i stedet for nyheter; «Tall»/«Hjernevelvet» uforklart; ingen synlig vei til abonnement.

**Casey (mobil):** Inaktive ViewToggle-faner kollapser til kun ikon; hamburger 36×36 og stjerne-kontroll 26×26 — begge under prosjektets egen 40px-gulv; ticker-kildelenker er 16px høye mål *inne i en bevegelig marquee*; marqueen kan overhodet ikke pauses uten hover-pekert.

**Sam (tilgjengelighet):** Begge kontrastbruddene; nøstede interaktive elementer (span[role=button] i `<button>` — EventsFeed.tsx:302; `<a>` i `<button>` — JobChangeFeed.tsx:110) gir brutt fokusrekkefølge; `ul > div > li` (JobChangeFeed.tsx:195-199) bryter listesemantikk; ingen reduced-motion-vei.

**Solveig, 67, pensjonert regnskapsfører i Ulsteinvik (prosjektpersona fra PRODUCT.md):** 14px metatekst på 3,7:1 er uleselig på iPad i dagslys; ikon-only desktop-nav kommuniserer ingenting; «Trending», «AI-leste» er fremmedord; den evig rullende tickeren er akkurat distraksjonen hun forlot VG for å slippe; og inngangsdøra ber henne *formulere et spørsmål* i stedet for å gi henne avisa.

## Mindre observasjoner

- MarketTicker-feiltilstand = permanent «Henter markedstall…» (`if (loading || !data)` fanger begge).
- Bitcoin i tickeren til en regional næringsavis er et redaksjonelt spørsmål; emerald/rose-endringene og annonsens amber-kant er utenfor paletten.
- Fetch-feil i NewsFeed viser «Ingen publiserte artikler ennå» — feil budskap ved nettverksfeil.
- `w-4.5 h-4.5` i JobChangeFeed.tsx:170 er ikke en Tailwind-klasse — inert; ikonet render på lucide-default 24px.
- «Featured»-artikkel er bare indeks 0 etter filter — skifter vilkårlig med filtrering.
- ViewToggle navigerer til «Tall»/«Hjernevelvet» via `window.location.href` — full sidelast inne i en SPA.
- Tre inngangspunkter til Spør på samme skjerm (hero, FAB, tour steg 1).
- Hjernevelvet og Hjernetrim er synlige i nav tross parkering bak feature flags (forventet på staging; verifiser prod-flagg før lansering).
- Heroens «Få svar basert på verifiserte data» er en sterk påstand for LLM-arkivsvar — etterrettelighets-eksponering.
- Touren åpner i søkevisning, men flere steg peker på elementer som kun finnes i feed-visning — steg peker trolig på ingenting.
- `.border-accent-left` (index.css:200) er definert men ubrukt — sovende avvik, trygt å slette.

## Spørsmål å vurdere

1. Hvorfor åpner en avis' inngangsdør mot en tom tekstboks? Er Spør produktet, eller produktets beste triks? PRODUCT.md sier abonnentene kommer for å *holde seg orientert* — burde ikke feeden være standard og Spør akseleratoren oppå?
2. Hvis rustrose er «den eneste alarmen i systemet», hvorfor er sidens høyeste rødnivå festet til de mest *populære* sakene? Er popularitet en nødsituasjon?
3. Hvor på hele denne forsiden blir en leser abonnent? Låser porter godene, men ingenting selger dem.
4. Ville Solveig kalt dette «avisa mi» eller «en app»? Ticker, fire faner, en FAB, en tour, en poll, et lyd-oppsalg — hvilke av disse har gjort seg fortjent til en plass i det varme handelshusets førsterom?
5. Er «AI-leste sammendrag i journalistenes egne stemmer» forenlig med innholdsmerkingen merkevaren står på — og hvor er merkingen?
