# Progress

## Sikkerhetsgjennomgang abonnement (2026-06-03)

- **Funn #2 — paywall stolte på `subscriber`/`business`-rolle** — 2026-06-03, branch `fix/paywall-subscriber-role-gating`
  - `check-article-access` ga full tilgang basert på rå rollemedlemskap (`STAFF_ROLES` inkluderte `subscriber` + `business`). Rollen revokeres aldri ved oppsigelse, så utløpte abonnenter beholdt premium-tilgang permanent — `has_active_subscription` (som sjekker `current_period_end`) ble omgått.
  - Fix: fjernet `subscriber`/`business` fra `STAFF_ROLES` — betalt tilgang går nå utelukkende via `has_active_subscription`. Redaksjonelle roller (`admin`/`editor`/`journalist`) beholder ubegrenset tilgang.
  - Gjorde `userId`-utledning injiserbar (`resolveUserId`-dep) så den sikkerhetskritiske rolle-stien kan enhetstestes uten ekte JWT. La til 4 tester (aktiv sub → full, admin → full, utløpt abonnent → preview, business uten sub → kvote ikke ubegrenset).
  - Verifisert: `deno test` 15/15 grønt, `deno check` + eslint rene. Filer: `supabase/functions/check-article-access/{index,index.test}.ts`.
  - **Merk (separat gap):** CI (`ci.yml`) kjører kun vitest (`src/**`), ikke Deno-testene under `supabase/functions/`. Disse må kjøres manuelt med `deno test`. Verdt å legge til et Deno-steg i CI senere.
- **Funn #1 — Stripe sandbox gir ekte tilgang** — designnotat skrevet, venter på Magnus. Se `docs/security-stripe-environment-isolation.md` + `docs/magnus-todo.md`.
- **Funn #3 — `article_views` UPDATE `USING(true)`** — flagget, ikke fikset (RLS-endring krever din godkjenning).

## Fase 1 — Sikkerhets-sprint

- **1.5 .env ut av git** — 2026-05-17, branch `chore/env-out-of-git`
  - Fjernet `.env` og `.env.development` fra git-tracking
  - Lagt til `.env*` i `.gitignore`, opprettet `.env.example`
  - Erstattet Lovable-README med prosjekt-relevant README
  - Filer endret: `.gitignore`, `.env.example` (ny), `README.md`

## Fase 3 — Next.js-migrering

- **3.x Fullføring av rute-paritet** — 2026-06-01, branch `fix/revision-log-dates-and-captions`
  - Next.js-migreringen var strukturelt komplett (alle `src/app/*` page/_loader/client-trioer på plass, `next build` grønn). Lukket gjenværende rute-gap mellom React Router (`src/App.tsx`) og App Router:
    - Ny rute `/kommer-snart` (ComingSoon) — manglet i Next. Filer: `src/app/kommer-snart/{page,_loader,client}.tsx`
    - Bro-redirect `/reset-password` → `/nullstill-passord` (Supabase passord-reset-epost peker hit; hash med recovery-token bevares)
    - Bro-redirect `/abonnement/takk` → `/abonnement/retur` (Stripe return-URL; `session_id`-query bevares)
  - Begge redirects satt `permanent: false` siden Vite- og Next-appen sameksisterer. Filer endret: `next.config.ts`, `.claude/launch.json` (next-dev preview-config)
  - Verifisert i `next dev`: `/kommer-snart` rendrer fullt, begge redirects bevarer query/hash, ingen console-feil.
  - **Gjenstår (Magnus' beslutning):** flippe default `build`/`dev`-script fra Vite til Next + Vercel-cutover (fase 5). Ikke gjort unilateralt — deployment/routing er redaksjonell/forretningsbeslutning.

## Samredigering (Yjs + tiptap)

- **Fase A — grunnmur** — 2026-06-02
  - Migrasjon `20260601130000_yjs_collab_infrastructure.sql` kjørt mot prod (`oemzrhlybemakwpyhcno`): `yjs_snapshots`-tabell (bytea-state, RLS for admin/editor/journalist) + `articles.collab_enabled`-flagg. Ingen nye security-advisories.
  - `types.ts` regenerert (PR #89). Merk: codegen returnerer `{"types":"…"}` — må pakkes ut til rå TS, ellers feller den eslint (jf. #88).

- **Fase B — auth + grunnleggende sync** — 2026-06-02, branch `feat/collab-fase-b`
  - **Transport-valg utsatt:** bygget bak en provider-abstraksjon (`src/lib/collab/`) med Liveblocks som første implementasjon. `createCollabProvider` er eneste bytte-punkt; editor/komponenter er transport-nøytrale, så et senere bytte til selvhostet Hocuspocus blir lite (dokumentmodellen overlever via `yjs_snapshots`).
  - Nye pakker: `yjs`, `@tiptap/extension-collaboration` + `-collaboration-caret` (3.23.4, matcher tiptap), `@liveblocks/client` + `/yjs` + `/node` (2.24.4).
  - `src/app/api/liveblocks-auth/route.ts` — verifiserer Supabase-JWT + `has_role` (admin/editor/journalist), minter scoped session-token. Returnerer 501 hvis `LIVEBLOCKS_SECRET_KEY` mangler (graceful fallback).
  - `RichTextEditor` fikk valgfri `collab`-prop (Collaboration + CollaborationCaret, Yjs eier undo/redo) — ingen duplisering av 680-linjers editor. `CollaborativeRichTextEditor` er tynn wrapper som `ArticleEditorBody` alltid bruker; faller selv tilbake til vanlig editor når `collab_enabled` er av eller rommet ikke er tilkoblet.
  - Verifisert: lint exit 0, vitest 58/58, vite build + tsc (app & next) grønt.
  - **Gjenstår for å gå live:** (1) Magnus oppretter Liveblocks-konto + legger `LIVEBLOCKS_SECRET_KEY` i `.env.local` og Vercel. (2) To-vinduers synktest (krever nøkkelen). (3) Fase C: presence-avatarer, `collab-sync`-persistering, cold-start fra `yjs_snapshots`.
  - **Live i prod** 2026-06-02 (PR #88–#93): auth-fiks (token-basert), editor-mount-fiks, og av/på-knapp for samredigering i editoren (default av).

- **Fase C — presence + tilgang** — 2026-06-02, branch `feat/collab-fase-c-presence`
  - **Presence-avatarer:** `PresenceAvatars` viser hvem som redigerer brødteksten nå (fargede initial-avatarer via Yjs `awareness`, transport-nøytralt). Vises over editoren kun i collab-modus.
  - **Tilgang på collab-knapp:** gated til redaksjonelle roller (`hasAnyRole(['admin','editor','journalist'])`) — journalister kan nå styre samredigering, konsistent med auth-routens roller.
  - **Persistering:** allerede dekket av eksisterende auto-lagring (collab `onUpdate` → `onChange` → debounced save holder `articles.body` fersk) + seed-on-empty fra HTML ved cold-start. Binær `yjs_snapshots`-persistering (webhook / Hocuspocus `onStoreDocument`) er bevisst utsatt til transport-valget er tatt — en Liveblocks-webhook nå kan bli kastet bort ved et Hocuspocus-bytte.
  - Verifisert: eslint exit 0, tsc (app) rent, vite build grønt. Live presence-test krever to innloggede økter (Magnus' steg).
