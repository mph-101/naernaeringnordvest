# Designnotat — Sikkerhet bolk 3: betalingsintegritet (før Stripe live)

**Dato:** 2026-07-07
**Status:** Venter på Magnus' godkjenning (Stripe-integrasjon + ny RPC → forelegges per CLAUDE.md)
**Opphav:** Code review 2026-07-06. Pre-launch-gate — Stripe er ikke live ennå ([[stripe-not-configured]]), så dette er herding før live-mode, ikke et aktivt hull i dag.

Alle DB-fakta verifisert mot prod (`oemzrhlybemakwpyhcno`).

---

## Innhold

| # | Endring | Type | Alvorlighet | Trenger godkjenning |
|---|---------|------|-------------|---------------------|
| 3a | `payments-webhook`: sjekk skrivefeil, ikke returner 200 ved feil | Edge-kode | Høy | Ja (Stripe-flyt) |
| 3b | `feed-api`: gate premium-`body` bak `has_active_subscription()` | Edge-kode | Høy | Ja (paywall) |
| 3c | Rate-limit-teller gjøres atomisk (ny RPC) | Migrasjon (RPC) | Høy | Ja (ny RPC) |

3a og 3b er ren edge-kode (ingen migrasjon). 3c krever ny `SECURITY DEFINER`-RPC. Kan splittes i to PR-er hvis ønskelig; jeg foreslår én «payment integrity»-PR for 3a+3b og en egen for 3c.

---

## 3a — Webhook returnerer ikke lenger 200 ved feilet skriv (Høy)

### Problem
`supabase/functions/payments-webhook/index.ts`: handlerne (`handleSubscriptionUpsert`, `grantSubscriberRole`, `grantBusinessRole`, job/event-checkout) forkaster `{ error }` fra hver Supabase-skriv. Feiler en rolle-grant eller abonnement-upsert, fortsetter koden til linje 278-281, setter `processed_at` og returnerer `{ received: true }` (200). Stripe anser eventet levert og retryer **aldri**. Resultat: **kunden har betalt, men får ingen tilgang** — stille, uten retry, uten alarm.

Relatert: linje 231-233 — feiler `stripe_events`-insert med noe annet enn `23505`, logges det men koden **prosesserer likevel uten dedup-rad**, så en Stripe-retry prosesserer på nytt.

### Endring (edge-kode, ingen migrasjon)
1. La hver handler returnere/kaste ved skrivefeil. Konkret mønster:
   ```ts
   const { error } = await sb.from("subscriptions").upsert(..., {...});
   if (error) throw new Error(`subscriptions upsert failed: ${error.message}`);
   ```
   Tilsvarende i `grantSubscriberRole`/`grantBusinessRole` (returner/kast ved `error`), `business_accounts` insert/update, `job_listings`/`events` update.
2. I `handleWebhook`: ikke sett `processed_at` hvis en handler kastet. Siden handlerne kalles før `processed_at`-oppdateringen og en kastet feil propagerer til `Deno.serve`-catch (som returnerer 400), er det tilstrekkelig at handlerne kaster — `processed_at`-linja nås da ikke, og Stripe retryer.
3. Linje 231-233: ved ikke-`23505` insert-feil, **kast** (returner 400) i stedet for å falle gjennom, så vi aldri prosesserer uten dedup-rad.

### Hvorfor trygt
Idempotens-logikken (F6) tåler re-prosessering: alle skriv er upserts keyet på `provider_subscription_id` / `(user_id,role)` med `ignoreDuplicates`, og `processed_at`-guarden hopper over allerede-fullførte events. Så en Stripe-retry etter 400 er trygg. `stripe_events.event_id` er bekreftet PRIMARY KEY i prod.

### Beslutning du må ta
- `charge.refunded` / `charge.dispute.created` gjør i dag kun `console.log`. Vil du at bolk 3 også (a) setter abonnement til `past_due`/`disputed` ved dispute så `has_active_subscription` slår av, eller (b) beholder ren logging til etter launch? Anbefaling: minimal dispute-håndtering (flagg + Sentry-alarm) nå, full refusjonspolicy senere.

---

## 3b — `feed-api` lekker premium-body til enhver subscriber-nøkkel (Høy)

### Problem
`feed-api/index.ts:153-206` selecter `body`/`body_en` for alle publiserte artikler og returnerer dem uten sjekk på `premium` eller aktivt abonnement. `validate_api_key` (verifisert i prod) gater kun på `has_role(subscriber|admin)` — **ikke** `has_active_subscription()`. En subscriber-rolle som aldri revokeres henter dermed fullt premium-innhold i bulk via JSON-API-et.

### Endring (edge-kode, gjenbruker eksisterende RPC)
`has_active_subscription(_user_id uuid)` finnes allerede i prod (verifisert). Etter nøkkelvalidering:
```ts
const ownerId = validRow.user_id as string;
const { data: isActive } = await supabase.rpc("has_active_subscription", { _user_id: ownerId });
```
I payload-map: for `premium`-artikler, dropp `body` når ikke aktiv:
```ts
body: (a.premium && !isActive) ? null : (lang === "en" && a.body_en ? a.body_en : a.body),
```
Ikke-premium artikler beholder body. Ekskluder evt. `body` fra select for premium når `!isActive` for å ikke sende over nett unødig (mindre viktig; null-stripping i map er nok for korrekthet).

### Hvorfor trygt
Speiler nøyaktig `check-article-access`-logikken nettflaten bruker. Ingen migrasjon, ingen skjemaendring. Admin-nøkler (staff) beholder tilgang via `has_active_subscription` = false, men de er staff — vurder om staff-nøkler skal se premium; anbefaling: la `has_active_subscription` styre (staff bruker nettflaten, ikke feed-API-et).

---

## 3c — Rate-limit-teller er ikke atomisk (Høy)

### Problem
`feed-api/index.ts:96-134`: `SELECT request_count → evaluer i JS (evaluateRateWindow) → UPDATE request_count = nextCount`. Ikke-atomisk read-modify-write → N samtidige requests leser samme count, skriver alle `count+1`, last-write-wins → 300/time-taket omgås under samtidighet. `insert`-grenen for ny nøkkel har ufanget `23505`-race. `api_key_rate_limits` har PK på `key_id` (verifisert).

### Endring (ny migrasjon — `SECURITY DEFINER`-RPC)
Flytt beslutningen inn i én atomisk DB-setning:
```sql
create or replace function public.bump_api_key_rate_limit(
  _key_id uuid, _max int, _window_ms bigint
) returns table(limited boolean, retry_after_seconds int)
language plpgsql security definer set search_path = '' as $$
declare
  now_ts timestamptz := now();
  win_start timestamptz;
  cnt int;
begin
  insert into public.api_key_rate_limits (key_id, request_count, window_start)
  values (_key_id, 1, now_ts)
  on conflict (key_id) do update
    set request_count = case
          when public.api_key_rate_limits.window_start < now_ts - make_interval(secs => _window_ms/1000.0)
          then 1
          else public.api_key_rate_limits.request_count + 1 end,
        window_start = case
          when public.api_key_rate_limits.window_start < now_ts - make_interval(secs => _window_ms/1000.0)
          then now_ts
          else public.api_key_rate_limits.window_start end
  returning request_count, window_start into cnt, win_start;

  if cnt > _max then
    return query select true, ceil(extract(epoch from (win_start + make_interval(secs => _window_ms/1000.0) - now_ts)))::int;
  else
    return query select false, 0;
  end if;
end $$;
```
`feed-api` kaller RPC-en i stedet for select+update; behold `evaluateRateWindow` (+ testen) som ren referanse/CLI-verktøy, eller fjern hvis ubrukt. NB: dette teller +1 også for request som blir avvist (over grensen) — akseptabelt (litt strengere), eller juster til å ikke telle avviste.

### Utrulling
Migrasjon kjøres mot prod etter godkjenning; `feed-api` re-deployes. Migrasjonen er additiv (ny funksjon), ingen endring av eksisterende data.

---

## Testplan (alle deler)
- `payments-webhook`: utvid `src/test/stripe-idempotency.test.ts` med en case der en handler-skriv feiler → forvent at `processed_at` ikke settes og at kall kaster (Stripe ville fått 400).
- `feed-api`: enhetstest på body-strippe-logikken (premium + !active → null; premium + active → body; ikke-premium → body).
- `bump_api_key_rate_limit`: kan ikke unit-testes i vitest (DB-funksjon); verifiser mot prod/branch med en samtidighetstest (N parallelle kall → count = N, ikke 1).
- eslint + vitest + `deno check` grønt før PR.
