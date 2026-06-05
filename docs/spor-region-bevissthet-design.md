# Designnotat — Spør: ekte region-bevissthet (del B)

**Status:** til beslutning (Magnus). Ikke implementert. Knyttet til fase 2 (kjede-arkitektur).
**Dato:** 2026-06-05.

## Bakgrunn
Del A (implementert, egen PR) gjør at relative stedsord — «lokale», «regionale»,
«i regionen», «på Nordvestlandet» — tolkes som hele Møre og Romsdal (27 kommuner)
i Spørs planner og svar. Det er **hardkodet Nordvest**.

Del B er plumbingen som gjør Spør *region-drevet*: at funksjonen tar inn den
**brukervalgte** regionen og scoper geo + svar til den — slik at Nær Næring Nord/
Midt/Øst får samme oppførsel uten ny kode per region.

## Funn som styrer designet
- `Region` i `useRegion` er bare `{ slug, name }` — **ingen kobling til kommuner
  eller fylke**. Det finnes ingen region→kommune-mapping i datamodellen.
- `editorial_regions` har **0 rader i prod** (multi-region-drift — samme grunnmur
  som blokkerer næringsbarometeret). Nordvest-raden er ikke seedet.
- `regions.ts` har statisk fylke→kommune for hele landet (kan gjenbrukes som
  mapping-kilde), og `mr-kommuner.ts` er Nordvest-instansen av samme.
- Spør kalles fra `src/lib/articles-chat.ts` (klient-wrapper). Den sender ikke
  region i dag; `ConversationView` har tilgang til `useRegion`.

## Forutsetning (blokkering)
B forutsetter at multi-region-grunnmuren er på plass:
1. `editorial_regions` seedes (minst Nordvest-raden).
2. En **region→kommune/fylke-kobling** besluttes og fylles.
Dette er fase 2.1-beslutninger (forretningsmodell), ikke rene tekniske valg.

## Designvalg (åpne spørsmål til Magnus)
1. **Region→kommune-kilde:**
   - (a) Ny kolonne på `editorial_regions`, f.eks. `fylkesnummer text[]` (Nordvest
     = `{'15'}`) — kommuner utledes via `regions.ts`/SSB. Enkelt, fylkesgranulært.
   - (b) Statisk config i kode, `slug → fylke(r)`, gjenbruker `regions.ts FYLKER`.
     Ingen DB-endring, men region-definisjon i kode.
   - (c) Egen `region_kommuner`-koblingstabell (mest fleksibelt; tillater regioner
     som ikke følger fylkesgrenser, f.eks. en delmengde av et fylke).
2. **Hva er Nordvest presist?** Hele fylke 15 (Møre og Romsdal)? (Dagens MR-liste
   = ja.) Hvilke fylker utgjør Nord/Midt/Øst når de kommer?
3. **Hvordan når regionen edge-funksjonen?** Klienten sender `region`-slug (eller
   den oppløste kommunelista) i `articles-chat`-requesten. `articles-chat.ts` +
   `ConversationView` leser `useRegion`. Default Nordvest hvis utelatt.
4. **Tillit:** Spør leser kun publiserte artikler + offentlig BRREG, så
   klient-sendt region er lav risiko (kun geo-scoping, ikke tilgangskontroll).
   Bekreft at det er greit å stole på klient-verdien.

## Skisse av implementasjon (når valgene er tatt)
- `articles-chat`-request får `{ region?: { slug, kommunenummer: string[] } }`
  (eller bare slug + oppslag server-side).
- `mr-kommuner.ts` generaliseres til region-parametrisert: `regionKommuner(region)`,
  `resolveKommuneFromText(text, region)`, `applyRegionScope(..., region)`. Nordvest
  blir én instans; MR-konstantene beholdes som default.
- Planner-prompten får regionnavnet injisert («… for [Region] ([fylke])») i stedet
  for hardkodet «Møre og Romsdal».
- `mr_companies`/rangering generaliseres til regionens kommuneliste (eller en
  `region`-kolonne på tabellen ved flere regioner).

## Sekvensering
Avhenger av at fase 2-grunnmuren (seede `editorial_regions` + region→kommune-modell)
besluttes og ryddes (multi-region-drift). Inntil da leverer **del A** den
brukernære oppførselen hardkodet til Nordvest. B implementeres når valg 1–4 er tatt.
