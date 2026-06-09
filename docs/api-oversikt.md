# API-oversikt — Nær Næring Nordvest

> Generert som referanse over alle APIer, integrasjoner og endepunkter i prosjektet.
> Sist oppdatert: 2026-06-09. Hold denne i synk når Edge Functions legges til/fjernes.

## Arkitektur i ett blikk

Frontend (Vite + React) snakker aldri direkte med eksterne APIer for sensitiv logikk.
Alt går gjennom Supabase Edge Functions som proxy-/gateway-lag. Eksterne nøkler ligger
kun i Edge Function-secrets, aldri i klienten.

```
React (src/)  →  supabase.functions.invoke()  →  Edge Functions  →  eksterne APIer
              →  supabase.from() / .rpc()      →  Postgres (RLS)
              →  Stripe.js / Liveblocks / Sentry (klient-SDK-er)
```

---

## 1. Eksterne tjenester (3.-parts APIer)

| Tjeneste | Brukt til | Hvor (Edge Functions) | Secret |
|---|---|---|---|
| **OpenRouter / Gemini** (AI-gateway) | All AI: utkast, korrektur, tagger, oversettelse, transkripsjon, faktabokser, Spør-chat | ~18 funksjoner via `_shared/ai-client.ts` | `AI_API_KEY`, `AI_BASE_URL` (valgfri) |
| **Stripe** | Abonnement, checkout, billing portal, webhooks | `create-checkout`, `create-portal-session`, `payments-webhook`, `create-*-checkout` | `STRIPE_TEST_SECRET_KEY`, `STRIPE_LIVE_SECRET_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET` |
| **Brønnøysund (brreg)** | Selskapsdata, regnskap, roller, konkurs, etableringer | `brreg-proxy` (+ cron-refresh), `suggest-companies` | (åpent API, ingen nøkkel) |
| **SSB** (json-stat2) | Barometer, bolig- og arbeidsmarkedsdata | `barometer-refresh`, `ssb-housing`, `ssb-labor` via `_shared/ssb.ts` | (åpent API, ingen nøkkel) |
| **ElevenLabs** | TTS-lydartikler + stemmekloning av journalister | `generate-article-audio`, `clone-author-voice`, `daily-edition` | `ELEVENLABS_API_KEY` |
| **Cloudflare Stream** | Live video-input (journalister) | `cloudflare-stream`, `cloudflare-stream-webhook` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`, `CLOUDFLARE_WEBHOOK_SECRET` |
| **Markedsdata** (hvakosterstrommen.no, Norges Bank, krypto) | Markeds-ticker: strøm, Brent, NOK, styringsrente, BTC | `market-data` | (åpne APIer) |
| **Liveblocks** | Sanntids-samskriving i editor | `/api/liveblocks-auth` (Next.js-rute) | Liveblocks secret |
| **Sentry** | Feilrapportering frontend | `src/main.tsx` | `VITE_SENTRY_DSN` |

> `_shared/ai-client.ts` defaulter til OpenRouter men er konfigurerbar (`AI_BASE_URL`/`AI_API_KEY`) —
> i tråd med Lovable-utfasingen i CLAUDE.md.

---

## 2. Edge Functions (46) — gruppert

### AI / innholdsgenerering (18)
Alle POST. De fleste `verify_jwt=false`, men kalles primært fra admin-UI.

`generate-article-draft`, `generate-key-points`, `generate-title-excerpt`, `generate-subheadings`,
`generate-fact-box`, `generate-social-posts`, `generate-job-notice`, `improve-article-body`,
`proofread-article`, `suggest-tags`, `suggest-chart`, `suggest-image-meta`, `suggest-companies`,
`translate-article`, `transcribe-audio`, `extract-source`, `extract-source-async`, `clone-author-voice`

### Betaling / abonnement (5)
`create-checkout`, `create-event-featured-checkout`, `create-job-premium-checkout`,
`create-portal-session`, `payments-webhook` (HMAC-verifisert webhook)

### Bedrift & ekstern data (6)
`brreg-proxy`, `market-data`, `suggest-companies`,
cron: `refresh-financials-cache`, `refresh-roles-and-status`, `refresh-mr-employers`

### Statistikk / barometer (3)
`barometer-refresh` (cron), `ssb-housing`, `ssb-labor`

### Nyheter / feeds (4)
`article-provenance` (offentlig, rate-limited), `daily-edition`, `feed-api` (API-nøkkel),
`newsletter-manage`

### Media (3)
`cloudflare-stream`, `cloudflare-stream-webhook`, `generate-article-audio`

### Tips (2)
`submit-tip` (NaCl box_seal-kryptering, IP-rate-limit), `decrypt-tip-email` (admin/journalist, libsodium)

### Admin / redaksjonelt (3)
`admin-create-user`, `index-trusted-source`, `provenance-admin-notes`

### Bruker / bedriftskonto (4)
`check-article-access` (paywall-gate), `invite-business-seat`,
`verify-business-domain` (DNS TXT), `articles-chat` (SSE-streaming "Spør")

---

## 3. Egne API-endepunkter (publikt eksponert)

De bevisste, offentlige API-kontraktene andre kan treffe:

- **`feed-api`** — offentlig JSON-feed, Bearer API-nøkkel validert via RPC `validate_api_key`.
  Nøkler administreres i `src/components/ApiKeysSection.tsx`.
  Params: `limit` (20–100), `offset`, `category`, `region`, `lang` (no/en).
- **`article-provenance`** — offentlig proveniens-endepunkt (JSON-LD: kilder, tilsvar, rettelser
  uten brødtekst). CORS `*`, 300 req/t per IP-hash.
- **`articles-chat`** — SSE-stream for "Spør arkivet".
- **`market-data` / `ssb-housing` / `ssb-labor` / `daily-edition`** — offentlige, cachede datapunkter.

De øvrige Edge Functions er interne implementasjonsdetaljer (kalt fra eget UI).

---

## 4. Frontend-konsum

- **Supabase-klient:** `src/integrations/supabase/client.ts` — `VITE_SUPABASE_URL` +
  `VITE_SUPABASE_PUBLISHABLE_KEY` (med Next.js `NEXT_PUBLIC_*`-fallback, migreringsforberedt).
- **32 edge-funksjoner** kalles fra frontend via `supabase.functions.invoke()`.
  Sentrale hooks: `useArticleAI.ts` (7 AI-kall), `useArticleProofreading.ts`,
  `useAudioPlayer.tsx`, `useSubscription.tsx`.
- **~14 RPC-funksjoner:** analytics-suite (`analytics_top_articles`, `analytics_daily_traffic`,
  `analytics_breakdown`, `analytics_conversion_funnel`, `analytics_user_growth`),
  `poll_user_choice`/`poll_results`, `increment_job_view`/`increment_job_apply_click`,
  `merge_tags`, `search_trusted_sources`, `has_role`, `hjernevelv_panel_counts`.
- **Ingen React Query/SWR** — alt er custom `useState`/`useEffect` + Supabase Realtime
  (kun på `group_messages` + admin-køer).
- **Klient-SDK-er:** Stripe.js (`@stripe/stripe-js`), Liveblocks, Sentry.

---

## 5. Delte hjelpere (`supabase/functions/_shared/`)

- **`cors.ts`** — CORS-headere (prosjektdomener, Vercel-previews, `ALLOWED_ORIGINS` env).
- **`stripe.ts`** — `createStripeClient()`, `verifyWebhook()`, `getPriceId()`, `planFromPriceId()`, `PRICE_IDS`.
- **`ai-client.ts`** — `aiChatCompletion()`, `aiFetch()` (OpenRouter default).
- **`ssb.ts`** — `ssbFetch()` (json-stat2), `SsbCell`/`SsbResult`, `NACE_HOVEDOMRADE`.

---

## 6. Miljøvariabler

### Frontend (VITE_*)
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_PAYMENTS_CLIENT_TOKEN` (Stripe pk), `VITE_SENTRY_DSN`,
feature-flags: `VITE_FEATURE_AUDIO_FIRST`, `VITE_FEATURE_IDRETT`, `VITE_FEATURE_HJERNEVELV`,
`VITE_FEATURE_MASCOT`, `VITE_FEATURE_GAMES`, `VITE_FEATURE_BAROMETER`.

### Edge Function-secrets
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
`AI_API_KEY`, `AI_BASE_URL`, `AI_SITE_URL`, `AI_APP_NAME`,
`STRIPE_TEST_SECRET_KEY`, `STRIPE_LIVE_SECRET_KEY`,
`PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET`,
`ELEVENLABS_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN`,
`CLOUDFLARE_WEBHOOK_SECRET`, `TIP_ENCRYPTION_PUBLIC_KEY`,
`SITE_URL`, `APP_DOMAIN`, `ALLOWED_ORIGINS`.

---

## 7. Auth-status (`verify_jwt`) — verifisert mot prod 2026-06-09

> ⚠️ `supabase/config.toml` lister kun ~18 funksjoner med eksplisitt `verify_jwt = false`.
> Funksjoner som IKKE står der defaulter til `verify_jwt = true` og er deployet slik.
> Fravær fra config.toml betyr altså at funksjonen ER auth-gated — ikke åpen.
> Sjekk alltid faktisk status via Supabase-dashboardet/API, ikke ved å lese config.toml.

**Nyanse:** `verify_jwt = true` krever bare en gyldig JWT. Den offentlige anon-nøkkelen er en
gyldig JWT, så nettsidebesøkende kan fortsatt kalle funksjonen — men anonym `curl` uten nøkkel
blir blokkert på plattformnivå. Reell rolle-håndheving avhenger av `getUser()`/`has_role` inne i
funksjonen.

- **Alle dyre AI-funksjoner er `verify_jwt=true`** i prod: `articles-chat`, `improve-article-body`,
  alle `generate-*`, `extract-source(-async)`, `suggest-companies`, `proofread-article`,
  `translate-article`, `transcribe-audio`, `generate-article-audio`, `clone-author-voice`.
- **Ingen åpne AI-endepunkter igjen** (`idrett-chat` slettet 2026-06-09; var det eneste).
- **Åpne, men med egen auth inne i funksjonen:** `create-checkout`, `create-portal-session`,
  `check-article-access`, `invite-business-seat`, `verify-business-domain`,
  `create-job-premium-checkout`.
- **Åpne webhooks (signatur-verifisert):** `payments-webhook`, `cloudflare-stream-webhook`.
- **Åpne cron (service-role):** `barometer-refresh`, `detect-barometer-signals`, `refresh-*`.
- **Åpne offentlige data uten egen auth:** `brreg-proxy`, `ssb-housing`, `ssb-labor`, `market-data`.

**`feed-api` + `article-provenance`** er de eneste bevisst offentlige API-kontraktene.

> Drift-merknad: prod har en funksjon som ikke finnes i repoet — `detect-barometer-signals`.
> Nok et tilfelle av repo/prod-drift (se `docs/migration-drift-audit.md`).
</content>
</invoke>
