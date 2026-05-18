## Mål

Gjøre det enkelt for nyhetsbrev-mottakere å endre preferanser eller avslutte abonnementet via en lenke i e-post — uten å måtte være innlogget.

## Bakgrunn

Tabellen `newsletter_subscriptions` har allerede `unsubscribe_token` (random hex, unik per rad) og `unsubscribed_at`. Det mangler bare et frontend-grensesnitt og en sikker måte å lese/oppdatere raden anonymt via token.

## Plan

### 1. Edge Function: `newsletter-manage`
Tokenet er hemmeligheten — vi vil ikke åpne RLS for anon på hele tabellen. En edge function med service role håndterer dette trygt.

- `GET ?token=...` → returnerer `{ email, topics, frequency, unsubscribed_at }` for raden
- `POST { token, action: "update", topics, frequency }` → oppdaterer preferanser, setter `unsubscribed_at = null`
- `POST { token, action: "unsubscribe" }` → setter `unsubscribed_at = now()`
- Returnerer 404 hvis token ikke finnes; ingen e-post lekkes utenom riktig token

### 2. Side: `/unsubscribe` (`src/pages/Unsubscribe.tsx`)
- Leser `?token=` fra URL
- Henter status via edge function, viser e-postadresse maskert (`n***@firma.no`)
- Bruker samme `OptionCard`-stil som `/nyhetsbrev`: huk av morgenbrief / ukebrev / sektorbrev
- To knapper: **«Lagre endringer»** og **«Meld meg helt av»**
- Bekreftelses-state etter handling (gjenbruker `Check`-mønsteret fra Newsletter.tsx)
- NO/EN tekster via `useTheme().language`
- Registrer rute i `src/App.tsx`

### 3. Lenke i e-post / footer
- Eksponér en hjelper `getUnsubscribeUrl(token)` i `src/lib/` slik at fremtidige e-postmaler kan referere til `https://…/unsubscribe?token=…`
- Ikke endre eksisterende e-post-utsendere i denne PR-en (de finnes ikke ennå); kun forberede

### Utenfor scope
- Doble opt-in / bekreftelses-e-post (egen oppgave)
- Faktisk utsending av nyhetsbrev
- Endring av RLS-policyer på tabellen

## Filer som endres/opprettes
- `supabase/functions/newsletter-manage/index.ts` (ny)
- `src/pages/Unsubscribe.tsx` (ny)
- `src/lib/newsletter.ts` (ny, liten helper)
- `src/App.tsx` (legg til rute)
