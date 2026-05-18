# Multi-region design

Status: **Utkast til review**
Dato: 2026-05-18

## 1. Overordnet modell

Nær Næring utvides fra én region (Nordvest) til flere regionale utgaver. Hver region er en semi-uavhengig redaksjonell enhet som på sikt kan bli et eget utgiverselskap.

- **Domene**: Subdomener (`nordvest.naernaering.no`, `ostlandet.naernaering.no`)
- **Auth**: Felles brukerkontoer, delt cookie på `.naernaering.no`
- **Abonnement**: Per-region. Én bruker kan ha separate abonnement for ulike regioner.
- **Selskapsstruktur**: Innledningsvis ett selskap med regionale avdelinger. Designet for fremtidig oppsplitting i separate juridiske enheter.

## 2. Eksisterende grunnlag

Skjemaet har allerede mye på plass:

| Komponent | Status |
|-----------|--------|
| `editorial_regions`-tabell med 7 regioner | Finnes |
| `articles.region_slug` FK | Finnes |
| `article_shared_regions` join-tabell | Finnes |
| `articles.forked_from_article_id` FK | Finnes |
| `profiles.editorial_region` | Finnes |
| `job_listings.region_slug` + `additional_regions[]` | Finnes |
| `events.region_slug` | Finnes |
| `hjernevelv_*` tabeller med `region_slug` | Finnes |
| `newsletter_issues.region_slug` | Finnes |
| `newsletter_subscriptions.region_slugs[]` | Finnes |
| `article_audio.region_slug` | Finnes |
| `employer_profiles.region_slug` | Finnes |

## 3. Hva mangler

### 3.1 Tabeller som trenger `region_slug`

| Tabell | Begrunnelse |
|--------|-------------|
| `subscriptions` | Per-region abonnement |
| `business_accounts` | Bedriftskonto er region-tilknyttet |
| `groups` | Diskusjonsgrupper er regionale |
| `polls` | Avstemninger er per region |
| `native_ads` | Annonser er region-spesifikke |
| `job_changes` | Jobbytter er regionale nyheter |
| `tips` | Tips rettes til regional redaksjon |

`profiles` har allerede `editorial_region` (for redaksjonelt ansatt) og `region` (brukerens hjemregion). Disse er tilstrekkelige.

### 3.2 `editorial_regions`-utvidelser

Tabellen trenger ekstra kolonner for subdomene-routing og fremtidig selskapsstruktur:

```sql
ALTER TABLE editorial_regions ADD COLUMN
  subdomain text UNIQUE,           -- 'nordvest', 'ostlandet' etc.
  publisher_name text,             -- Utgiverselskap-navn
  publisher_orgnr text,            -- Org.nr til utgiver
  contact_email text,              -- Redaksjonens e-post
  logo_url text,                   -- Region-logo
  primary_color text,              -- Brand-farge for theming
  is_active boolean DEFAULT false; -- Kun aktive regioner vises
```

Seed-oppdatering (erstatter eksisterende regioner):
```sql
DELETE FROM editorial_regions;
INSERT INTO editorial_regions (slug, name, subdomain, is_active, sort_order) VALUES
  ('nasjonal',       'Nasjonal',       NULL,            true,  0),
  ('nordvestlandet', 'Nordvestlandet', 'nordvest',      true,  1),
  ('vestlandet',     'Vestlandet',     'vestlandet',    false, 2),
  ('nord-norge',     'Nord-Norge',     'nord-norge',    false, 3),
  ('midt-norge',     'Midt-Norge',     'midt-norge',    false, 4),
  ('ostlandet',      'Østlandet',      'ostlandet',     false, 5),
  ('sorlandet',      'Sørlandet',      'sorlandet',     false, 6);

-- Oppdater eksisterende rader som peker til gammel slug
UPDATE articles SET region_slug = 'nordvestlandet' WHERE region_slug = 'more-og-romsdal';
UPDATE job_listings SET region_slug = 'nordvestlandet' WHERE region_slug = 'more-og-romsdal';
UPDATE events SET region_slug = 'nordvestlandet' WHERE region_slug = 'more-og-romsdal';
-- (samme mønster for alle tabeller med region_slug)
```

### 3.5 Skjuling av nasjonale artikler per region

```sql
CREATE TABLE region_hidden_articles (
  region_slug text NOT NULL REFERENCES editorial_regions(slug) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  hidden_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (region_slug, article_id)
);

ALTER TABLE region_hidden_articles ENABLE ROW LEVEL SECURITY;
```

Nasjonale artikler vises i alle regioner **med mindre** de er skjult:
```sql
-- Artikkel synlig i region hvis:
-- 1. region_slug matcher, ELLER
-- 2. region_slug = 'nasjonal' og IKKE skjult i denne regionen, ELLER
-- 3. delt via article_shared_regions
```

### 3.3 Subscriptions med region

```sql
ALTER TABLE subscriptions
  ADD COLUMN region_slug text REFERENCES editorial_regions(slug);

-- Eksisterende abonnement tilhører Nordvest
UPDATE subscriptions SET region_slug = 'more-og-romsdal';

ALTER TABLE subscriptions
  ALTER COLUMN region_slug SET NOT NULL;
```

Samme mønster for `business_accounts`.

### 3.4 RLS-oppdateringer

Dagens RLS-policyer filtrerer ikke på region. Når multi-region er aktivt:

- **Artikler**: Publiserte artikler synlige i egen region + `article_shared_regions`
- **Stillinger**: Synlige i `region_slug` + `additional_regions[]` (allerede støttet)
- **Abonnement**: Bruker ser kun egne abonnement (allerede bruker-scopet, region er bonus-filter)
- **Redaktør-tilgang**: Editor/journalist ser kun innhold i sin `profiles.editorial_region`

Eksempel — artikkel-lesing:
```sql
CREATE POLICY "Public can read published articles in their region"
  ON articles FOR SELECT USING (
    published = true
    AND (
      -- Egen region
      region_slug = current_setting('app.current_region', true)
      -- Nasjonalt innhold (med mindre skjult)
      OR (
        region_slug = 'nasjonal'
        AND NOT EXISTS (
          SELECT 1 FROM region_hidden_articles rha
          WHERE rha.article_id = id
          AND rha.region_slug = current_setting('app.current_region', true)
        )
      )
      -- Eksplisitt delt til denne regionen
      OR EXISTS (
        SELECT 1 FROM article_shared_regions asr
        WHERE asr.article_id = id
        AND asr.region_slug = current_setting('app.current_region', true)
      )
    )
  );
```

> **Merk**: `current_setting('app.current_region')` settes per request via Supabase client headers. Alternativt kan vi filtrere i frontend og la RLS kun sjekke auth.

## 4. Artikkel-deling: Share vs. Fork

### Share (read-only i andre regioner)
- Redaktør klikker "Del til region" i artikkel-editor
- Rad opprettes i `article_shared_regions`
- Artikkelen vises i mottaker-regionens feed, merket med opprinnelsesregion
- Ingen kopi — endringer i originalen reflekteres umiddelbart
- Mottaker-redaksjon kan ikke redigere

### Fork (redigerbar kopi)
- Redaktør klikker "Opprett regional versjon"
- Ny rad i `articles` med `forked_from_article_id` pekt til originalen
- Kopien får mottaker-regionens `region_slug`
- Fri redigering: egen tittel, vinkling, tillegg
- Viser "Opprinnelig publisert av [region]"-badge
- Endringer i originalen synkroniseres **ikke** automatisk

### Synlighet av fork-status
```
articles.forked_from_article_id IS NOT NULL  →  dette er en fork
articles.id IN (SELECT forked_from_article_id FROM articles WHERE ...)  →  dette er en original som har blitt forket
```

## 5. Frontend: Region-kontekst

### Subdomene-routing
Middleware (eller React-provider i SPA-fasen, Next.js middleware i Fase 3) leser subdomenet:

```typescript
function getRegionFromHost(hostname: string): string {
  const sub = hostname.split('.')[0]; // 'nordvest' fra 'nordvest.naernaering.no'
  return sub;
}
```

### React Provider
```typescript
const RegionContext = createContext<{ slug: string; name: string } | null>(null);

function RegionProvider({ children }) {
  const region = useRegionFromHost();
  // Sett Supabase header for RLS
  // Filtrer alle queries med region
  return <RegionContext.Provider value={region}>{children}</RegionContext.Provider>;
}
```

### Header
- Viser regionens navn og logo
- "Bytt region"-meny (kun synlig når flere regioner er aktive)
- Tydelig visuell markør for hvilken region man er i

## 6. Migrasjonsplan

### Steg 1: Skjema-utvidelser
- Utvid `editorial_regions` med nye kolonner
- Legg til `region_slug` på tabeller som mangler det
- Default alle eksisterende rader til `'more-og-romsdal'`
- Oppdater TypeScript-typer

### Steg 2: RLS-oppdateringer
- Oppdater artikkel-policyer til å inkludere region-filter
- Oppdater redaktør-policyer til å respektere `editorial_region`
- Behold åpen lesing inntil multi-region faktisk lanseres (feature flag)

### Steg 3: Frontend regionalt skall
- `RegionProvider` med subdomene-deteksjon
- Header med regionbytte
- Alle feed-queries filtrerer på region

### Steg 4: Aktivering
- Sett `is_active = true` på regioner etter hvert som redaksjoner er klare
- DNS wildcard: `*.naernaering.no` → samme Vercel/hosting
- Første utvidelse: én ekstra region som pilot

## 7. Beslutninger (avklart 2026-05-18)

1. **Nasjonalt innhold**: Artikler med `region_slug = 'nasjonal'` vises automatisk i alle aktive regioner. Regionale redaktører kan skjule enkeltartikler fra sin feed. Implementeres via `region_hidden_articles(region_slug, article_id)`-tabell.

2. **Redaktør-roller**: Holder med eksisterende `editor`-rolle + `profiles.editorial_region`. Ingen region-spesifikke roller. RLS sjekker `editorial_region` for skrivetilgang.

3. **Abonnement-bunting**: Nasjonalt abonnement eksisterer kun som manuell admin-handling (sett `region_slug = 'nasjonal'` på abonnementet). Ingen egen pris eller checkout-UI. Regionalt abonnement gir tilgang til den regionen + nasjonalt innhold.

4. **Regioner** (erstatter eksisterende seed):
   - `nasjonal` — Nasjonal
   - `nordvestlandet` — Nordvestlandet
   - `vestlandet` — Vestlandet
   - `nord-norge` — Nord-Norge
   - `midt-norge` — Midt-Norge
   - `ostlandet` — Østlandet
   - `sorlandet` — Sørlandet
