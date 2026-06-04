# Magnus — handlinger utenfor kode

Ting som krever din handling i dashboards / secrets / DB, utenfor det Claude kan gjøre.

## Åpne

### Migrasjons-drift (2026-06-04) — KRITISK, før mer feature-arbeid
Full analyse i [`docs/migration-drift-audit.md`](migration-drift-audit.md).
**Seks repo-migrasjoner er aldri kjørt i prod.** Repo-mappa ≠ fasit (prod ble
gjenoppbygd fra snapshot 05-26 med egne tidsstempler). Ingenting endret i prod
under auditen — kun lesespørringer.

Det som trenger din beslutning/handling:
- **MCP-token-tilgang:** historisk kunne ikke Claude kjøre migrasjoner via MCP
  (`permission denied`, jf. bildetekst-saken under). Avklar om jeg kan kjøre
  `apply_migration` nå, ellers kjører du dem.
- **Kjappe additive fikser** (lav risiko): `stripe_events` (idempotens stille av i
  `payments-webhook`), `live_streams` (brutt feature), de to manglende cron-jobbene
  (`refresh-financials-cache-monthly`, `refresh-roles-and-status-weekly` — cachene
  auto-oppdateres ikke i dag).
- **Multi-region** (`20260518200000`): krever DB + frontend-slug-endring
  (`more-og-romsdal → nordvestlandet`) i samme PR. Låser opp barometeret.
- **Tip-kryptering** (fase 1.2, `20260518130000`): IKKE kjør frittstående — filen
  er destruktiv og pipelinen er uferdig. Egen oppgave. Inntil da lagres
  tips-e-post i klartekst.

### ✅ LØST: Bildetekst-funksjon (2026-05-31)
> **Verifisert kjørt i prod 2026-06-04** (drift-audit): kolonnene `image_caption`
> m.fl. finnes på `articles`. Ingen handling nødvendig. Beholdt for historikk.

- **Kjør migrasjonen `supabase/migrations/20260531120000_article_image_caption.sql`** mot prod.
  Claude fikk `permission denied` via MCP-tokenet og kunne ikke kjøre den selv.
  Den legger til `image_caption`, `image_credit`, `image_source` på `articles`.
- **Hvorfor kritisk:** Artikkel-editoren skriver nå disse tre feltene ved hver
  lagring. Uten kolonnene vil **all artikkellagring feile** ("column does not
  exist"). Migrasjonen MÅ kjøres før (eller samtidig som) frontend-koden går live.
- `src/integrations/supabase/types.ts` er allerede manuelt oppdatert til å matche
  migrasjonen. Når du kjører `supabase gen types` neste gang blir den uansett lik.

### Vercel preview-deploy for Next.js (2026-06-01)

Mål: få en ekte preview-deploy av Next-appen på Vercel **uten** å røre DNS, så vi
kan verifisere miljøet (env, middleware på edge, auth-cookies i SSR) før cutover.
Koden er klar — `vercel.json` peker allerede på `npm run build:next`, framework
`nextjs`, region `arn1` (Stockholm, matcher Supabase `eu-north-1`).

**Det du må gjøre i Vercel-dashbordet:**

1. **Eksisterende Vercel-prosjekt er allerede koblet til repoet** (`mph-101/naernaeringnordvest`).
   Bruk det — ikke lag nytt. `vercel.json` på `main` styrer byggingen, og preview-deploys
   fra feature-branch er isolerte (rører ikke det `main`/prod serverer). La `main`/DNS være urørt.
2. **Environment Variables** (Settings → Environment Variables). Verifisert fasit
   2026-06-02 ved å lese all `process.env`-bruk i Next-koden. **Nøyaktig tre** vars
   trengs (alle `NEXT_PUBLIC_` — inlines ved build, sendes til nettleser):
   | Variabel | Verdi | Scope |
   |----------|-------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://oemzrhlybemakwpyhcno.supabase.co` | Production + Preview |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/public key fra Supabase → Settings → API | Production + Preview |
   - **Demo-status (2026-06-02):** kun de to over er satt. `SUPABASE_SERVICE_ROLE_KEY`
     er slettet fra Vercel (✓). Stripe er bevisst ikke satt opp i demo, så
     `NEXT_PUBLIC_PAYMENTS_CLIENT_TOKEN` er **utelatt** med vilje. Checkout-komponenten
     viser da en pen «Betaling ikke tilgjengelig i demomodus»-melding i stedet for å
     crashe (guard i `StripeEmbeddedCheckout.tsx`). Legg til tokenet når betaling skal på.
   - Merk: `NEXT_PUBLIC_*` inlines ved build — du må **redeploye** etter endring.
   - **Skal IKKE ligge i Vercel** (ingen Next-kode leser dem):
     - `SUPABASE_SERVICE_ROLE_KEY` — RLS-bypass-overflate uten nytte. Hører hjemme i
       Edge Functions (Supabase), ikke frontend-deployet. Fjern med mindre du har en
       konkret server-side plan (f.eks. fremtidig Liveblocks-auth-route).
     - `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` — kun `vite.config.ts`
       bruker dem (Vite-byggets source-map-opplasting), ikke Next-bygget.
   - **Sjekk:** at den andre Supabase-varen faktisk er anon-key og ikke URL-en på nytt.
3. **Legg Vercel preview-domenet til i Supabase Auth → URL Configuration →
   Redirect URLs** (f.eks. `https://<branch>-<prosjekt>.vercel.app/**`). Ellers
   feiler innlogging/passord-reset på preview med "redirect not allowed".
4. **Verifiser etter deploy** (jeg kan hjelpe med å gå gjennom dette mot preview-URL-en):
   - Forside + en artikkel (`/sak/[id]`) rendrer, og artikkelen har OG-tags i
     `<head>` (view source — bekrefter at SSR-metadata virker i deployet kontekst).
   - Innlogging fungerer (auth-cookie settes av middleware på edge).
   - Checkout (innlogget): velg en plan → modalen skal vise «Betaling ikke
     tilgjengelig i demomodus», ikke crashe. (Når Stripe settes opp senere: legg til
     tokenet i Vercel og verifiser at ekte checkout laster.)
   - Bro-redirects: `/reset-password` → `/nullstill-passord`,
     `/abonnement/takk` → `/abonnement/retur`.

**Ikke gjort (venter på din beslutning):** flippe default `dev`/`build`-script til
Next og peke produksjons-DNS mot Vercel. Det er den ekte cutoveren (fase 5).

## Samredigering (Fase B) — for å gå live

Migrasjonen `20260601130000_yjs_collab_infrastructure.sql` er nå kjørt mot prod
(`yjs_snapshots` + `articles.collab_enabled`). Koden for Fase B er på plass bak
en provider-abstraksjon med Liveblocks. For å aktivere sanntids samredigering:

1. **Opprett Liveblocks-konto** på liveblocks.io (free tier holder).
2. **Hent secret key** (`sk_...`) fra Liveblocks-dashboardet.
3. **Legg den inn** som `LIVEBLOCKS_SECRET_KEY`:
   - lokalt i `.env.local`
   - i Vercel → Project Settings → Environment Variables (server-only, ikke `NEXT_PUBLIC_`)
4. **Slå på flagget** per artikkel for test: sett `collab_enabled = true` på en
   artikkelrad i Supabase, åpne den i to nettlesere og verifiser sanntids sync.

Uten nøkkelen faller editoren stille tilbake til ikke-samarbeidende modus, så
ingenting crasher i mellomtiden.

> Vurder før utrulling: Liveblocks er en US-tredjepart som mottar artikkel-body.
> Alternativet (selvhostet Hocuspocus i EU) er fortsatt åpent — byttet er lite
> fordi alt ligger bak `src/lib/collab/createCollabProvider`.
