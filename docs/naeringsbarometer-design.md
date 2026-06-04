# Næringsbarometer — design

Status: **Utkast til review**
Dato: 2026-06-04
Kilde: `barometer_overlevering.md` (overlevering fra forarbeid) + `naeringspuls.py` /
`naeringsbarometer_dashboard.html` (medbrakte, ferdige artefakter).

Et datadrevet næringsbarometer for Møre og Romsdal bygget på åpne SSB-kilder. Tre
moduler (næringspuls på fylke, kommuneprofil, bransjebarometer) pluss en
avviksdetektor som mater den eksisterende godkjenningsstyrte arbeidsflyten. Egen
destinasjonsside `/barometer` — modulene «lekker ut» i journalistikken via
avvikstips → forsidesak med modulutsnitt → lenke tilbake.

---

## 1. Beslutninger tatt med Magnus (2026-06-04)

Disse er avklart før designet ble skrevet og styrer resten av dokumentet:

1. **Muren håndheves i RLS, server-side** — ikke kun via edge function slik
   artikkel-paywallen gjør (`docs/paywall.md:5`). Dette er et bevisst avvik fra
   den eksisterende paywall-arkitekturen; se §6 for hvordan det løses og hvilken
   tier (`metered`) som likevel trenger mer enn ren RLS.
2. **Region-bevisst fra dag én** — `region_slug` på alle barometer-tabeller fra
   start, default `nordvestlandet`, uten å vente på at hele fase 2-frontend-skallet
   bygges. Bygger på `editorial_regions` som allerede finnes.
3. **Designdokument først** — dette dokumentet skal godkjennes før migrasjoner
   skrives (CLAUDE.md: «Forelegg dokumentet til Magnus før migrasjoner skrives»).

---

## 2. Eksisterende grunnlag vi bygger på (ikke bygg om)

Kartlagt i kodebasen — barometeret skal gjenbruke disse mønstrene, ikke finne opp nye:

| Behov | Finnes allerede | Fil |
|---|---|---|
| SSB-henting + cache | `ssb-labor` EF, 6t in-memory-cache, SSB-API-fetch-mønster | `supabase/functions/ssb-labor/index.ts` |
| Godkjenningsstyrt arbeidsflyt | `job_changes`-tabell + AI-draft + status-livssyklus + review-kø | `src/components/admin/JobChangeReview.tsx`, `supabase/functions/generate-job-notice/` |
| Ekstern detektor → insert | `scripts/jobbytte_diff.py` (analog til `naeringspuls.py`) | `scripts/jobbytte_diff.py` |
| Per-indikator cron | `pg_cron` + `pg_net` + `net.http_post` mot EF, GUC-er satt | `supabase/migrations/20260521120000_schedule_financials_refresh.sql` |
| Feature flags | `FEATURES`-objekt, env-styrt | `src/lib/features.ts` |
| Abonnement / server-side gating | `has_active_subscription()` SECURITY DEFINER + `subscriptions` | `docs/paywall.md`, `supabase/functions/check-article-access/` |
| Region-tabell | `editorial_regions` (7 regioner, slug-basert) | `docs/multi-region-design.md` §2 |
| Teaser/paywall-UI | `PaywallCard`-mønster | `src/app/sak/[id]/client.tsx` |

To avklaringer dette gir oss gratis:
- **Cron-spørsmålet i overleveringen er løst:** følg `cron.schedule`-mønsteret,
  én jobb per indikator (ikke én felles). GUC-ene `app.settings.supabase_url` og
  `app.settings.service_role_key` er allerede satt — ingen nye secrets trengs.
- **SSB er åpent API** — ingen nøkler, ingen `magnus-todo`-secret-oppføring.

`/tall` er **opptatt** av den parkerte idretts-modulen (`/idrett` redirecter dit).
Overleveringen har rett i å unngå den. Vi bruker `/barometer`.

---

## 3. Moduler og åpent-vs-mur

Tilgangsnivå ligger i **konfigurasjon** (admin-redigerbar tabell), ikke hardkodet —
muren er «en spak å dra» (overlevering §83). Seed-verdiene under speiler
åpent-vs-mur-tabellen i overleveringen:

| `module_key` | Visning | `tilgangsniva` |
|---|---|---|
| `naeringspuls_kpi` | Fire KPI-råtall (fylke) | `åpen` |
| `naeringspuls_avvik` | Avvikstolkning | `lukket` |
| `konkursgraf_12mnd` | Konkurser inneværende 12 mnd | `åpen` |
| `konkursgraf_normal` | Konkurser mot historisk normal | `lukket` |
| `kommune_grunntall` | Kommuneprofil, én kommune | `åpen` |
| `kommune_benchmark` | Kommune-mot-kommune | `lukket` |
| `bransje_snapshot` | Bransjebarometer, øyeblikksbilde | `åpen` |
| `bransje_drilldown` | Bransje, historikk/drill-down | `lukket` |
| `barometer_forsidesak` | Barometer-utløst forsidesak | `metered` |
| `kvartalsrapport` | Kvartalsvis synteserapport | `lukket` |
| `toppleder` | Toppleder-barometeret | `lukket` |

Muren ligger på **visningsnivå, ikke sidenivå** (overlevering §78). Låst modul
rendres som teaser m/overlay (konverterer), aldri blank vegg.

---

## 4. Datamodell

Tre nye tabeller. Alle får `region_slug` FK → `editorial_regions(slug)`,
default `'nordvestlandet'`.

### 4.1 `barometer_modules` — konfigurasjon («spaken»)

Admin-redigerbar. Definerer hvilke moduler som finnes og deres tilgangsnivå.

| Kolonne | Type | Merknad |
|---|---|---|
| `id` | uuid PK | |
| `module_key` | text | Stabil nøkkel, f.eks. `naeringspuls_avvik` |
| `region_slug` | text FK | |
| `title` | text | Visningsnavn |
| `tilgangsniva` | `barometer_tilgang` enum | `åpen` \| `metered` \| `lukket` |
| `sort_order` | int | |
| `is_active` | boolean | Skjult uten å slettes |
| `updated_by` / `updated_at` | uuid / timestamptz | Audit (jf. redaktørplakat, fase 4.3) |

`UNIQUE (region_slug, module_key)`.

### 4.2 `barometer_datapoints` — de beregnede tallene

Skrives av refresh-EF (§7). Arver tilgangsnivå fra sin modul via RLS (§6).

| Kolonne | Type | Merknad |
|---|---|---|
| `id` | uuid PK | |
| `module_key` | text | Hvilken modul tallet hører til |
| `region_slug` | text FK | |
| `indicator` | text | `konkurser` \| `etableringer` \| `omsetning` … |
| `nace_code` | text null | Bokstav- ELLER intervallkode (se §7-fallgruve) |
| `period` | text | `2024`, `2025T6`, `2025-04` — indikator-avhengig |
| `label` | text | Menneskelesbar etikett |
| `value` | numeric | |
| `unit` | text | `antall`, `prosent`, `nok` |
| `meta` | jsonb | Avvik %, baseline, sesongnormal o.l. |
| `source_table` | text | SSB-tabell-ID (`08551` …) — transparens/kildeangivelse |
| `computed_at` | timestamptz | |

`UNIQUE (region_slug, module_key, indicator, nace_code, period)` for idempotent upsert.

### 4.3 `barometer_signals` — avvik → godkjenningskø

Speiler `job_changes` 1:1 (provenance + AI-draft + status-livssyklus).

| Kolonne | Type | Merknad |
|---|---|---|
| `id` | uuid PK | |
| `region_slug` | text FK | |
| `indicator` | text | |
| `nace_code` | text null | |
| `period` | text | |
| `direction` | text | `opp` \| `ned` |
| `deviation_pct` | numeric | Avvik mot baseline |
| `observed_value` / `baseline_value` | numeric | |
| `source_table` | text | Kilde — for kildeangivelse i saken |
| `source_payload` | jsonb | Rå tall detektoren så (revisjonsspor) |
| `generated_draft` | jsonb | AI-foreslått vinkling (`{title, ingress, key_points, body}`) |
| `status` | text | `pending` \| `published` \| `rejected` (som `job_changes`) |
| `reviewed_by` / `reviewed_at` | uuid / timestamptz | |
| `created_at` | timestamptz | |

`UNIQUE (region_slug, indicator, nace_code, period)` så samme avvik ikke dobbelt-tipses.

---

## 5. Region-bevissthet og SSB-kobling

`editorial_regions.slug = 'nordvestlandet'` ↔ SSB region `15` (Møre og Romsdal).
Kommuner: Molde `1506`, Ålesund `1508`, Kristiansund `1505`.

Vi trenger en stabil kobling slug → SSB-regionkode. **Forslag:** ny kolonne
`editorial_regions.ssb_region_code text`. Dette rører en multi-region-tabell, så
det krever ditt ok (CLAUDE.md: «ny kolonne på eksisterende skjema»). Alternativ:
holde mappingen i `barometer_modules.meta` for å unngå å røre `editorial_regions`.
**Åpent punkt — se §11.**

---

## 6. Muren: RLS-håndhevelse (valgt mekanisme)

Avvik fra `paywall.md`: her er tilgang en **autorisasjonsgrense i RLS**, ikke kun
EF-gating. Frontend-gating er ren UX (overlevering §93).

To SECURITY DEFINER-hjelpere (følger `has_role`-mønsteret i kodebasen):
- `has_editorial_role(uid)` — `admin`/`editor`/`journalist`.
- `has_barometer_access(uid, region_slug)` — aktivt abonnement for **den regionen**
  (region-bevisst, jf. per-region-abonnement i multi-region §240) ELLER redaksjonell rolle.

RLS-policy på `barometer_datapoints` (SELECT):

```sql
USING (
  EXISTS (
    SELECT 1 FROM barometer_modules m
    WHERE m.region_slug = barometer_datapoints.region_slug
      AND m.module_key  = barometer_datapoints.module_key
      AND m.is_active
      AND (
        m.tilgangsniva = 'åpen'
        OR public.has_editorial_role(auth.uid())
        OR (m.tilgangsniva = 'lukket'
            AND public.has_barometer_access(auth.uid(), m.region_slug))
        -- 'metered' håndteres IKKE her — se under
      )
  )
)
```

`barometer_modules` selv er **offentlig lesbar** (frontend må vite at en modul
finnes for å rendre teaseren) — men *tallene* er gated. `barometer_signals` er
kun lesbar for redaksjonelle roller.

### Den ærlige metered-grensen

RLS er stateless per rad og kan ikke telle «2–3 gratis per måned». For `metered`
holder RLS rådataene **lukket** for ikke-abonnenter (ingen lekkasje), og tilgang
går gjennom en kontrollert RPC:

- `barometer_meter (user_id, region_slug, period_month, count)` — forbruksteller.
- `consume_barometer_meter(module_key, region_slug)` SECURITY DEFINER — returnerer
  datapunktet hvis under fri-grensen og inkrementerer, ellers nekter. Dette er
  fortsatt server-side autorisasjon, konsistent med kravet i overlevering §89–93.

Dette speiler `article_views`-ideen i `paywall.md:222`. Fri-grense (antall, per
måned vs. per økt, innlogget vs. anonym cookie) er **åpent punkt — §11**.

> Sikkerhetskobling (overlevering §87): muren henger sammen med to audit-funn —
> RLS-miskonfig og at `Admin.tsx` ga UI-tilgang til alle autentiserte. Derfor
> server-side håndhevelse, og derfor Vitest-tester på både RLS-policyene og
> `consume_barometer_meter` før drift.

---

## 7. SSB-henting + avviksdetektor

To edge functions, begge kalt av `pg_cron` (§2-mønster):

**`barometer-refresh`** — porter `hent_*`-funksjonene fra `naeringspuls.py`.
Henter SSB-tall (direkte API som `ssb-labor`, evt. SSB-MCP der det kjører
interaktivt) og upserter til `barometer_datapoints`.

**`detect-barometer-signals`** — porter `vurder_*`-logikken (kildeuavhengig per
overlevering §17). Leser `barometer_datapoints`, regner avvik, inserter `pending`
rader i `barometer_signals`. AI-vinkling genereres av en `generate-barometer-brief`
EF (analog til `generate-job-notice`).

### Avviksmetode (fra `naeringspuls.py`, ufravikelig)
- **Konkurser** (mnd): faktisk 12-mnd-sum mot sesongnormal = median per
  kalendermåned, eks. 2020–21. Terskel 20 %.
- **Etableringer** (år): siste reelle år mot glidende 5-årssnitt. Terskel 12 %.
- **Omsetning** (år, 12937): siste år mot året før per bransje. Terskel 6 %.

Tersklene **MÅ kalibreres mot 3–4 års historikk** før drift (~1 tips/kvartal/indikator).
Åpent punkt — §11.

### Kode-fallgruver (erfart, ikke gjett — overlevering §39)
- `08551`/`12937`: NACE-**bokstavkoder** (G, I, F, C, H, M).
- `14623`/`10309`: **intervallkoder** (45-47, 55-56).
- `14623` gir 0 for siste år før publisering → `_rens()` fjerner 0/None.
- `14830` (SN2025) og `07314` (SN2007): ULIKE tall, ulik standard — **bland aldri**.
- `07459`: `Kjonn` er mandatory; for totalbefolkning, **eliminér** alder/kjønn.
- Omsetningsvekst: alltid år-over-år / samme termin året før — **aldri** mot
  forrige termin (T6 = julehandel → falskt utslag).

### Cron-kadens (én jobb per indikator)
| Indikator | SSB-oppdatering | Cron |
|---|---|---|
| Konkurser (08551) | månedlig | `0 4 5 * *` |
| Omsetning/varehandel (12937/14830) | år / termin | månedlig sjekk, upsert nye |
| Etableringer (14623) | årlig | månedlig sjekk (billig, fanger publisering) |

---

## 8. Frontend

- Ny rute `/næringspuls` (besluttet 2026-06-04; lazy) bak `FEATURE_BAROMETER` i
  `src/lib/features.ts` + `App.tsx` (og App Router-tvilling når fase 3-skallet
  brukes). `/barometer` reserveres evt. som redirect.
- `naeringsbarometer_dashboard.html` brukes som **komponent-mal** (Georgia-serif,
  kobber/cream) — tall hentes live fra `barometer_datapoints`, aldri hardkodet.
- Region-bevisst: leser region fra `RegionProvider`/host (multi-region §5), faller
  tilbake til `nordvestlandet`.
- Låste moduler: teaser + `PaywallCard`-overlay (gjenbruk fra artikkel-paywall).
- **Lekker ut i journalistikken:** godkjent `barometer_signal` → artikkelutkast
  med innebygd modulutsnitt → lenke tilbake til `/barometer`.

Avviks-review: `BarometerSignalReview.tsx` som speiler `JobChangeReview.tsx`
(filter på status, inline redigering, regenerer AI-draft, Publiser/Avvis/Slett),
lagt inn som ny fane i admin.

---

## 9. Hvor i fase-planen

Foreslås som **ny avgrenset oppgave: «Næringsbarometer»**. Fase 2-skjemaet er
allerede kjørt (`20260518200000_multi_region_schema.sql`): `editorial_regions`
er omdøpt til `nordvestlandet`, og **`subscriptions.region_slug` finnes allerede**
(default `nordvestlandet`). Region-bevisst tilgang er dermed rett fram — ingen ny
mapping trengs for abonnement-joinen. Det som gjenstår av fase 2 er frontend-skallet
(RegionProvider o.l.), som barometeret **ikke** er blokkert av.

---

## 10. PR-nedbrytning (gullsonen 200–500 linjer hver)

| PR | Innhold | Tester |
|---|---|---|
| 1 | Migrasjon: 3 tabeller + `barometer_tilgang` enum + RLS + hjelpefunksjoner + seed (moduler m/tilgangsnivå + Nordvest). Types-regen. | RLS-policy-tester |
| 2 | `barometer-refresh` + `detect-barometer-signals` EF-er + `pg_cron`-jobber | Vitest på `vurder_*` mot kjente tall |
| 3 | `/barometer`-side bak flag, åpne moduler (puls-KPI + konkursgraf 12mnd), region-bevisst | — |
| 4 | Muren: teaser-overlay, `consume_barometer_meter` RPC + teller, paywall-tester | RLS + RPC server-side |
| 5 | Kommuneprofil + bransjebarometer (åpne + lukkede visninger) | — |
| 6 | `BarometerSignalReview` + admin-fane + godkjenn→artikkelutkast-loop | — |
| 7 (senere) | Kvartalsrapport, toppleder-barometer, drill-down | — |

---

## 11. Åpne punkter (krever din beslutning)

1. **ssb_region_code:** ny kolonne på `editorial_regions`, eller mapping i
   `barometer_modules.meta`? (§5) — rører multi-region-tabell hvis kolonne.
2. **Terskelkalibrering:** kjør detektorene 3–4 år bakover og tell treff før
   drift. Endelige terskler settes etter det. (§7)
3. **Bransjeutvalg:** hvilke NACE-bransjer vises i bransjebarometeret? (overlevering §104)
4. **Kommune-detaljhandel:** forfine tetthetstall fra 45–47 til ren NACE 47 på
   kommunenivå? Krever mer detaljert tabell enn `10309`. (overlevering §106)
5. **Omsetning i puls-KPI:** per bransje eller bare totalt? (overlevering §105)
6. **Metered fri-grense:** antall (2–3?), per måned vs. økt, innlogget vs. anonym? (§6)
7. ~~**Redaksjonelt rute-navn**~~ — AVKLART 2026-06-04: `/næringspuls`
   (ASCII-varianten `/naeringspuls` står åpen hvis ren delbar lenke prioriteres).

---

*Ingen kode skrives før dette er godkjent. Ingen nye secrets eller eksterne
avhengigheter kreves (SSB er åpent API; cron-GUC-er allerede satt).*
