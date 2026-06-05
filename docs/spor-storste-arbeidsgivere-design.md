# Designnotat — Spør: lokal rangering av største arbeidsgivere

**Status:** til beslutning (Magnus). Ikke implementert.
**Bygger på:** #113 (rangerings-ruting). **Dato:** 2026-06-05.

## Mål
La «hvem er de største arbeidsgiverne i Møre og Romsdal/[kommune]?» rangeres fra
**egen database** i stedet for live mot Brønnøysund.

## Funn som styrer designet
- `fylke15_companies` (19 821 rader) har **bare** `orgnr, navn, refreshed_at` —
  **ingen ansatte-tall**. Ansatte ligger kun i BRREG (enhetsregisteret).
- Funksjonen som fyller `fylke15_companies` (den «ukentlige fulle synken») er
  **ikke i repoet** (repo≠prod-drift). `refresh-roles-and-status` oppdaterer kun
  *fulgte* selskaper (`company_follows`), ikke fylke15-settet. Jeg kan altså ikke
  utvide den eksisterende synken — kilden er ikke tilgjengelig for meg.
- #113 ruter allerede dette til en **fungerende** live-rangering (`brreg-proxy
  top` over MR-kommunene). Verifisert: Ekornes 938, Vard 844, Linjebygg 670 …
  Den lokale forbedringen er altså en *optimalisering* (hastighet, robusthet,
  gjenbruk), ikke en ny kapabilitet.

## Foreslått løsning (anbefalt: egen, frittstående tabell)
Ikke rør `fylke15_companies` (eid av den skjulte synken). Lag i stedet:

1. **Migrasjon** — ny tabell `mr_top_employers`:
   `orgnr text pk, navn text, kommunenummer text, antall_ansatte int, refreshed_at timestamptz`.
   RLS: les for alle (offentlig næringsdata), skriv kun service_role.
2. **Ny edge function `refresh-mr-employers`** (ukentlig cron + manuell trigger):
   henter topp etter ansatte fra enhetsregisteret over MR-kommunene og upserter
   inn i tabellen. Eid 100 % av denne funksjonen — ingen kollisjon med den
   skjulte synken.
3. **#113-svaret** ranger fra `mr_top_employers` (SQL `order by antall_ansatte
   desc limit 10`, filtrert på `kommunenummer` ved kommune-omfang).
   **Fallback:** hvis tabellen er tom/utdatert (cold start), fall tilbake til
   live `brreg-proxy top` — så det virker fra første deploy og tåler at synken
   svikter.
4. **Backfill:** kjør funksjonen én gang etter deploy.

## Designvalg som trenger din beslutning
- **A. Tabell-eierskap:** egen `mr_top_employers` (anbefalt, ren separasjon) vs.
  legge `antall_ansatte`+`kommunenummer` på `fylke15_companies` (kobler oss til
  den skjulte synken vi ikke kontrollerer).
- **B. Dekning:** topp-N-snapshot (enkelt — ett `top`-kall, f.eks. 200 største i
  MR; nok for region-rangering, men en liten kommunes topp-10 kan falle utenfor
  region-topp-200) vs. full dekning av alle ~19k MR-selskap med ansatte-tall
  (tyngre: enhetsregisteret har et paging-vindu, så det krever per-kommune-
  paging). For kommune-rangering: enten lagre nok (topp ~1000) eller la
  kommune-omfang fortsette på live.
- **C. Den skjulte synken:** har du kildekoden til fylke15-fullsynken et sted
  (annet repo/dashboard)? I så fall er det enklest å utvide *den* (alternativ
  til ny funksjon).

## Anbefaling
Egen `mr_top_employers` + topp-200-snapshot ukentlig + live-fallback. Lite,
selvstendig, dekker region-rangering godt, og kommune-omfang faller trygt
tilbake på live. Full 19k-dekning kan komme senere hvis vi vil drive andre
funksjoner (barometer-widget «største arbeidsgivere») fra samme tabell.
