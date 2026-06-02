# Progress

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
