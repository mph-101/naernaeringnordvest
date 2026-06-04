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
4. **Rute-navn: kanonisk `/naeringspuls` (ASCII)** — oppdatert 2026-06-04 etter
   404-fiks. Opprinnelig valgt `/næringspuls`, men `æ` i URL-segment fungerer ikke
   pålitelig med Next sin fil-baserte routing (NFC/NFD-normalisering; bekreftet 404
   med æ-mappe). Derfor er kanonisk rute ASCII `/naeringspuls`, og `/næringspuls`
   redirecter dit (Next `next.config` + Vite `<Navigate>`). Begge URL-er virker;
   bruk `/naeringspuls` i lenker. Erstatter `/barometer` / `/naeringspulsen`.
