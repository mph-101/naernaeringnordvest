
# Abonnementsplan: kvartal + år + bedrift

## Oppsummering av valg

| Beslutning | Valg |
|---|---|
| Betalingsleverandør | Lovable Stripe Payments (built-in, ingen Stripe-konto kreves for å starte) |
| Personlig pris | 199 kr/kvartal, 690 kr/år (-13% vs kvartal) |
| Bedriftspris | 199 kr/sete/mnd OG domenebasert lisens (alle med firma-epost får tilgang) |
| Prøveperiode | 7 dager gratis, krever kort, kan kanselleres når som helst |
| Gating | Tittel + ingress + første avsnitt fritt; resten krever aktivt abonnement |
| Gratis | Spør (AI-chat) og Tall (bedriftsdatabase) forblir åpne for alle |

## Det vi bygger

### 1. Database

**Tre nye tabeller** med RLS:

- `subscriptions` — én rad per bruker. Felter: `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan` (`quarterly` / `yearly` / `business_seat`), `status` (`trialing` / `active` / `past_due` / `canceled`), `trial_ends_at`, `current_period_end`. Brukere kan se egen rad; staff kan se alle.
- `business_accounts` — bedriftslisens. Felter: `id`, `company_name`, `orgnr`, `owner_user_id`, `stripe_subscription_id`, `seat_count`, `email_domain` (nullable, f.eks. `firma.no`), `domain_verified_at`, `current_period_end`, `status`. Eier og staff kan administrere.
- `business_seats` — kobling bruker ↔ bedriftskonto. Felter: `business_account_id`, `user_id` (nullable for ledige seter), `email`, `invited_at`, `accepted_at`. Eier kan invitere/fjerne; tildelt bruker kan se sin egen rad.

**Sikkerhetsfunksjon (SECURITY DEFINER):**
```
public.has_active_subscription(_user_id uuid) RETURNS boolean
```
Returnerer `true` hvis brukeren har en aktiv personlig subscription (`status IN ('trialing','active')`), ELLER er knyttet til en aktiv business_seat, ELLER har en epost som matcher `email_domain` på en aktiv bedriftskonto med verifisert domene.

Tilsvarende `is_business_owner(_user_id, _business_account_id)` for forvaltning.

**Trigger:** Når en ny bruker registreres (`handle_new_user`), sjekk om eposten matcher et verifisert bedriftsdomene og opprett automatisk en `business_seat`-rad.

### 2. Edge functions (serverside — kritisk for sikkerhet)

| Funksjon | Formål |
|---|---|
| `create-checkout` | Oppretter en Stripe Checkout-sesjon. Tar `plan` + (for bedrift) `seat_count` eller `email_domain`. Setter `trial_period_days: 7`. |
| `stripe-webhook` | Lytter på `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. Oppdaterer `subscriptions` / `business_accounts`. Ingen JWT — verifiserer Stripe-signatur. |
| `customer-portal` | Returnerer en Stripe Billing Portal-URL slik at brukere kan oppgradere/nedgradere/kansellere selv. |
| `verify-business-domain` | Sender en verifiseringsmail til `postmaster@{domain}` med klikkbar lenke som setter `domain_verified_at`. |
| `invite-business-seat` | Bedriftseier inviterer noen via epost; tar imot accept-token. |
| `check-article-access` | Kalles fra Article-siden. Returnerer `{ access: 'full' | 'preview', reason }`. **All gating-logikk her — aldri i klient.** |

### 3. Artikkel-gating

På `/article/:id`:
- Klient henter alltid full artikkel (RLS tillater fortsatt SELECT på `published`-artikler — vi gater i UI).
- Hvis `article.premium === true`: kall `check-article-access`. Hvis `preview`, vis kun `title + excerpt + første <p>` fra `body`, deretter en blur-fade og betalingsmur-kort.
- Spør (AI-chat) og Tall (bedriftsdatabase) er uberørt — fortsatt gratis.

For ekstra sikkerhet legger vi til en RLS-policy: hele `body`-feltet vises uansett, men en separat `articles_full` view returnerer kun innhold til abonnenter. Praktisk implementasjon: vi bygger `check-article-access` som returnerer `body`-feltet kun til de med tilgang, og klienten bruker det fremfor `article.body` for premium-artikler.

### 4. UI

**Nye sider:**
- `/abonnement` — prisside med tre kort (Kvartal 199 kr, År 690 kr, Bedrift fra 199 kr/sete). Begge personlige har "Start 7 dager gratis"-knapp. Bedrift har to underflyt: per sete (slider 5–50) eller domenebasert (skriv inn `@firma.no`).
- `/abonnement/bedrift/:id` — bedriftspanel: invitere ansatte via epost, se brukte/ledige seter, verifisere domene, åpne Stripe-portal.
- `/profil` — ny seksjon "Abonnement": status, neste fakturering, knapp til Stripe Customer Portal, oppgrader/nedgrader.

**Nye komponenter:**
- `<PaywallCard />` — vises etter første avsnitt på premium-artikler. Viser pris-CTA + "Logg inn"-link.
- `<SubscriptionBadge />` — i header for innloggede brukere ("Abonnent", "Prøveperiode (5 dager igjen)", "Bedrift").
- `<TrialBanner />` — global topp-banner siste 2 dager av prøveperioden.

### 5. Roller

Ingen nye roller. Brukes eksisterende:
- `subscriber` tildeles automatisk av webhook når subscription blir `active` eller `trialing`.
- `business` tildeles bedriftseier ved opprettelse av bedriftskonto.
- `reader` (default) for alle uten aktivt abonnement.

## Brukerflyt: prøveperiode

1. Bruker klikker premium-artikkel → ser preview + paywall-kort.
2. Klikker "Start 7 dager gratis" → /abonnement → velger kvartal eller år.
3. Stripe Checkout (kort kreves, men ikke trekkes) → returnerer til /abonnement/takk.
4. Webhook setter `status='trialing'`, tildeler `subscriber`-rolle. Bruker får full tilgang umiddelbart.
5. Dag 5: in-app banner "2 dager igjen av prøveperioden — kanseller når som helst".
6. Dag 7: Stripe trekker betaling → `status='active'`, eller feil → `status='past_due'` og rolle fjernes etter 3 dager.

## Brukerflyt: bedrift med domene

1. Bedriftseier går til /abonnement → velger Bedrift → "Domenebasert".
2. Skriver inn `firma.no` + antall ventede ansatte → Stripe Checkout med per-sete-pris.
3. Ved suksess opprettes `business_accounts`-rad med `email_domain='firma.no'`, `domain_verified_at=null`.
4. Eieren får eposten "Verifiser domenet ditt" — klikker lenke som vi sender til `postmaster@firma.no`. Alternativ: legg til en TXT-record i DNS (vises i bedriftspanelet).
5. Når verifisert: alle eksisterende OG nye brukere med `@firma.no`-epost får automatisk tilgang via `has_active_subscription`-funksjonen.

## Tekniske detaljer

**Stripe-konfigurasjon:**
- 3 produkter: "Nær Næring Kvartal", "Nær Næring År", "Nær Næring Bedrift" (sistnevnte med metered/per-seat pricing).
- Pris i NOK, MVA håndteres av Stripe Tax (25% norsk MVA legges til automatisk).
- Norske betalingsmetoder: kort (Visa/Mastercard) + Vipps via Stripe.

**Sikkerhetsprinsipper:**
- All tilgangssjekk skjer serverside via `has_active_subscription` SQL-funksjonen eller `check-article-access` edge function.
- Ingen `localStorage` eller klient-flagg avgjør tilgang — disse kan manipuleres.
- Stripe webhook verifiserer signatur med `STRIPE_WEBHOOK_SECRET`.
- Domene-verifisering kreves før domenebasert tilgang aktiveres (forhindrer at noen kjøper "@gmail.com" og åpner alt).

**Backwards compatibility:**
- Eksisterende `articles.premium`-felt brukes uendret.
- Eksisterende `subscriber`-rolle får ny semantikk (synkronisert med Stripe), men eksisterende rolletildelinger respekteres.
- API-nøkler (ApiKeysSection) fortsetter å sjekke `subscriber`-rolle — vil dermed automatisk virke for nye abonnenter.

## Hva som IKKE er med i denne planen

- Studentrabatt (kan legges til senere som Stripe-kupong)
- Kampanjekoder (kan administreres direkte i Stripe-dashbord)
- Fakturabetaling for bedrifter (kun kort i første runde)
- Refusjons-håndtering — håndteres manuelt i Stripe-dashbord første år
- E-postnotiser ved kansellering / utløp (kan legges til når Resend-integrasjon er på plass)

## Implementeringsrekkefølge

1. Aktivere Lovable Stripe Payments + sette opp 3 produkter
2. Lage migrasjon (3 tabeller + 2 sikkerhetsfunksjoner + trigger)
3. Bygge edge functions (`create-checkout`, `stripe-webhook`, `customer-portal`, `check-article-access`)
4. Bygge `/abonnement`-side
5. Oppdatere `Article.tsx` med ny gating-logikk + `<PaywallCard />`
6. Bygge bedriftspanel (`/abonnement/bedrift/:id`) + invitasjons- og domeneverifiserings-flyter
7. Legge til abonnementsseksjon på `/profil` + Stripe Customer Portal-link
8. Header-badge og prøveperiode-banner

Estimert: alt kan bygges i én lengre økt. Du tester hele flyten med Stripes testkort (`4242 4242 4242 4242`) før vi slår på live-modus.
