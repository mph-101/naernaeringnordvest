# Designsystem — Nær Næring Nordvest

Dette dokumentet beskriver designspråket slik det faktisk er implementert i koden per 2026-05-21. Det er en referanse for å holde nye komponenter konsistente med eksisterende — hverken et fasit-katalog eller et statisk styleguide-prosjekt.

Når noe i koden avviker fra dette dokumentet, er det koden som er fasiten. Oppdater dokumentet, ikke endre eksisterende komponenter for å matche.

---

## 1. Designfilosofi

**"Soft pastel Scandinavian"** — varme, lavmettede farger, generøs whitespace, serif overskrifter mot sans-serif løpende tekst. Inspirasjon: norsk regional avis møter Apple News-lesbarhet.

Prinsipper:
- **Lesbarhet først.** Vi er en avis. Linjehøyde, kontrast, og fontstørrelser optimaliseres for lange tekster — ikke for visuell ornament.
- **Stillhet over støy.** Bruker accent-farge sparsomt for å markere handling og fokus. Ikke "alt i merkefarge".
- **Konsistens fra dag én.** Bruker design-tokens (CSS-vars) overalt, aldri hardkodede HEX-koder eller piksler i komponenter.
- **Tilgjengelighet er ikke valgfritt.** WCAG AA-kontrast som minstekrav, semantiske headinger, fokus-ringer på alle interaktive elementer.

---

## 2. Fargepalett

Definert som CSS-variabler i HSL-format i `src/index.css`. Aldri bruk hardkodede farge-strenger i komponenter — alltid `hsl(var(--<name>))` eller Tailwind-aliaset (f.eks. `bg-card`, `text-foreground`).

### Lyst tema (default)

| Token | HSL | Bruk |
|---|---|---|
| `--background` | `45 40% 97%` | Sidebakgrunn (varm krem) |
| `--foreground` | `30 12% 25%` | Brødtekstfarge (varm brun) |
| `--headline` | `30 15% 20%` | Overskrifter (dypere brun) |
| `--subhead` | `30 8% 45%` | Underoverskrifter / metadata |
| `--card` | `45 35% 98%` | Kortbakgrunner (lysere enn body) |
| `--primary` | `28 65% 70%` | Primær handling (soft peach) |
| `--primary-foreground` | `30 20% 15%` | Tekst på primary-bakgrunn |
| `--accent` | `15 55% 68%` | Accent / fokus (dusty rose) |
| `--accent-foreground` | `0 0% 100%` | Tekst på accent-bakgrunn |
| `--secondary` | `40 30% 93%` | Sekundær handling / inaktive piller |
| `--muted` | `38 25% 91%` | Bakgrunner for sekundære områder |
| `--muted-foreground` | `30 8% 50%` | Sekundær tekst, dempet metadata |
| `--destructive` | `0 55% 65%` | Slett / advarsel |
| `--border` | `38 22% 88%` | Streker rundt kort og inputs |
| `--ring` | `15 55% 68%` | Fokus-ring (samme som accent) |
| `--surface-elevated` | `45 35% 98%` | Hovede dialoger / overlays |
| `--surface-subtle` | `42 28% 95%` | Subtilt forhøyede områder |
| `--link` | `15 50% 58%` | Lenketekst |
| `--link-hover` | `15 55% 48%` | Lenker ved hover |

### Mørkt tema

Speilvendt palett som beholder samme varme tone. Defineres under `.dark`-klassen, aktiveres via theme-switcher.

| Token | HSL |
|---|---|
| `--background` | `30 12% 9%` |
| `--foreground` | `38 15% 90%` |
| `--primary` | `28 55% 65%` |
| `--accent` | `15 45% 60%` |

Komponenter trenger normalt ikke å vite om de er i lyst eller mørkt — bruk semantiske tokens (`bg-card`, `text-foreground`), så virker det i begge.

### Gradient

`--gradient-warm: linear-gradient(135deg, hsl(28, 65%, 70%) 0%, hsl(15, 55%, 68%) 100%);`

Brukes på hero-flater og spesielle promoer. Tailwind-alias: `bg-gradient-warm`.

### Skygger

| Token | Verdi | Bruk |
|---|---|---|
| `--shadow-soft` | `0 2px 12px -3px hsl(30 15% 20% / 0.06)` | Standard kort-skygge |
| `--shadow-elevated` | `0 8px 24px -6px hsl(30 15% 20% / 0.1)` | Modaler, dropdowns, popovers |

Tailwind-alias: `shadow-soft`, `shadow-elevated`.

### Subtil pattern på body

Body har en subtil prikket bakgrunn:
```css
background-image: radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.06) 1.5px, transparent 0);
background-size: 32px 32px;
```
Gir en taktil, "trykt papir"-følelse uten å forstyrre lesbarhet.

---

## 3. Typografi

To familier, brukt konsekvent:

| Klasse | Familie | Bruk |
|---|---|---|
| `font-headline` | **Lora** (serif) | Overskrifter h1–h6, artikkeltitler, modal-titler |
| `font-subhead` | **Source Sans 3** | Etiketter, metadata, knappetekst, navigasjon |
| `font-body` | **Source Sans 3** | Brødtekst, paragrafer, lister |

`h1–h6` arver automatisk Lora via base-styles. Du trenger normalt bare `font-headline`-klassen på elementer som ikke er heading-tags men skal se ut som en.

### Letter-spacing

Headlines har `letter-spacing: -0.02em` for tettere, mer profesjonelt utseende. Brødtekst bruker default.

### Linjehøyde i artikler

```css
.article-body p { line-height: 1.6 !important; }
```

For lange tekster må linjehøyden være romslig. Avsnitt og elementer har `margin-bottom: 1.4em`.

### Drop caps

Artikkel-body kan ha tre dropcap-varianter (kontrollert av ArticleBody-komponenten):
- `.article-dropcap-feature` — stor serif (4.4em→5em mobil/desktop), for lange features
- `.article-dropcap-news` — mindre sans-serif (3.2em→3.6em), for nyheter
- Ingen klasse — ingen dropcap, for korte notiser

---

## 4. Spacing og radius

### Border-radius

`--radius: 1rem` (16px) er base. Tailwind-aliaser:

| Klasse | Verdi |
|---|---|
| `rounded-sm` | calc(1rem - 8px) = 8px |
| `rounded-md` | calc(1rem - 4px) = 12px |
| `rounded-lg` | 1rem = 16px |
| `rounded-xl` | calc(1rem + 4px) = 20px |
| `rounded-2xl` | calc(1rem + 8px) = 24px |

**Konvensjoner i bruk:**
- Knapper: `rounded-full` for pille-stil (primær), `rounded-xl` for større knapper
- Kort: `rounded-2xl`
- Inputs: `rounded-xl`
- Modaler: `rounded-2xl`
- Pop-overs / badges: `rounded-lg` eller `rounded-full`

### Spacing-stiger

Bruk Tailwind sin standard-skala. Vanligste mønstre i prosjektet:
- Mellom seksjoner: `space-y-6`, `space-y-8`
- Inside kort: `p-5`, `p-6`
- Knappepadding: `px-4 py-2` (medium), `px-5 py-2.5` (større), `px-6 py-3` (CTA)
- Inputs: `px-4 py-3` (standard), `px-4 py-2.5` (kompakt)

---

## 5. Komponentmønstre

### Knapper

Tre primære varianter:

**Primær handling (CTA, oppfordring til klikk):**
```tsx
<button className="px-6 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 transition-colors shadow-soft">
  Send inn
</button>
```

**Sekundær (åpne, vis mer, navigasjon):**
```tsx
<button className="px-4 py-2 bg-secondary text-foreground rounded-full font-subhead text-sm font-medium hover:bg-secondary/80 transition-colors">
  Åpne
</button>
```

**Ghost (avbryt, lukk, tertiær):**
```tsx
<button className="text-xs font-subhead text-muted-foreground hover:text-foreground px-2 py-1">
  Hopp over
</button>
```

Ikon-knapper: kombinér med `inline-flex items-center gap-2`, `w-4 h-4` eller `w-5 h-5` på ikonet.

**Disabled-tilstand:** `disabled:opacity-50 disabled:cursor-not-allowed`

### Kort

```tsx
<div className="bg-card border border-border rounded-2xl p-6">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
      <Icon className="w-5 h-5 text-primary" />
    </div>
    <div>
      <h3 className="font-headline text-lg font-semibold text-headline">Tittel</h3>
      <p className="text-sm text-muted-foreground font-body">Beskrivelse</p>
    </div>
  </div>
  {/* innhold */}
</div>
```

Variasjoner:
- Hover-effekt på kortlister: `hover:border-accent/30 transition-colors`
- Forhøyet kort (i modal eller hero): `shadow-elevated`
- Subtil bakgrunn: `bg-surface-subtle`

### Inputs

Bruk `.input`-klassen fra `@layer components`:

```tsx
<input className="input" placeholder="Skriv her..." />
```

Som ekspanderer til:
```css
.input {
  @apply w-full px-4 py-2.5 bg-background text-foreground border border-border rounded-xl font-body
    placeholder:text-muted-foreground
    focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
    transition-all;
}
```

For textarea: legg til `resize-none rows={N}`. For søkefelt: wrap i `relative` med ikon i `absolute left-4 top-1/2 -translate-y-1/2`.

### Modaler

```tsx
{showModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in">
    <div className="bg-card rounded-2xl shadow-elevated max-w-md w-full p-6 animate-scale-in">
      <h2 className="font-headline text-xl font-bold text-headline mb-5">Tittel</h2>
      {/* innhold */}
      <div className="flex gap-3 mt-6">
        <button onClick={cancel} className="flex-1 py-3 bg-card border border-border text-foreground rounded-full font-subhead text-sm font-semibold hover:bg-secondary transition-colors">
          Avbryt
        </button>
        <button onClick={confirm} className="flex-1 py-3 bg-accent text-accent-foreground rounded-full font-subhead text-sm font-semibold hover:bg-accent/90 shadow-soft">
          Bekreft
        </button>
      </div>
    </div>
  </div>
)}
```

Backdrop er semi-transparent foreground med blur. Modal-innholdet animerer inn med `animate-scale-in`.

### Badges / piller

Små, runde labels for status, kategori, eller metadata:

```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-subhead font-semibold uppercase tracking-wider">
  <Icon className="w-3 h-3" />
  Premium
</span>
```

Bruk `<color>/10` for subtil bakgrunn med full-styrke tekst.

### Header / nav-rad

```tsx
<header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
  <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
    {/* logo, nav, profil */}
  </div>
</header>
```

### Empty state

```tsx
<div className="text-center py-12">
  <Icon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
  <p className="text-muted-foreground font-body">Ingenting her ennå</p>
</div>
```

### Loading state

```tsx
<div className="flex justify-center py-12">
  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
</div>
```

Eller full-screen loader for lazy-loaded routes:
```tsx
<div className="min-h-screen bg-background flex items-center justify-center">
  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
</div>
```

---

## 6. Animasjoner

Definert som utility-klasser:

| Klasse | Effekt | Bruk |
|---|---|---|
| `animate-fade-up` | Fade + 12px slide opp | Sider som dukker inn |
| `animate-fade-in` | Ren fade-in | Subtile overganger |
| `animate-scale-in` | Fade + scale fra 0.98 | Modaler, popovers |
| `animate-pulse-subtle` | Subtilt opacity-pulse | Loading indicators |

**Transitions:** Standard er `transition-colors` for hover-effekter. Bruk `transition-all` kun når flere properties endres samtidig.

**Aldri** transform/scale på artikkelbilder — det er en streng regel (`.article-body img { transform: none !important; }`).

---

## 7. Ikoner

Bruk **lucide-react** for alle ikoner. Aldri SVG inline med mindre det er en custom-mascot/illustrasjon.

Standardstørrelser:
- I tekst / inline: `w-3 h-3` eller `w-4 h-4`
- Knapper og piller: `w-4 h-4`
- Større handlinger: `w-5 h-5`
- Hero / empty-state: `w-12 h-12`

Farger: alltid via `text-<token>`. Aldri hardkodet.

---

## 8. Layout

### Container-bredder

| Bredde | Bruk |
|---|---|
| `max-w-3xl` (768px) | Lange artikler, lesefokuserte sider |
| `max-w-5xl` (1024px) | Standard sidebredde for forsider og oversikter |
| `max-w-7xl` (1280px) | Admin / dashboards med tabeller |

Wrappers har som regel `px-6` for sidemarg, `py-12` for vertikal seksjonsavstand.

### Responsive breakpoints

Følger Tailwind: `sm:` 640px, `md:` 768px, `lg:` 1024px, `xl:` 1280px.

Mobile-first. Skriv default for mobile, legg til større-skjerm-overrides.

### Grid og flex

- Korthister: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Horisontale flex-rader: `flex items-center gap-3`
- Stacks: `space-y-3` eller `space-y-4`

---

## 9. Tilstand og tilbakemelding

### Toaster

Bruk `sonner` for alle bekreftelser/feilmeldinger:
```tsx
import { toast } from "sonner";
toast.success("Lagret!");
toast.error("Noe gikk galt");
```

Aldri `alert()`. Aldri inline error-banners øverst på side med mindre de er kontekstuelt knyttet.

### Skjema-validering

Vis feil i kontekst, ikke som banner. Underfeltet:
```tsx
<input className="input border-destructive" />
<p className="text-sm text-destructive font-body mt-1">Feltet er påkrevd</p>
```

### Inline-tilbakemelding

For optimistic UI-oppdateringer: vis ny tilstand umiddelbart, rollback ved feil. Eksempel: når brukeren liker en artikkel, oppdater UI instant, ikke vent på API-respons.

---

## 10. Tilgjengelighet

- **Kontrast:** WCAG AA er minimum. Test mørkt og lyst tema separat.
- **Fokus:** Alle interaktive elementer må ha en synlig fokus-ring. `.input` har dette via `focus:ring-2 focus:ring-accent/30 focus:border-accent`.
- **Aria:** Bruk `aria-label` på ikon-only knapper. Bruk semantisk HTML (`button`, ikke `div onClick`).
- **Tabulator:** Test tab-rekkefølge gjennom modaler og dialoger.
- **Skjermlesere:** Headings i logisk hierarki. Aldri hopp fra h1 til h3.
- **Bevegelse:** Respekter `prefers-reduced-motion` for animasjoner (todo: ikke implementert overalt enda).

---

## 11. Implementering — file-by-file referanse

| Aspekt | Fil |
|---|---|
| Farger og CSS-vars | `src/index.css` |
| Tailwind theme | `tailwind.config.ts` |
| Shadcn-komponenter | `src/components/ui/` |
| Toaster | `src/components/ui/toaster.tsx`, `src/components/ui/sonner.tsx` |
| Tema-switcher | `src/hooks/useTheme.tsx` |
| Header | `src/components/Header.tsx` |
| Eksempelmodal | `src/views/Groups.tsx` (create modal) |
| Eksempelkort | `src/components/tall/CompanyQuery.tsx` |

---

## 12. Hva som IKKE er definert (bevisst)

- **Tabellstil for store data-tabeller** — bruk shadcn `<Table>` eller egne stiler ad-hoc per side. Vi har ikke standardisert dette enda.
- **Charts/grafer** — bruker `recharts` for finansgrafer. Stilen er per implementasjon, ikke uniform.
- **Animasjonsbibliotek for komplekse overganger** — vi har ikke valgt ennå (Framer Motion vurderes hvis vi trenger mer enn enkle keyframes).

Disse er åpne arkitektur-spørsmål. Hvis du må implementere noe nytt her, foreslå et mønster i en PR og diskuter med Magnus.

---

## 13. Når dette dokumentet må oppdateres

- Nye CSS-tokens legges til i `:root` eller `.dark`
- Ny standard komponent-mønster (f.eks. ny knappe-variant)
- Endret font, fargeskift, eller endret `--radius`
- Ny animasjon i `@layer utilities`
- Ny container-bredde eller breakpoint-konvensjon

Ikke oppdater dokumentet for ad-hoc komponenter eller per-side stilavvik. Det er kun de gjenbrukbare mønstrene som hører hjemme her.

---

*Sist oppdatert: 2026-05-21. Magnus eier dette dokumentet. Endringer som påvirker designspråk på tvers av sidene må diskuteres med ham før de implementeres.*
