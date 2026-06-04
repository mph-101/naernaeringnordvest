# Designnotat — miljøisolasjon for Stripe (sandbox vs live)

> Status: **forslag, venter på Magnus' godkjenning før kode skrives.**
> Bakgrunn: sikkerhetsgjennomgang 2026-06-03, funn #1 (kritisk).
> Berører Stripe-integrasjonen → skal foreligges deg før implementasjon (jf. CLAUDE.md).

## Problemet

`environment` (`"sandbox" | "live"`) velges i dag av **klienten** og sendes i
request-body til `create-checkout`:

```ts
// supabase/functions/create-checkout/index.ts:21
const BodySchema = z.object({
  ...
  environment: z.enum(["sandbox", "live"]),
});
```

Sandbox- og live-webhooken skriver til **samme produksjonsdatabase** (samme
`SUPABASE_SERVICE_ROLE_KEY`). Og gatingen som avgjør tilgang filtrerer ikke på
miljø:

- `payments-webhook` gir `subscriber`/`business`-rolle uten å se på `env`
  (`index.ts:101-102`, `124-126`).
- `has_active_subscription` (migration `20260424093724…:154-194`) sjekker
  `subscriptions`/`business_accounts` **uten** `environment`-filter.
- `check-article-access` bruker begge uten miljøfilter.

Kun `useSubscription.tsx` filtrerer på miljø, og den er eksplisitt "UX only".

### Angrepet

1. Innlogget bruker i produksjon kaller `create-checkout` med
   `environment: "sandbox"`.
2. Fullfører checkout med Stripes testkort (`4242 4242 4242 4242`) — ingen ekte
   betaling.
3. Sandbox-webhooken (`?env=sandbox`) skriver en `subscriptions`-rad +
   `subscriber`-rolle i prod-databasen.
4. `has_active_subscription` returnerer `true` (ingen miljøfilter) → gratis
   premium-tilgang.

Webhook-signaturen er korrekt verifisert, så dette er **ikke** en
signatur-forfalskning — det er at klienten får velge et miljø som aldri skulle
vært tilgjengelig i prod, og at lese-siden ikke skiller miljøene.

## Foreslått løsning

Prinsipp: **serveren bestemmer miljø, ikke klienten**, og lese-siden filtrerer
bort feil miljø.

### 1. Fjern `environment` fra klient-input
- Slett `environment` fra `BodySchema` i `create-checkout` og
  `create-portal-session`.
- Utled miljøet server-side fra én ny env-var per deploy, f.eks.
  `STRIPE_ENVIRONMENT` (`"sandbox"` i staging/preview, `"live"` i prod).
- Webhook-URL-ene beholder `?env=…` (Stripe kaller dem), men koden stoler kun
  på at riktig miljø-secret verifiserte signaturen — uendret.

### 2. Filtrer lese-siden på miljø
- Gi `has_active_subscription` en miljøparameter, ELLER lagre kun ett miljø i
  prod-databasen (se valg under). Hvis vi beholder begge miljøer i samme tabell,
  må funksjonen ta `_environment` og filtrere `AND environment = _environment`.
- `check-article-access` sender prod-miljøet inn.

### Åpne valg til Magnus

**A. Skal sandbox-data i det hele tatt nå prod-databasen?**
   - *Alt. 1 (anbefalt):* Sandbox-webhooken peker på en **egen** Supabase-instans
     (eller blokkeres i prod). Da blir prod-DB ren live-data, og hele
     miljøfilter-problemet forsvinner. Krever at du setter opp webhook-routing.
   - *Alt. 2:* Behold begge i samme DB, men legg til miljøfilter overalt på
     lese-siden (mer kode, lettere å glemme et sted senere).

**B. Navn på server-env-varen** (`STRIPE_ENVIRONMENT`?) og hvilke verdier per
   Vercel/Supabase-miljø.

**C. Hva gjør vi med eventuelle eksisterende sandbox-rader i prod-DB?**
   (sannsynligvis test-data som kan slettes — men det er en DELETE mot prod, så
   den tar du, ikke jeg.)

## Hva jeg IKKE gjør før du svarer
- Rører ikke `_shared/stripe.ts`, `create-checkout`, `create-portal-session`
  eller webhooken.
- Setter ingen secrets.
- Kjører ingen SQL mot prod.

Gi meg svar på A/B/C, så lager jeg en fokusert PR.
