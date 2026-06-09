# Kostnadsoversikt — hva som akkumulerer kostnader

> Generert 2026-06-09. `verify_jwt`-status verifisert mot prod via Supabase API samme dag.
> Se også [`api-oversikt.md`](api-oversikt.md) for full API-katalog.

## TL;DR

Det reelle kostnadsbildet er **vesentlig tryggere** enn en ren kode-titt antyder. Alle dyre
AI-endepunkter krever en gyldig JWT (ikke vidåpne for internett). Restrisikoen er primært en
**innlogget eller anon-nøkkel-bærende** bruker som spammer AI-funksjoner — fordi det ikke finnes
`max_tokens`, ingen AI-kvote per bruker, og ingen budsjett-alarm.

---

## 1. Hva som kan akkumulere kostnader

| Kostnadskilde | Driver | Modell | $-risiko |
|---|---|---|---|
| **OpenRouter / Gemini** (AI) | tokens inn + ut, ~19 Edge Functions | per token | **Høy** — eneste reelle "løpsk regning"-kilde sammen med ElevenLabs |
| **ElevenLabs** | TTS-tegn + stemmekloning | per tegn | **Middels** — cachet + tegn-tak (se §4) |
| **Cloudflare Stream** | live video, minutter + lagring | per minutt | Middels, men bak rolle-sjekk |
| **Brønnøysund (brreg)** | selskaps-/regnskapsoppslag | gratis API | Lav $ — risiko er IP-blokk, ikke kr |
| **SSB** | statistikkoppslag | gratis API | Lav $ — samme |
| **Supabase** | function-invokasjoner, DB-egress, storage, realtime | per bruk | Lav–middels |
| **Stripe** | transaksjonsgebyr | % per txn | Inntektsside |

---

## 2. Grenser som ER satt ✅

| Område | Funksjon | Grense |
|---|---|---|
| Tips | `submit-tip` | 5/time per IP (`tip_rate_limits`) |
| Proveniens | `article-provenance` | 300/time per IP (`provenance_rate_limits`) |
| Paywall | `check-article-access` | 3 gratis/90d (innlogget), 1/90d (anon) |
| Betaling | alle `create-*-checkout` | priser via Stripe `lookup_keys`, aldri klient-styrt beløp; seter min 1 / max 500 |
| Webhook | `payments-webhook` | idempotent via `stripe_events` (PK på event_id) |
| Lyd | `generate-article-audio` | cachet i storage, full-modus maks 4500 tegn, full krever auth |
| Cron brreg | `refresh-financials-cache` | 150ms throttle, månedlig |
| Cron brreg | `refresh-roles-and-status` | 200ms throttle, ukentlig |
| Cron brreg | `refresh-mr-employers` | 150ms throttle, paging 1000, ukentlig |
| Cron SSB | `barometer-refresh` | `top()`-filter (ingen paging), månedlig |
| Input (delvis) | de fleste AI-tekstfunksjoner | klipper input 4 000–20 000 tegn (`.slice()`) |
| Auth | alle dyre AI-funksjoner | `verify_jwt=true` (blokkerer anonym internett-trafikk) |

---

## 3. Hvor grenser MANGLER (korrigert etter prod-verifisering)

### 🟠 Reell AI-eksponering
- **`idrett-chat`** — eneste åpne (`verify_jwt=false`) AI-endepunktet. Bak feature-flag (av i
  prod), men endepunktet lever. Bør stenges eller rate-limites.

### 🟡 Manglende rate-limit på offentlige data
- **`brreg-proxy`** — åpen, ingen per-IP-grense. `batch_financials` tar 50 orgnr/kall men
  ubegrenset parallelle kall. Risiko: brreg IP-blokker oss (ikke kroner).
- **`feed-api`** — API-nøkkel kreves, men ingen kvote/throttling per nøkkel; `offset` ubegrenset.
- **`ssb-housing` / `ssb-labor` / `market-data`** — kun in-memory cache (per instans). Lav
  $-risiko (gratis upstream), men ubeskyttet ved cold-start/oppskalering.

### ⚠️ Tverrgående mangler (gjelder all AI)
- **Ingen `max_tokens`** sendes til noe AI-kall — modellen genererer fritt til egen grense.
  Enkleste fiks: default-tak i `_shared/ai-client.ts` (treffer alle på én gang).
- **Ingen AI-kvote per innlogget bruker** — en redaktør (eller anon-nøkkel-bærer) kan spamme.
- **Ingen budsjett-alarm** i OpenRouter / ElevenLabs / Supabase (Sentry fanger feil, ikke forbruk).
- **`improve-article-body` bruker `gemini-2.5-pro`** (dyrest, ~3× flash). Auth er på, men
  vurder om Pro er bevisst valgt eller kan settes til flash.

---

## 4. ElevenLabs / audio-detaljer

- `generate-article-audio` sjekker `article_audio`-tabell + `article-audio`-bucket før
  generering → **ingen dobbel-fakturering** for samme artikkel+stemme+modus.
- Regenererer kun hvis artikkelen er endret etter cache.
- Full-modus kappes til **4500 tegn** (~3 min). Summary-modus er kort (AI-generert ~60–90 ord).
- `clone-author-voice` er admin/editor-gated, sjelden handling — lav risiko.

---

## 5. Prioritert tiltaksliste

Rangert etter effekt/innsats:

1. **Sett `max_tokens` som default** i `_shared/ai-client.ts` (stopper løpsk output på alle
   funksjoner i én endring). — *kode, Claude kan gjøre*
2. **Per-IP rate-limit på `brreg-proxy`** (gjenbruk mønster fra `submit-tip`). — *kode*
3. **Steng/rate-limit `idrett-chat`** (eller bekreft at feature-flag-av er nok). — *kode/beslutning*
4. **Per-bruker AI-kvote** (rate_limits-tabell, evt. rolle-basert tak). — *kode, større*
5. **Budsjett-alarm** i OpenRouter, ElevenLabs og Supabase dashboards. — *Magnus, utenfor kode*
6. **Vurder `improve-article-body` → flash** med mindre Pro er bevisst. — *beslutning*
</content>
