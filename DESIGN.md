---
name: Nær Næring Nordvest
description: Regional næringslivsavis — varm, nær og etterrettelig
colors:
  fersken-solnedgang: "#E4AF81"
  stovet-terrakotta: "#DA9781"
  morgenlys-krem: "#FAF9F4"
  skumhvit: "#FCFBF8"
  sandbanke: "#F6F4EF"
  strandskjell: "#F2EFE8"
  fjaeresand: "#EEEAE2"
  drivvedgraa: "#E7E2DA"
  drivvedbrun: "#474038"
  blekkbrun: "#3B332B"
  kystgraa: "#7C736A"
  teglrod: "#C9795E"
  teglrod-dyp: "#BE5937"
  rustrose: "#D77575"
  kveldsbrygge: "#352E27"
typography:
  display:
    fontFamily: "Lora, Georgia, serif"
    fontWeight: 700
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Lora, Georgia, serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontWeight: 400
  label:
    fontFamily: "Source Sans 3, system-ui, sans-serif"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.fersken-solnedgang}"
    textColor: "#2E261F"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.morgenlys-krem}"
    textColor: "{colors.drivvedbrun}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.strandskjell}"
    textColor: "{colors.drivvedbrun}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.morgenlys-krem}"
    textColor: "{colors.drivvedbrun}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.skumhvit}"
    textColor: "{colors.drivvedbrun}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Nær Næring Nordvest

## 1. Overview

**Creative North Star: "Det varme handelshuset"**

Et regionalt handelshus: solid og forretningsmessig, men med åpen dør og varme i veggene. Systemet er en næringslivsavis som nekter å velge mellom troverdighet og nærhet — autoriteten bæres av Lora-serifens redaksjonelle tyngde og et rolig hierarki, mens varmen bæres av kremhvite papirflater, fersken og støvet terrakotta. Tettheten er avislesing, ikke dashbord: generøs luft rundt tekst, 65–75ch linjelengde i brødtekst, og et diskret prikkete papirmønster på bakgrunnen som gir flaten materialfølelse uten å forstyrre.

Systemet avviser eksplisitt (fra PRODUCT.md): tabloid/klikkjag, generisk SaaS/startup-estetikk, gammeldags lokalavis-rot og kald finanspresse. Varmen er vertskap, ikke pynt — og den koster aldri lesbarhet. Komponentene er **presise og stille**: de svarer på interaksjon med farge- og kantskift, ikke med hopp, løft eller skala-triks.

**Key Characteristics:**
- Serif-autoritet (Lora) mot sans-varme (Source Sans 3)
- Kremhvitt papir med prikk-tekstur som grunnflate; farge brukes sparsomt
- Flat i ro; myk, diffus skygge kun ved løft
- Presise og stille interaksjoner — ingen bevegelse uten grunn
- Dark mode er et likeverdig tema, ikke et etterslep

## 2. Colors: Kystlys-paletten

Varmt morgenlys over kysten: krem, drivved og fersken — med terrakotta som eneste stemme som hever seg.

### Primary
- **Fersken-solnedgang** (#E4AF81 / hsl(28 65% 70%)): Primærknapper, aktive tilstander og merkevare-øyeblikk. Alltid med mørk tekst (#2E261F) — aldri hvit tekst på fersken.

### Secondary
- **Støvet terrakotta** (#DA9781 / hsl(15 55% 68%)): Aksent og fokusring. Lenkefargene **Teglrød** (#C9795E) og **Teglrød dyp** (#BE5937, hover) er terrakottaens tekst-trygge slektninger.

### Tertiary
- **Rustrose** (#D77575 / hsl(0 55% 65%)): Destruktive handlinger og feil. Den eneste "alarmen" i systemet — dempet selv når den advarer.

### Neutral
- **Morgenlys-krem** (#FAF9F4): Sidebakgrunn (med prikkmønster i 6 % drivvedbrun).
- **Skumhvit** (#FCFBF8): Kort, popover og hevede flater.
- **Sandbanke** (#F6F4EF) og **Strandskjell** (#F2EFE8): Subtile og sekundære flater — tonal lagdeling uten skygge.
- **Fjæresand** (#EEEAE2): Muted-flater; **Drivvedgrå** (#E7E2DA): kantlinjer og input-rammer.
- **Blekkbrun** (#3B332B): Overskrifter. **Drivvedbrun** (#474038): Brødtekst. **Kystgrå** (#7C736A): Underoverskrifter og metadata — kun i store størrelser eller for ikke-essensiell tekst.
- **Kveldsbrygge** (#352E27): Admin-sidebar. Mørk drivved er CMS-territorium og skal ikke lekke inn i leserflaten.

### Named Rules
**Én-stemme-regelen.** Fersken og terrakotta er verter, ikke tapet: saturert farge dekker ≤10–15 % av enhver leserflate. Varmen bæres av kremflatene og typografien, ikke av fargeblokker.

**Kveldsbrygge-regelen.** Den mørke sidebaren tilhører admin/CMS. Leserflaten er alltid lys eller ekte dark mode — aldri en mellomting.

## 3. Typography

**Display Font:** Lora (med Georgia, serif som fallback)
**Body Font:** Source Sans 3 (med system-ui, sans-serif som fallback)

**Character:** Klassisk serif-kontrast: Lora gir redaksjonell tyngde og avis-identitet i titlene, Source Sans 3 holder brødtekst og UI nøkternt og moderne. Paret på kontrastakse (serif + humanist sans) — aldri to like sans-serifer.

### Hierarchy
- **Display** (Lora 700, -0.02em, `text-wrap: balance`): Forsidens hovedoppslag og artikkeltitler.
- **Headline** (Lora 600, -0.02em): Seksjonstitler, korttitler. Alle h1–h6 settes i Lora med Blekkbrun (#3B332B).
- **Title/Subhead** (Source Sans 3 500): Ingresser og underoverskrifter i Kystgrå — kun over 18px.
- **Body** (Source Sans 3 400, 16px basis, linjelengde 65–75ch): Brødtekst i Drivvedbrun (#474038). `text-wrap: pretty` på lang prosa.
- **Label** (Source Sans 3 500, 14px): Knapper, skjemafelt, metadata.

### Named Rules
**Lora-først-regelen.** Hierarki bæres av serif-kontrasten og størrelsesskala — aldri av farge, versaler eller utrop. Hvis en tittel trenger farge for å vinne oppmerksomhet, er hierarkiet feil.

## 4. Elevation

Flat i ro, myk ved løft. Flater er flate som standard, og dybde i ro bæres av tonal lagdeling (Morgenlys-krem → Sandbanke → Skumhvit) og Drivvedgrå kantlinjer. Skygger er ambiente — varme, diffuse og svake — og opptrer kun som respons på tilstand: hover på kort, åpne overlegg, hevede paneler.

### Shadow Vocabulary
- **Myk** (`box-shadow: 0 2px 12px -3px hsl(30 15% 20% / 0.06)`): Kort i ro som trenger et hint av separasjon fra papiret.
- **Hevet** (`box-shadow: 0 8px 24px -6px hsl(30 15% 20% / 0.1)`): Overlegg, dropdowns, aktive/hoverede kort.

### Named Rules
**Flat-i-ro-regelen.** Ingen flate har skygge uten grunn. Kan separasjonen løses med tonal lagdeling eller en kantlinje, skal den det.

## 5. Components

Komponentene er **presise og stille**: tydelige kanter, dempede overganger (150–200ms, ease-out), og tilstandsskift via farge og kant — aldri via løft, skala eller sprett. Klikkflater er romslige (minimum 40px høyde) av hensyn til eldre lesere.

### Buttons
- **Shape:** Myke hjørner (12px radius), 40px høyde, 16px horisontal padding.
- **Primary:** Fersken-solnedgang med mørk tekst (#2E261F); hover demper til 90 % opasitet — ingen bevegelse.
- **Hover / Focus:** Fargeskift kun. Fokus: 2px ring i Støvet terrakotta med offset.
- **Outline:** Drivvedgrå kant på krem, hover fyller med aksent-tone. **Secondary:** Strandskjell-flate. **Ghost:** Transparent til aksent-tone på hover.

### Cards / Containers
- **Corner Style:** 16px radius (24px for fremhevede flater).
- **Background:** Skumhvit på Morgenlys-krem; Sandbanke for subtile paneler.
- **Shadow Strategy:** Flat i ro med Drivvedgrå kant; Myk skygge kun når kortet er interaktivt, Hevet ved hover.
- **Internal Padding:** 24px (16px på mobil).

### Inputs / Fields
- **Style:** Krem bakgrunn, 1px Drivvedgrå kant, 20px radius, 10px/16px padding, Source Sans 3.
- **Focus:** 2px ring i Støvet terrakotta (30 % opasitet) + kantskift til terrakotta. Ingen glød.
- **Placeholder:** Må holde 4.5:1 kontrast — Kystgrå er for lys på krem; bruk Drivvedbrun i 70 % eller mørkere.

### Navigation
- **Style:** Rolig tekstnavigasjon i Source Sans 3 500; aktiv tilstand markeres med Blekkbrun tekst og/eller diskret understrek — ikke fargeblokker. Admin-navigasjon lever i Kveldsbrygge-sidebaren med kremhvit tekst.

### Lenker (signatur)
- Teglrød (#C9795E) i løpende tekst, Teglrød dyp (#BE5937) på hover. Lenker i brødtekst er den ene fargen leseren møter i selve lesingen — den skal aldri konkurrere med Fersken-solnedgang-knapper i samme visning.

## 6. Do's and Don'ts

### Do:
- **Do** sett all brødtekst i Drivvedbrun (#474038) på kremflater — 4.5:1 er gulvet, ikke målet; publikummet inkluderer eldre lesere.
- **Do** bruk tonal lagdeling (krem → sandbanke → skumhvit) før du griper til skygge.
- **Do** hold saturert farge under 10–15 % av leserflaten (Én-stemme-regelen).
- **Do** gi hver animasjon et `prefers-reduced-motion`-alternativ; eksisterende fade/scale-keyframes skal falle tilbake til øyeblikkelig visning.
- **Do** vedlikehold dark mode som likeverdig tema ved hvert eneste designtillegg.

### Don't:
- **Don't** bygg *tabloid/klikkjag*-mønstre: ingen skrikende overskrifter, røde bannere, tellere eller blinkende elementer (anti-referanse fra PRODUCT.md).
- **Don't** bygg *generisk SaaS/startup*-estetikk: ingen gradient-heroer, hero-metric-maler, identiske kort-grids eller uppercase-eyebrows over hver seksjon (anti-referanse fra PRODUCT.md).
- **Don't** la flaten rote seg til som en *gammeldags lokalavis*, og **don't** kle den i *kald finanspresse*-mørkeblå (anti-referanser fra PRODUCT.md).
- **Don't** bruk `background-clip: text` med gradient — `--gradient-warm` er kun for flater, aldri for tekst.
- **Don't** bruk fargede side-striper (`border-left` > 1px) som aksent på kort eller varsler. Utility-klassen `.border-accent-left` i index.css er et kjent avvik og skal fases ut, ikke gjenbrukes.
- **Don't** sett hvit tekst på Fersken-solnedgang eller Støvet terrakotta i liten størrelse — kontrasten holder ikke; bruk mørk tekst (#2E261F).
- **Don't** animer løft, skala eller sprett på hover — komponentene er presise og stille; tilstandsskift skjer i farge og kant.
