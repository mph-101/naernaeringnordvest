# Decisions

## 2026-06-04 — Næringsbarometer

Kontekst: implementering av næringsbarometeret (`docs/naeringsbarometer-design.md`).

1. **Muren håndheves i RLS, server-side** — ikke kun via edge function slik
   artikkel-paywallen gjør (`docs/paywall.md`). Bevisst avvik. Tier `metered`
   trenger i tillegg en SECURITY DEFINER-RPC med forbruksteller (RLS er stateless).
2. **Barometeret er region-bevisst fra dag én** — `region_slug` på alle
   barometer-tabeller fra start, default `nordvestlandet`. Bygger på eksisterende
   `editorial_regions`, blokkeres ikke av resten av fase 2.
3. **Designdokument først** — godkjennes før migrasjoner skrives.
4. **Rute-navn: `/næringspuls`** (besluttet 2026-06-04). Erstatter de tidligere
   kandidatene `/barometer` / `/naeringspulsen`. Merk: `æ` i URL prosent-kodes
   (`%C3%A6`); ASCII-varianten `/naeringspuls` er et åpent alternativ hvis ren
   delbar lenke prioriteres. Brukes i frontend (PR 3), påvirker ikke skjemaet.
