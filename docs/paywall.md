# Paywall — Nær Næring

Hvordan abonnement, premium-artikler og betaling er bygd i prosjektet. Sist oppdatert: 2026-05-23.

Stripe-integrasjonen kjører **direkte mot Stripe** (ikke via Lovable-gateway). All artikkel-gating skjer via en dedikert edge function — **ikke via RLS**. Det er bevisst: edge functionen returnerer enten full body eller en preview, slik at innholdet aldri når klienten i utgangspunktet.

---

## 1. Arkitektur i ett blikk

```
Bruker → Subscribe.tsx → create-checkout EF → Stripe Embedded Checkout
                                                       │
                          payments-webhook EF ← Stripe webhook
                                  │
                          subscriptions / business_accounts
                                  │
                          user_roles ('subscriber' | 'business')
                                  │
Artikkel-rendering: check-article-access EF → full body eller preview
```

---

## 2. Prismodeller

Definert som Stripe-produkter med `lookup_key`. Lookup gjør at produkt-ID-er ikke ligger hardkodet i koden.

| Plan | Pris | Lookup-key | Type |
|---|---|---|---|
| Personlig — kvartal | 199 kr / 3 mnd (~66 kr/mnd) | `personal_quarterly` | Recurring |
| Personlig — år | 699 kr / år (~58 kr/mnd, spar 97 kr/år vs kvartal) | `personal_yearly` | Recurring |
| Bedrift — 1–9 seter | 599 kr / sete / år | `business_seat_1_9` | Recurring |
| Bedrift — 10–29 seter | 499 kr / sete / år | `business_seat_10_29` | Recurring |
| Bedrift — 30+ seter | 399 kr / sete / år | `business_seat_30_plus` | Recurring |
| Bedrift — legacy (deprecated) | 199 kr / sete / mnd | `business_seat_monthly` | Recurring |
| Job Premium | 499 kr | `job_premium_one_time` | Engangs |
| Event Featured | 1 990 kr | `event_featured_one_time` | Engangs |

Bedrift-plan er multi-seat med automatisk seat-tildeling via domene-verifisering (TXT-record). Volum-tier velges automatisk basert på `seatCount` ved checkout — se `getPriceId()` i `_shared/stripe.ts`. `business_seat_monthly` beholdes for bakovkompatibilitet til eksisterende kunder rulles over ved første fornyelse etter prisendringen.

**Ingen prøveperiode**: Alle planer fakturerer fra første dag. Soft-paywall (3 gratis premium-artikler per rolling 90 dager for innloggede, 1 for anonyme) erstatter behovet for en formell trial.

---

## 3. Paywall-logikk

### Hvem ser hva?

| Bruker | Gratis artikkel | Premium artikkel |
|---|---|---|
| Anonym | Full | Preview (første paragraf) |
| Innlogget uten abonnement | Full | Preview + CTA til /abonnement |
| `subscriber` (status active/trialing) | Full | Full |
| `business` (aktiv seat) | Full | Full |
| `admin` / `editor` / `journalist` | Full + upubliserte | Full |

### Beslutningen tas i `check-article-access`

**Fil:** `supabase/functions/check-article-access/index.ts`

Pseudokode:
```
if (article.premium === false) return { access: "full" }
if (user has role in [admin, editor, journalist, subscriber, business]) return { access: "full" }
if (has_active_subscription(user_id) === true) return { access: "full" }
return { access: "preview", body: first_paragraph_of(article.body) }
```

`has_active_subscription()` er en SQL-funksjon (SECURITY DEFINER) som joiner `subscriptions` mot `business_seats` og sjekker `status IN ('active','trialing')`.

### UI-rendering

**Fil:** `src/app/sak/[id]/client.tsx` linje 87-99

```
const access = await checkArticleAccess(articleId)
const hasFullAccess = access.access === "full"
const showPaywall = article.premium && !hasFullAccess
```

Hvis `showPaywall`, rendres `<PaywallCard />`-komponent med plan-velger + login-CTA.

---

## 4. Database-modell

### `subscriptions` (personlige abonnement)
| Kolonne | Type |
|---|---|
| user_id | uuid |
| provider | text (stripe/paddle) |
| provider_subscription_id | text |
| provider_customer_id | text |
| plan | text (quarterly/yearly/business_seat) |
| price_id, product_id | text |
| status | text (incomplete, trialing, active, past_due, canceled) |
| trial_ends_at | timestamptz |
| current_period_start, current_period_end | timestamptz |
| cancel_at_period_end | boolean |
| environment | text (sandbox/live) |

### `business_accounts` (bedrifts-eier-data)
| Kolonne | Type |
|---|---|
| owner_user_id | uuid |
| seat_count | int |
| email_domain | text |
| domain_verified_at | timestamptz |

### `business_seats` (multi-seat)
| Kolonne | Type |
|---|---|
| business_account_id | uuid |
| user_id | uuid |

Auto-assignment skjer via trigger `auto_assign_business_seat()`: når en ny bruker registrerer seg med en e-post som matcher `business_accounts.email_domain` (og domenet er verifisert), opprettes en seat automatisk.

### `stripe_events` (idempotency)
Beskytter mot dobbeltprosessering av webhook ved nettverksfeil. Hvert event_id PRIMARY KEY, `processed_at` settes etter handler er ferdig.

### `article_views` (telemetri)
Logger hver artikkel-lesing. Ingen `N gratis artikler / måned`-grense implementert per i dag — premium er hard binær.

---

## 5. Edge functions

| Function | Hva den gjør |
|---|---|
| `create-checkout` | Genererer Stripe Embedded Checkout for personlig/bedrift. Bruker `lookup_key` til å løse pris dynamisk |
| `create-job-premium-checkout` | One-time checkout for fremhevet stilling |
| `create-event-featured-checkout` | One-time checkout for fremhevet arrangement |
| `create-portal-session` | Åpner Stripe Customer Portal (endre kort, avbryt, faktura-historikk) |
| `payments-webhook` | Lytter på `subscription.created/updated/deleted` + `checkout.session.completed`. Idempotent via `stripe_events` |
| `check-article-access` | Avgjør om bruker får full body eller preview. **Sentral paywall-logikk** |
| `invite-business-seat` | Inviterer ansatt til bedriftsabonnement |
| `verify-business-domain` | TXT-record-validering for domene-basert auto-tilgang |

Alle bruker Stripe direkte (ikke Lovable-gateway).

---

## 6. UI-komponenter

| Komponent | Plassering | Bruk |
|---|---|---|
| `Subscribe.tsx` | `src/views/` | Pris-kort på `/abonnement` med plan-velger |
| `StripeEmbeddedCheckout.tsx` | `src/components/` | Modal med Stripe Elements (Embedded Checkout) |
| `SubscribeReturn.tsx` | `src/views/` | Takke-side etter checkout (→ /profil etter 4 sek) |
| `BusinessPanel.tsx` | `src/views/` | `/abonnement/bedrift/[id]` — seat-håndtering + invites + TXT-validering |
| `SubscriptionSection.tsx` | `src/components/` | I /profil — status + "Administrer abonnement"-knapp |
| `SubscriptionTrialBanner.tsx` | `src/components/` | Topp-banner ved trialing/canceled/past_due. Dismissable per sessionStorage |
| `SubscriptionStatusBadge.tsx` | `src/components/` | Pille i Header (Aktiv / Prøveperiode / Avsluttes / Inaktiv) |
| `useSubscription` | `src/hooks/` | Realtime-leser av `subscriptions`-tabellen (postgres_changes) |
| `JobPremiumCheckout` | `src/components/` | Brukt i `StillingNy.tsx` |
| `EventFeaturedCheckout` | `src/components/` | Brukt i `Arrangementer.tsx` |

---

## 7. Secrets

Settes i Supabase secrets (via Lovable Cloud):

| Secret | Bruk |
|---|---|
| `STRIPE_TEST_SECRET_KEY` | Sandbox-API-kall |
| `STRIPE_LIVE_SECRET_KEY` | Produksjons-API-kall |
| `PAYMENTS_SANDBOX_WEBHOOK_SECRET` | Verifiserer signatur på sandbox-webhooks |
| `PAYMENTS_LIVE_WEBHOOK_SECRET` | Verifiserer signatur på produksjons-webhooks |

Frontend bruker `VITE_PAYMENTS_CLIENT_TOKEN` (`pk_test_...` eller `pk_live_...`). Sørg for at den matcher backend-mode.

---

## 8. Webhook-events vi lytter på

| Event | Handling |
|---|---|
| `customer.subscription.created` | Upsert i `subscriptions` eller `business_accounts`. Grant `subscriber`/`business`-rolle |
| `customer.subscription.updated` | Oppdater status, current_period_end, cancel_at_period_end |
| `customer.subscription.deleted` | Sett `status='canceled'`. Roller blir værende til current_period_end |
| `checkout.session.completed` | For one-time: marker job/event som `is_premium=true` + sett `featured_until` |

Alle handlinger er idempotente via `stripe_events`-tabellen.

---

## 9. Multi-seat bedriftsflow

```
Bedrifts-eier oppretter konto via /abonnement (plan='business_seat', seat_count=N)
            │
            ▼
Stripe Checkout fullføres → payments-webhook → business_accounts opprettes
            │
            ▼
Eier går til /abonnement/bedrift/[id] (BusinessPanel)
            │
            ├─→ Inviter via e-post (invite-business-seat EF sender invite)
            │
            └─→ Verifiser domene (verify-business-domain EF tester TXT-record)
                            │
                            ▼
            Ansatte på @bedrift.no får automatisk seat ved registrering
            (trigger auto_assign_business_seat)
```

---

## 10. Sterke og svake punkter

### Hva fungerer godt
- **Direkte Stripe** — ren integrasjon, ikke avhengig av gateway-leverandør
- **Idempotent webhooks** via `stripe_events`-tabellen
- **Realtime subscription-status** via Supabase Realtime
- **Multi-seat med domene-verifisering** — ansatte på @bedrift.no får automatisk tilgang
- **Customer Portal** — abonnenter administrerer kort/abonnement selv
- **Preview-modus** for premium — første paragraf indekseres av søkemotorer, resten bak paywall

### Hva som er svakt
1. **Ingen "N gratis artikler / måned"-grense** — alt er binært. Hvis du vil ha mykere paywall ("les 3 gratis så betal"), må det implementeres med `article_views`-tabellen som grunnlag.
2. **Paywall via edge function, ikke RLS** — hvis `check-article-access` får en bug kan premium-innhold lekke. Worth å skrive Vitest-tester.
3. **`environment: sandbox/live`-mismatch** kan oppstå hvis `VITE_PAYMENTS_CLIENT_TOKEN` peker mot Stripe-test mens backend kjører `STRIPE_LIVE_SECRET_KEY` — fail loudly i checkout-flowen.
4. **Ingen test-coverage på webhook-flowen** — refaktorering kan være nervepirrende.
5. **Job premium / event featured er separate flyt** — selv aktive abonnenter må betale ekstra for fremhevet stilling. Bevisst valg, men verdt å huske.

---

## 11. Mulige neste steg

Ikke planlagt arbeid, bare ideer:
- "N gratis artikler / måned"-grense via `article_views`-tabellen
- Vitest-tester for `check-article-access` + `payments-webhook`
- Rabatt for abonnenter på job-premium / event-featured
- Vurder gratis prøveperiode på nytt hvis konvertering er lav (vi har soft-paywall som primær konverteringsmotor)
- Win-back e-post for canceled subscriptions
- Detaljert subscription-analytics dashboard

---

## 12. Filer å kjenne til

```
src/views/Subscribe.tsx                            # /abonnement
src/views/SubscribeReturn.tsx                      # /abonnement/retur
src/views/BusinessPanel.tsx                        # /abonnement/bedrift/[id]
src/components/StripeEmbeddedCheckout.tsx          # Stripe Elements modal
src/components/SubscriptionSection.tsx             # I /profil
src/components/SubscriptionTrialBanner.tsx         # Topp-banner
src/components/SubscriptionStatusBadge.tsx         # Header-pille
src/components/JobPremiumCheckout.tsx              # I StillingNy.tsx
src/components/EventFeaturedCheckout.tsx           # I Arrangementer.tsx
src/hooks/useSubscription.ts                       # Realtime status

supabase/functions/_shared/stripe.ts               # Stripe-klient og keys
supabase/functions/create-checkout/index.ts        # Personlig + bedrift
supabase/functions/create-job-premium-checkout/    # One-time job
supabase/functions/create-event-featured-checkout/ # One-time event
supabase/functions/create-portal-session/          # Customer Portal
supabase/functions/payments-webhook/index.ts       # Webhook-handler
supabase/functions/check-article-access/index.ts   # SENTRAL paywall-logikk
supabase/functions/invite-business-seat/           # Bedrift-invitasjoner
supabase/functions/verify-business-domain/         # TXT-record-validering
```

---

*Eier: Magnus Peter Harnes. Endringer i prismodell eller paywall-logikk må gå via ham.*
