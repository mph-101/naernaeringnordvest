# Designnotat — Spør: populasjons-/superlativspørsmål

**Status:** til godkjenning (Magnus). Ikke implementert.
**Bygger på:** #112 (sammenslått planner + MR-kommunedekning).
**Dato:** 2026-06-05.

## Problem

Spør grunner svar i artikkelarkivet (+ regnskap for navngitte selskap). For et
**populasjons-/superlativspørsmål** — «hvilke bedrifter har størst omsetning i
regionen?» — er arkivet et *skjevt utvalg* (det redaksjonen har skrevet om).
Men svaret presenteres definitivt, som om det var en fullstendig rangering.
Forbehold havner som en fotnote til slutt. For en næringsavis er et selvsikkert
*ufullstendig* svar en troverdighetsrisiko (Vær Varsom).

Konkret eksempel (prod v4): «Hvilke bedrifter har størst omsetning i regionen?»
→ definitiv liste (Glamox, Veøy, AXTech, Conta) utledet fra artikler, og en
BRREG-boks med «0 treff» fordi enhetsregisteret verken har omsetning eller lar
seg spørre på «regionen».

## Besluttet posityr

**Ærlig ramme + rut til ekte data** (valgt av Magnus 2026-06-05):
der registrene kan gi en ekte rangering, bruk den; der de ikke kan, svar fra
arkivet men *led* med grunnlaget og at det ikke er uttømmende — og tilby den
besvarbare varianten.

## Hva som faktisk er oppnåelig

- **Størst etter antall ansatte, region-vidt:** JA. `brreg-proxy action=top`
  støtter `kommune` (komma-separert), `sort=antallAnsatte`, `order=desc`,
  `size`. Kall med alle 27 MR-kommunenumre (fra `mr-kommuner.ts`) gir en
  autoritativ populasjonsrangering.
- **Størst etter omsetning, region-vidt:** NEI, ikke direkte. Enhetsregisteret
  har ingen omsetning; Regnskapsregisteret er per org.nr. Kan tilnærmes (topp-N
  etter ansatte → `batch_financials` → sorter på omsetning), men det bommer på
  høy-omsetning/få-ansatte-selskap. **Foreslås utsatt** — se åpne spørsmål.
- **Nyetableringer / konkurser, region-vidt:** JA, allerede dekket av Tall-stien.

## Mekanisme

### 1. Deteksjon (i planneren fra #112)
Nytt felt i `PlannerResult`:
```ts
ranking: {
  metric: "ansatte" | "omsetning" | "annet";
  omfang: "region" | "kommune" | "nasjonalt" | "bransje";
} | null
```
`ranking != null` = populasjons-/superlativspørsmål («størst/flest/mest/topp/
hvilke … i regionen/bransjen»). `null` = vanlig (navngitt selskap, generelt) —
**uendret oppførsel**, ingen ny hedging.

### 2. Ruting
- `ranking.metric ∈ {ansatte, annet}` og `omfang ∈ {region, kommune}`
  → `brreg-proxy top` (MR-kommuner ved region, ev. enkelt-kommune), sortert på
  ansatte. Autoritativt. Svaret merkes eksplisitt «etter antall ansatte».
- `ranking.metric = omsetning`, `omfang = region`
  → ikke oppnåelig. Svar fra arkivet MED ærlig ramme + tilbud om ansatte-
  rangeringen. (Tilnærming via regnskap: utsatt.)
- `ranking = null` → som #111/#112 i dag.

### 3. Svar-ramme (prompt)
Når `ranking != null`, injiseres en kontekst-blokk som instruerer modellen til å:
- lede med grunnlaget («Etter antall ansatte i Brønnøysund …» eller «Blant
  selskapene Nær Næring har omtalt …»),
- aldri antyde fullstendighet for arkiv-baserte rangeringer,
- tilby den besvarbare varianten når den primære ikke er oppnåelig.
Hedginga trigger **kun** når `ranking != null` — vanlige svar forblir konsise.

### 4. Testplan (vitest, rene helpere — CI kjører ikke Deno-tester)
- `parsePlannerResponse`: parser `ranking`-feltet riktig (incl. fravær → null).
- Ny ren rutings-helper `decideRankingRoute(ranking)` → `"top" | "articles" | "none"`.
- `mr-kommuner`: en `mrKommuneCsv()`/liste for region-vid `top`-kall.

## Avgrensning (ikke i denne omgang)
- Omsetnings-tilnærming region-vidt (topp-ansatte → regnskap → re-sorter).
- Bransje-rangeringer utover det enhetsregisteret/næringskode gir.
- Generell trigger-tuning utover rangeringssaken (egne, datadrevne iterasjoner
  etter lansering).

## Avklart med Magnus (2026-06-05)
1. **Antall i lista:** topp **10**.
2. **Omsetnings-tilnærming:** **utsett.** «Etter omsetning region-vidt» rutes til
   ærlig arkiv-ramme + tilbud om ansatte-rangeringen. Ingen topp-ansatte→regnskap-
   tilnærming nå.
3. **Tone/ordlyd:** Magnus eier den redaksjonelle formuleringen — justeres i review.
4. **Bransje:** **utsett.** Første PR dekker `omfang ∈ {region, kommune}` (+ ruter
   `nasjonalt`/`bransje`/`omsetning` til den ærlige arkiv-ramma). Bransje→næringskode
   tas som egen iterasjon.

Implementeres deretter. `brreg-proxy top` returnerer `{ companies, totalElements }`
og enhetsregisteret godtar komma-separert `kommunenummer` — region-vid topp-etter-
ansatte er bekreftet oppnåelig.

## Sekvensering
Bygger på #112 (planner). Implementeres som egen PR etter at #112 er merget.
