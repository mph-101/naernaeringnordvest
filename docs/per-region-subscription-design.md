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
  (NOT NULL) framover. Én bruker kan ha **flere** rader (én per redaksjon) — det er
  slik «Nordvest-abo + Øst-abo separat» modelleres (jf. multi-region-design §3.3).
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
- Åpent spørsmål: egne Stripe-priser per region, eller samme pris og kun
  `region_slug`-metadata? (Se beslutninger under.)

### Håndheving (defense-in-depth)
1. **RLS** på `articles` (og evt. en `can_read_premium(article)`-funksjon) som tar
   høyde for abonnementets region. Premium-body bør ikke kunne hentes av klient uten
   region-match — i dag er paywall delvis frontend.
2. **Frontend** (`useSubscription`) utvides til `hasAccessToRegion(slug)` slik at
   paywall-UI matcher serveren.

## Beslutninger jeg trenger fra deg før kode

1. **Prising:** Egne Stripe-priser per redaksjon (gir fleksibilitet per region), eller
   felles pris + `region_slug` som metadata (enklere)? Påvirker hvor mange
   Price/lookup_key-objekter som må opprettes.
2. **Bunt/«hele kjeden»-abo:** Skal det finnes et abonnement som gir tilgang til
   **alle** regioner (f.eks. en dyrere «Nasjonal+»-pakke), eller er alt strengt
   per-region i fase 1?
3. **Nasjonalt innhold:** Bekreft regelen «ethvert aktivt abonnement låser opp
   `nasjonal`-saker». Alternativet er at nasjonalt også er gratis/åpent.
4. **Migrering av dagens default:** Siden det er 0 abonnement, kan vi sette
   `region_slug` NOT NULL uten datavask. OK?
5. **Rekkefølge:** Dette er Fase 2/3-arbeid og rører Stripe + RLS (begge «spør først»
   i CLAUDE.md). Skal det vente til multi-region-skallet og Stripe-direkte (1.6) er
   landet, eller vil du ha en minimal RLS-gate nå?

Når disse er avklart lager jeg egne PR-er: (a) skjema/NOT NULL + RLS,
(b) checkout/webhook-region, (c) frontend `hasAccessToRegion`.
