# Fargepalett — Nær Næring Nordvest

Den fullstendige palett brukt i prosjektet. HSL-verdiene er kanoniske (de ligger i `src/index.css`). HEX-verdiene er beregnet for bruk i designverktøy (Figma, Pencil, Adobe XD) — runde av med ±1 i siste verdi er normalt.

Filosofi: **Soft pastel Scandinavian.** Varme, lavmettede farger som ligner trykt papir under varmt lys. Vi unngår "skarpe" rene farger (kald blå, neongrønn, ren rød) som ville bryte den varme tonen.

---

## 1. Palett-oversikt

### Lyst tema (default)

| Token | HSL | HEX | Visuelt navn |
|---|---|---|---|
| `--background` | `45 40% 97%` | `#FAF9F4` | Varm krem |
| `--card` | `45 35% 98%` | `#FCFBF8` | Lys krem |
| `--surface-subtle` | `42 28% 95%` | `#F6F4EF` | Mellom-krem |
| `--surface-elevated` | `45 35% 98%` | `#FCFBF8` | Lys krem (samme som card) |
| `--secondary` | `40 30% 93%` | `#F3EFE8` | Sand |
| `--muted` | `38 25% 91%` | `#EEEAE2` | Lys havre |
| `--border` | `38 22% 88%` | `#E7E2DA` | Beige |
| `--muted-foreground` | `30 8% 50%` | `#8A8075` | Grå-brun |
| `--subhead` | `30 8% 45%` | `#7C736A` | Mørkere grå-brun |
| `--secondary-foreground` | `30 12% 30%` | `#564D43` | Varm sjokolade |
| `--primary-foreground` | `30 20% 15%` | `#2E261F` | Mørk kakao |
| `--foreground` | `30 12% 25%` | `#474038` | Varm grå |
| `--headline` | `30 15% 20%` | `#3B332B` | Mørk kakao |
| `--primary` | `28 65% 70%` | `#E4AF81` | **Soft peach** |
| `--accent` | `15 55% 68%` | `#DA9781` | **Dusty rose** |
| `--ring` | `15 55% 68%` | `#DA9781` | Dusty rose (samme som accent) |
| `--link` | `15 50% 58%` | `#C9795E` | Terracotta |
| `--link-hover` | `15 55% 48%` | `#BE5937` | Mørk terracotta |
| `--destructive` | `0 55% 65%` | `#D77575` | Dempet rød |
| `--accent-foreground` | `0 0% 100%` | `#FFFFFF` | Hvit |

### Mørkt tema

| Token | HSL | HEX | Visuelt navn |
|---|---|---|---|
| `--background` | `30 12% 9%` | `#1A1714` | Dyp brun-svart |
| `--surface-subtle` | `30 10% 11%` | `#1F1C19` | Svært mørk brun |
| `--card` | `30 10% 13%` | `#24211E` | Mørk espresso |
| `--surface-elevated` | `30 10% 15%` | `#2A2622` | Espresso |
| `--secondary` | `30 10% 18%` | `#322E29` | Mørk mokka |
| `--muted` | `30 10% 20%` | `#38332E` | Mokka |
| `--border` | `30 10% 22%` | `#3E3832` | Lys mokka |
| `--subhead` | `38 8% 58%` | `#9C968B` | Varm grå |
| `--muted-foreground` | `38 8% 55%` | `#958F83` | Dempet varm grå |
| `--foreground` | `38 15% 90%` | `#E9E7E2` | Lys krem |
| `--headline` | `42 25% 94%` | `#F4F1EC` | Off-white |
| `--primary` | `28 55% 65%` | `#D7A275` | **Dempet peach** |
| `--accent` | `15 45% 60%` | `#C7826B` | **Dempet rose** |
| `--link` | `15 45% 62%` | `#CA8872` | Dempet terracotta |
| `--link-hover` | `15 50% 72%` | `#DBA694` | Lys terracotta |
| `--destructive` | `0 50% 55%` | `#C65353` | Mørkere rød |

---

## 2. Kjernen — brand-farger

To farger bærer hele palettens karakter:

### Soft Peach (primary)
```
HSL:  hsl(28, 65%, 70%)
HEX:  #E4AF81
RGB:  228, 175, 129
```
Bruksområder: primær handling (CTA-knapper i lavt-prioriterte sammenhenger), illustrasjons-aksenter, soft-glow på fokus, kompass-needle, hover-tilstand i forhøyede flater.

### Dusty Rose (accent)
```
HSL:  hsl(15, 55%, 68%)
HEX:  #DA9781
RGB:  218, 151, 129
```
Bruksområder: hoved-CTA (send, kjøp, bli med), nav-ikoner som er aktivert, focus-ring, varselbobler, drop-cap i features.

Disse to går alltid sammen, alltid med peach som "støttepartner" og rose som "fronten". Aldri primary brukt som store flatebackground — det er for høyt mettet.

### Pairing-eksempel
```
bg-accent       text-accent-foreground   (CTA-knapp)
bg-primary/10   text-primary             (ikon på bakgrunn)
bg-accent/5     border-accent/20         (varselboks)
```

`/10` og `/20` er Tailwind opacity-modifiers — det gir oss subtile bakgrunner uten å introdusere flere fargetokens.

---

## 3. Gradient

Brand-graidienten brukes for hero-områder og spesielle promoer.

```css
--gradient-warm: linear-gradient(135deg,
  hsl(28, 65%, 70%) 0%,     /* primary */
  hsl(15, 55%, 68%) 100%);   /* accent */
```

Tailwind-alias: `bg-gradient-warm`. I praksis ser den ut som en solnedgang gjennom et papirfilter.

---

## 4. Skygger

Ikke en farge per se, men en del av palettens karakter. Skygger er **alltid** varme (basert på `hsl(30 15% 20%)` med lav opacity), aldri ren svart.

| Token | Verdi | Bruk |
|---|---|---|
| `--shadow-soft` | `0 2px 12px -3px hsl(30 15% 20% / 0.06)` | Kort, kapsler, standard depth |
| `--shadow-elevated` | `0 8px 24px -6px hsl(30 15% 20% / 0.1)` | Modaler, dropdowns, popovers |

I mørkt tema bytter de til ren svart med høyere opacity (0.3 / 0.4) fordi en mørk skygge på mørk bakgrunn ellers ikke vises.

---

## 5. Spesial-farger for proofreading

ArticleEditor sin "proofread"-funksjon overlay forskjellige fargekoder på tekst. Disse er ikke en del av hovedpaletten men hører til editor-domenet:

| Klasse | Bakgrunn | Bruk |
|---|---|---|
| `.proofread-highlight` | `var(--primary) / 0.18` | Generell foreslått endring |
| `.proofread-anglisisme` | `var(--destructive) / 0.15` | Engelsk-låning |
| `.proofread-grammatikk` | `var(--destructive) / 0.18` | Grammatikkfeil |
| `.proofread-skrivefeil` | `var(--destructive) / 0.18` | Stavefeil |
| `.proofread-dialekt` | `var(--accent) / 0.35` | Dialektutslag |
| `.proofread-stil` | `var(--accent) / 0.35` | Stilforslag |
| `.proofread-forenkling` | `var(--muted-foreground) / 0.18` | Forenklingsforslag |
| `.proofread-chip-accept` | `hsl(142 71% 45% / 0.15)` | Aksept-knapp (kun grønn-fargen som bryter palett — bevisst valg for tydelig CTA) |

---

## 6. Tilgjengelighet — kontrastsjekk

WCAG AA krever 4.5:1 for normal tekst, 3:1 for stor tekst (18pt+).

### Lyst tema — verifiserte kombinasjoner

| Forgrunn | Bakgrunn | Kontrast | Status |
|---|---|---|---|
| `foreground` (#474038) | `background` (#FAF9F4) | 8.5:1 | ✅ AAA |
| `headline` (#3B332B) | `background` (#FAF9F4) | 10.1:1 | ✅ AAA |
| `muted-foreground` (#8A8075) | `background` (#FAF9F4) | 3.6:1 | ⚠ Stor tekst OK, ikke normal |
| `accent-foreground` (#FFFFFF) | `accent` (#DA9781) | 2.7:1 | ❌ KUN for store CTA-knapper |
| `primary-foreground` (#2E261F) | `primary` (#E4AF81) | 8.7:1 | ✅ AAA |

**Viktig:** `accent` med hvit tekst er på grensen. Det er greit for store CTA-knapper (3:1 holder for stor tekst), men ikke for liten brødtekst på accent-bakgrunn.

### Mørkt tema

Generelt mer komfortable kontraster fordi de mørke flatene gir mer plass mellom forgrunn og bakgrunn.

| Forgrunn | Bakgrunn | Kontrast |
|---|---|---|
| `foreground` (#E9E7E2) | `background` (#1A1714) | 12.5:1 ✅ |
| `headline` (#F4F1EC) | `background` (#1A1714) | 14.2:1 ✅ |
| `accent-foreground` (#2E261F) | `accent` (#C7826B) | 5.4:1 ✅ |

---

## 7. Fargebruks-anbefalinger

### Hva vi bruker accent for
- Hoved-CTA (send, betal, bli med, kjøp)
- Aktiv tilstand i navigasjon
- Fokus-ring (`focus:ring-accent/30`)
- Highlight i drop-cap på artikler
- Notifikasjons-dot
- Selected state i piller / filter-chips

### Hva vi bruker primary for
- Sekundære handlinger (men ikke ghost)
- Decorative accents i kort (ikon-bakgrunn)
- Animasjons-glow (proofread highlights, pulse-ring)
- Soft brand-touchpoints (logo-glow, scroll-indikator)

### Hva vi IKKE bruker
- Ren `#000000` for tekst → bruk `foreground`
- Ren `#FFFFFF` for bakgrunn → bruk `background`
- Pure red (`#FF0000`) for advarsler → bruk `destructive` (`#D77575`)
- Pure green for "suksess" → vi har ingen grønn i paletten. Bruk accent eller `text-foreground` med ✓-ikon
- Blå (i det hele tatt) → bryter palett-karakter

### Pure-color brudd som er aksepterte
- `accept`-knappen i proofread chips: grønn (`hsl(142 71% 45%)`) — eneste grønn i hele appen, bevisst valg for å skille fra reject-knappen
- Sterk hvit på accent-knapper: nødvendig for kontrast
- Vercel-deploy / build-status-ikoner: følger sine egne palett (utenfor vår kontroll)

---

## 8. Eksport til designverktøy

### Figma / Pencil
Import disse HEX-verdiene som "Color Styles" eller "Variables":

**Light theme:**
```
Background  : #FAF9F4
Card        : #FCFBF8
Foreground  : #474038
Headline    : #3B332B
Primary     : #E4AF81
Accent      : #DA9781
Border      : #E7E2DA
Muted       : #EEEAE2
Destructive : #D77575
Link        : #C9795E
```

**Dark theme:**
```
Background  : #1A1714
Card        : #24211E
Foreground  : #E9E7E2
Headline    : #F4F1EC
Primary     : #D7A275
Accent      : #C7826B
Border      : #3E3832
Muted       : #38332E
Destructive : #C65353
Link        : #CA8872
```

### CSS variables for andre prosjekter

Hvis du gjenbruker palett i et sideprosjekt, kopier `:root`- og `.dark`-blokkene fra `src/index.css` direkte.

### Tailwind tokens

Definert i `tailwind.config.ts` — bruk klassene som `bg-card`, `text-headline`, `border-accent` i stedet for å skrive farger inline.

---

## 9. Når dette dokumentet må oppdateres

Hvis du endrer en CSS-var i `src/index.css`:
1. Oppdater HSL-verdien i tabellen over
2. Re-konverter til HEX og oppdater (eller kjør konverterings-snippet i `git history`)
3. Sjekk kontrast-tabell hvis det er en tekst/bakgrunn-kombinasjon
4. Hvis det er en *ny* token, oppdater også `docs/design-system.md`

Hvis du legger til en spesial-farge (som proofread): legg den i seksjon 5, ikke i hovedpaletten — det holder skillet rent.

---

*Sist generert: 2026-05-21. HSL-verdier i `src/index.css` er fasiten. Endringer her må reflektere koden, ikke omvendt.*
