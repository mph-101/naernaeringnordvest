# Per-region abonnement — designnotat (til godkjenning)

> Status: **utkast, venter på Magnus' beslutning.** Ingen kode skrevet ennå.
> Henger sammen med [`multi-region-design.md`](multi-region-design.md) §3.3–3.4.
> Skrevet 2026-06-09 etter ønsket: «Et abo skal også kun gi tilgang til
> enkeltredaksjoner.»

## Problemet

I dag er premium-tilgang binær og global: har du et aktivt abonnement, låses alt
premium-innhold opp uansett region. Når kjeden får flere redaksjoner (Nordvest,
Midt, Øst, Vest) skal et abonnement kjøpt for én redaksjon **ikke** låse opp
premium-saker i en annen redaksjon. Nasjonalt innhold (`region_slug = 'nasjonal'`)
skal være tilgjengelig for alle abonnenter uansett hvilken redaksjon de betaler for.

## Dagens tilstand (verifisert i prod 2026-06-09)

- `subscriptions.region_slug` **finnes** (lagt til i `20260518200000`), er nullbar,
  og ble default-satt til `nordvestlandet` for eksisterende rader. **0 abonnement
  i prod i dag** — vi står altså fritt til å definere modellen før noen er berørt.
- Tilgangssjekken (`useSubscription` / paywall) ser **ikke** på region. Den spør
  bare «har bruker aktivt abonnement?».
- Checkout (`create-checkout`) setter **ikke** `region_slug` på abonnementet.
- Ingen RLS eller frontend-gate kobler artikkelens region til abonnementets region.

## Foreslått modell

### Datamodell
- Behold ett abonnement = én rad i `subscriptions`, med `region_slug` som **påkrevd**
  framover (NOT NULL for enkelt-region-abo; for bunt se beslutning 4). Én bruker kan ha
  **flere** rader (én per redaksjon) — det er slik «Nordvest-abo + Øst-abo separat»
  modelleres (jf. multi-region-design §3.3).
- Tilgangsregel for en gitt artikkel:
  - `region_slug = 'nasjonal'` → tilgjengelig for **alle** med et hvilket som helst
    aktivt abonnement.
  - ellers → krever aktivt abonnement med `subscriptions.region_slug =
    artikkel.region_slug` **eller** at artikkelen er delt til brukerens
    abonnementsregion via `article_shared_regions`.

### Checkout
- `create-checkout` må sette `region_slug` = den aktive header-regionen
  (`useRegion().current`) på metadata, og webhooken (`payments-webhook`) skriver den
  inn på `subscriptions`-raden. Dette er en **endring i Stripe-flyten** og skal etter
  arbeidsreglene foreligges/PR-es isolert.
- Besluttet (se under): **felles pris + `region_slug`-metadata** for enkelt-region,
  pluss et eget **bunt**-produkt for «hele kjeden».

### Håndheving (defense-in-depth)
1. **RLS** på `articles` (og evt. en `can_read_premium(article)`-funksjon) som tar
   høyde for abonnementets region. Premium-body bør ikke kunne hentes av klient uten
   region-match — i dag er paywall delvis frontend.
2. **Frontend** (`useSubscription`) utvides til `hasAccessToRegion(slug)` slik at
   paywall-UI matcher serveren.

## Beslutninger — BESLUTTET 2026-06-09

1. **Prising:** ✅ **Felles pris + `region_slug` som metadata.** Ett sett Stripe-priser
   for et enkelt-redaksjons-abo; region merkes på abonnementet (ikke egne priser per
   region). Per-region-priser kan innføres senere hvis en redaksjon vil ha annen pris.
2. **Bunt/«hele kjeden»-abo:** ✅ **Ja — inkluder bunt nå.** Det skal finnes et
   abonnement som gir tilgang til **alle** regioner (egen «Nasjonal+»/kjede-pakke,
   eget Stripe-produkt/pris i tillegg til enkelt-redaksjons-prisen).
3. **Nasjonalt innhold:** ✅ **Ethvert aktivt abonnement (enkelt-region ELLER bunt)
   låser opp premium `nasjonal`-saker.** Ikke-premium nasjonalt er åpent for alle.
4. **`region_slug` NOT NULL:** ⚠️ **Revidert pga. bunt-beslutningen.** Et bunt-abo
   tilhører ikke én region, så `region_slug` kan ikke være en enkel NOT NULL-region for
   de radene. Modell (avgjøres i implementasjon): enten
   - `subscriptions.access_scope text` (`'region'` | `'all'`) + `region_slug` NOT NULL
     kun når scope = `'region'`, eller
   - behold `region_slug` nullbar der **NULL = bunt/all-tilgang**, NOT NULL ellers.
   Første alternativ er tydeligst og anbefales. (0 abonnement i prod, så ingen datavask.)
5. **Rekkefølge:** ✅ **Bygges sammen med Stripe-direkte (1.6) + multi-region**, ikke
   som bolt-on nå. Checkout/webhook er det naturlige stedet å skrive `region_slug` /
   `access_scope` på abonnementet, og Stripe-direkte er forutsetning for å røre den
   flyten rent.

### Oppdatert tilgangsregel (gitt beslutningene)
En bruker har tilgang til en premium-artikkel hvis hen har et aktivt abonnement som
enten (a) er et **bunt** (`access_scope = 'all'`), (b) matcher artikkelens
`region_slug`, eller (c) `region_slug = 'nasjonal'`, eller (d) artikkelen er delt til
en region brukeren har abo for via `article_shared_regions`.

### Når dette bygges (fase 1.6 / 2) lager jeg egne PR-er:
- (a) Skjema: `access_scope` (+ evt. NOT NULL-betinging) + RLS / `can_read_premium()`.
- (b) Checkout/webhook: sett `region_slug` + `access_scope` fra valgt plan/region.
- (c) Frontend: `useSubscription.hasAccessToRegion(slug)` så paywall-UI matcher server.
- (d) Stripe: opprett bunt-produkt/pris i tillegg til enkelt-redaksjons-prisene.
