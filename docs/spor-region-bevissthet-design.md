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

## Besluttet (Magnus, 2026-06-05)
1. **Region→kommune-kilde:** ny kolonne `fylkesnummer text[]` på
   `editorial_regions` (Nordvest = `{'15'}`); kommuner utledes fra fylke.
2. **Nordvest = hele Møre og Romsdal (fylke 15)**, alle 27 kommuner.
3. **Overføring:** klienten sender region-**slug**; `articles-chat` slår opp
   kommunelista server-side. Default Nordvest hvis utelatt.
4. **Tillit:** stol på klient-sendt region (kun geo-scoping, ikke tilgangs-
   kontroll — Spør leser publisert + offentlig BRREG).

## Forutsetning (BLOKKERING — multi-region-drift)
Å kjøre B krever at multi-region-grunnmuren ryddes først:
- Kanonisk region er `slug='nordvestlandet'` (name 'Nordvestlandet',
  `subdomain='nordvest'`, `is_active=true`). Multi-region-migrasjonen
  (`20260518200000`) **UPDATE-er** denne raden — den forutsetter at den finnes.
- Men `editorial_regions` har **0 rader i prod** (snapshot-rebuild fjernet den),
  så UPDATE-en traff ingenting, og en rekke tabeller har FK `region_slug →
  editorial_regions(slug)`. Å seede raden må reconcile denne driften (samme drift
  som blokkerer næringsbarometeret, jf. memory).

Dette er en bevisst **fase 2 multi-region**-opprydding (seede `editorial_regions`
+ verifisere FK/region_slug-tilstand), ikke noe som bør boltes på Spør-stabelen.

## Skisse av implementasjon (når grunnmuren er ryddet)
- Migrasjon: `ALTER editorial_regions ADD COLUMN fylkesnummer text[]`; sett
  `{'15'}` på Nordvest-raden (som da finnes).
- Deno-helper `fylke-kommuner.ts`: `fylkesnummer[] → kommuneliste` (fylke 15 =
  dagens MR-liste; flere fylker legges til når Nord/Midt/Øst lanseres).
- `articles-chat`-request får `{ region?: slug }`; funksjonen slår opp
  `fylkesnummer` fra `editorial_regions` og utleder kommunelista. Default fylke
  15 (MR) ved manglende/ukjent region.
- `mr-kommuner.ts` generaliseres til region-parametrisert; MR blir Nordvest-
  instansen.
- Klient: `articles-chat.ts` + `ConversationView` sender `current.slug` fra
  `useRegion`.

## Sekvensering
Del A (implementert, PR #115) dekker oppførselen hardkodet til Nordvest. Del B
implementeres som del av fase 2 multi-region-oppryddingen — den som også seeder
`editorial_regions` og låser opp barometeret. Designet over er ferdig besluttet og
venter kun på den grunnmuren.
