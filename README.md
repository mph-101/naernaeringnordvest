# Nær Næring Nordvest

Regional næringslivsavis for Møre og Romsdal. Første utgivelse i en planlagt kjede av regionale aviser.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Redaktør:** tiptap
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Betaling:** Stripe
- **Deploy:** Vercel (planlagt)

## Lokal utvikling

Krav: Node.js 18+ og npm.

```sh
git clone <repo-url>
cd naernaeringnordvest

# Sett opp miljøvariabler
cp .env.example .env.local
# Fyll inn verdier fra Supabase og Stripe dashboard (se .env.example for detaljer)

npm install
npm run dev
```

Appen kjører på `http://localhost:5173`.

## Miljøvariabler

Se [`.env.example`](.env.example) for alle nødvendige variabler med beskrivelser. Kopier til `.env.local` — denne filen ignoreres av git.

## Supabase

- **Migrasjoner:** `supabase/migrations/` — kjøres i alfabetisk rekkefølge. Aldri rediger kjørte migrasjoner, skriv nye.
- **Edge Functions:** `supabase/functions/` — bruker Deno runtime.

## PR-krav

Se [`CLAUDE.md`](CLAUDE.md) for detaljerte retningslinjer. Kort oppsummert: én oppgave per PR, 200–500 linjer, tester for sikkerhetskritisk kode.
