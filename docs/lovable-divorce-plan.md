# Plan: Løsrive Nær Næring Nordvest fra Lovable

Status per 2026-05-21. Prosjektet kjører i dag på **Lovable Cloud** (Supabase under panseret) med **Lovable AI Gateway** for AI-kall. Vercel håndterer frontend-deploy uavhengig.

Dette dokumentet skisserer en gradvis migrasjon til ren Supabase + valgt AI-provider, slik at du ikke har noen avhengighet til Lovable.

---

## 1. Hva binder oss til Lovable i dag

| Komponent | Lovable-binding | Hva som må endres |
|---|---|---|
| Supabase-prosjekt `pidndnsjsbzefshlgfqw` | Eies av Lovable-org i Supabase | Transfer til egen org, eller migrer data til nytt prosjekt |
| AI-kall i 21 edge functions | `https://ai.gateway.lovable.dev` + `LOVABLE_API_KEY` | Bytt URL + API-key + modellnavn |
| Edge function deploy | Auto fra Lovable | Bruk Supabase CLI (`supabase functions deploy`) |
| SQL Editor | Lovable UI | Bruk Supabase Dashboard SQL Editor |
| AI-assistert kode-redigering | Lovable chat | Allerede ute (Claude Code) |
| Frontend deploy | Vercel | Allerede uavhengig |
| Domene + CDN | Vercel | Allerede uavhengig |

Du har altså to faktiske avhengigheter: **AI-gateway** og **Supabase-eierskap**. Resten er bare ulike brukergrensesnitt for det samme.

---

## 2. AI-modeller som brukes i dag

Alle 21 functions bruker Google Gemini via Lovable:

| Modell (Lovable-alias) | Antall functions | Bruk |
|---|---|---|
| `google/gemini-3-flash-preview` | 7 | brreg-query (planner + answer), idrett-chat, suggest-chart, generate-title-excerpt, generate-job-notice, proofread-article |
| `google/gemini-2.5-flash` | 13 | suggest-tags, translate-article, generate-key-points, generate-article-draft, suggest-companies, transcribe-audio, generate-fact-box, generate-social-posts, generate-subheadings, suggest-image-meta, extract-source, extract-source-async, generate-article-audio |
| `google/gemini-2.5-pro` | 1 | improve-article-body |

`articles-chat` bruker også Lovable AI men ble ikke fanget i automatisk søk — sjekk manuelt.

---

## 3. Fase 1: Bytt AI-gateway (lav risiko, høy verdi)

### Anbefalt provider: **OpenRouter**

- OpenAI-kompatibelt API (samme format som Lovable AI Gateway)
- Støtter Gemini 2.5 Flash, Gemini 2.5 Pro, Claude, GPT, Llama — alle gjennom samme key
- Pay-per-token, ingen abonnement
- Du betaler ca. 10-20% påslag på providerens egne priser, til gjengjeld slipper du å håndtere flere API-keys

**Alternativ:** Direkte til Google AI Studio (`generativelanguage.googleapis.com`). Krever litt mer kode-endring fordi de bruker eget format, men billigere og enklere abonnement.

### Konkrete kode-endringer (OpenRouter-rute)

**Per edge function:**

```typescript
// FØR (Lovable):
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "google/gemini-3-flash-preview",
    messages: [...],
  }),
});

// ETTER (OpenRouter):
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://naernaeringnordvest.vercel.app",
    "X-Title": "Nær Næring Nordvest",
  },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",  // samme modellnavn fungerer
    messages: [...],
  }),
});
```

### Mer robust: lag et delt AI-klient-bibliotek

Lag `supabase/functions/_shared/ai-client.ts`:

```typescript
const AI_BASE_URL = Deno.env.get("AI_BASE_URL") || "https://openrouter.ai/api/v1";
const AI_API_KEY = Deno.env.get("AI_API_KEY")!;

export async function aiChatCompletion(opts: {
  model: string;
  messages: any[];
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
}) {
  const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://naernaeringnordvest.vercel.app",
      "X-Title": "Nær Næring Nordvest",
    },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error(`AI gateway error ${res.status}`);
  return res.json();
}
```

Da kan hver function importere `aiChatCompletion` og bytte provider sentralt ved å endre `AI_BASE_URL` env-var. Tester provider én gang, ikke 21 ganger.

### Rekkefølge i Fase 1

1. **Lag OpenRouter-konto** (openrouter.ai) → få API-key
2. **Sett env vars i Supabase**: `AI_BASE_URL`, `AI_API_KEY`
3. **Lag `_shared/ai-client.ts`** (én PR)
4. **Migrer én function (brreg-query)** som pilot — verifiser at det funker
5. **Migrer alle 20 resterende functions** (én batch-PR)
6. **Slett `LOVABLE_API_KEY`-referanser**
7. **Fjern `LOVABLE_API_KEY` fra Supabase secrets** (siste steg)

**Estimert tid:** 4-8 timer aktivt arbeid, kan spres over noen dager. Lav risiko fordi du kan rulle tilbake en function av gangen.

**Kostnadsestimat:** Gemini 2.5 Flash via OpenRouter er ~$0.10 per million input tokens / ~$0.40 per million output. For Nær Næring-volumet ditt sannsynligvis $5-20/mnd.

---

## 4. Fase 2: Supabase-eierskap

### Alternativ A: Be Lovable transfere prosjektet (enklest)

**Hva:** Lovable beholder Supabase-prosjektet `pidndnsjsbzefshlgfqw`, men flytter eierskap til din personlige Supabase-org. Du logger inn på supabase.com direkte og ser prosjektet der.

**Steg:**
1. Opprett konto på supabase.com med `mpharnes@gmail.com`
2. Opprett en personlig org
3. Skriv i Lovable-chat: *"Jeg vil flytte Supabase-prosjektet pidndnsjsbzefshlgfqw til min egen Supabase-konto. Jeg har opprettet en org under mpharnes@gmail.com. Kan dere transfere prosjektet til min org?"*
4. Lovable håndterer overføringen via Supabase API

**Pro:**
- Samme URL og keys — null endringer i frontend eller edge functions
- All data og migrasjoner blir der de er
- Cron-jobben og refresh-funksjonen fortsetter å kjøre
- Kan gjøres uavhengig av Fase 1 (AI-bytting)

**Con:**
- Krever Lovable-samarbeid
- Lovable kan ha policy mot transfer (men de fleste hosting-tjenester støtter det)
- Du må selv betale Supabase-fakturaer fra dag én (Lovable Cloud-abonnement bortfaller for prosjektet)

**Hva som skjer med Lovable etterpå:**
- Lovable chat fungerer ikke lenger for prosjektet
- SQL Editor er nå på supabase.com istedenfor lovable.dev
- Edge function deploy må skje via Supabase CLI eller GitHub Actions

### Alternativ B: Migrer til nytt Supabase-prosjekt (full kontroll)

**Hva:** Opprett et helt nytt Supabase-prosjekt, dump data og migrasjoner over, oppdater frontend og deploy.

**Steg:**
1. Opprett nytt Supabase-prosjekt → får ny `project-ref` og keys
2. Installer Supabase CLI lokalt
3. `pg_dump` fra gammelt prosjekt → SQL-fil
4. Importer migrasjoner: `supabase db push` (mappen `supabase/migrations/` er allerede der)
5. Importer data: `psql < dump.sql`
6. Deploy alle edge functions: `supabase functions deploy <name>` per function
7. Oppdater `.env.local` + Vercel env vars med ny URL og anon-key
8. Redeploy frontend på Vercel (auto når env oppdateres)
9. Test alt
10. Deaktiver gammelt prosjekt

**Pro:**
- Full kontroll, ingen avhengighet av Lovable for transfer
- God anledning til opprydding (slett tabeller du ikke trenger)
- Kan gjøres når du vil

**Con:**
- Mer arbeid (4-8 timer)
- Du må oppdatere URL og keys overalt
- Cron-jobben må re-settes opp
- Eventuelt nedetid (kan minimeres med DNS-cutover)

### Rekkefølge i Fase 2

Hvis Alternativ A:
1. Opprett Supabase-konto + org → 5 min
2. Be Lovable om transfer → 1-3 dager venting
3. Verifiser tilgang → 30 min
4. Sett opp Supabase CLI for deploy → 30 min

Hvis Alternativ B:
1. Sjekk migrasjoner er komplette og kjørbare → 1 time
2. Opprett nytt Supabase-prosjekt → 10 min
3. Test migrasjoner mot tomt nytt prosjekt → 1 time
4. Dump data fra gammelt → 30 min
5. Importer til nytt → 30 min
6. Deploy edge functions → 1 time
7. Bytt env vars + redeploy frontend → 30 min
8. Test ende-til-ende → 1-2 timer
9. Re-sett cron-jobb → 30 min

---

## 5. Fase 3: Deploy-flow uten Lovable

Etter Fase 2 må deploys gå via Supabase CLI:

### Installer og koble til
```bash
npm install -g supabase
supabase login                                # OAuth med GitHub/Google
supabase link --project-ref <your-ref>        # Knytt repo til prosjekt
```

### Deploy edge functions
```bash
supabase functions deploy refresh-financials-cache
supabase functions deploy brreg-query
# osv per function
```

### Push migrasjoner
```bash
supabase db push
```

### Eller: GitHub Actions for auto-deploy

Lag `.github/workflows/supabase-deploy.yml`:

```yaml
name: Deploy to Supabase
on:
  push:
    branches: [main]
    paths:
      - 'supabase/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase db push
      - run: |
          for fn in supabase/functions/*/; do
            name=$(basename "$fn")
            [ "$name" = "_shared" ] && continue
            supabase functions deploy "$name"
          done
```

Da deployes alt automatisk ved push til main, akkurat som Vercel for frontend.

---

## 6. Anbefalt rekkefølge totalt

```
Uke 1: Fase 1 - AI-bytte
  Mandag:   OpenRouter-konto + _shared/ai-client.ts
  Tirsdag:  Migrer brreg-query, test grundig
  Onsdag:   Migrer 5-10 functions
  Torsdag:  Migrer resten
  Fredag:   Fjern LOVABLE_API_KEY, verifiser alt fungerer

Uke 2: Fase 2 - Supabase-eierskap (velg A eller B)
  A: Be Lovable transfere → venting + verifisering
  B: Migrer til nytt prosjekt → 1-2 dager fokusert arbeid

Uke 3: Fase 3 - Deploy-flow
  Sett opp Supabase CLI + GitHub Actions
  Slett evt. siste Lovable-bindinger
```

---

## 7. Risiko og fallback

| Risiko | Sannsynlighet | Fallback |
|---|---|---|
| OpenRouter kostnader høyere enn forventet | Lav | Bytt til Google AI Studio direkte (billigere, mer kode-endring) |
| Lovable nekter prosjekt-transfer | Lav-Medium | Gå Alternativ B (nytt prosjekt) |
| Modell `gemini-3-flash-preview` ikke tilgjengelig hos OpenRouter | Medium | Bytt til `gemini-2.5-flash` (bredt tilgjengelig) |
| Cron-jobben slutter å fungere etter prosjekt-transfer | Lav | Kjør Steg 3-migrasjon på nytt i nytt prosjekt |
| Vercel-deploy bryter ved env-bytte | Lav | Rollback Vercel-deployment til forrige versjon |

---

## 8. Sjekkliste

### Forberedelse
- [ ] Sikkerhetskopier data: `pg_dump > backup-$(date +%Y%m%d).sql`
- [ ] Eksporter liste over Supabase secrets (env vars i edge functions)
- [ ] Dokumenter cron-jobber: `SELECT * FROM cron.job` → lagre
- [ ] Bekreft at alle migrasjoner i `supabase/migrations/` reflekterer faktisk DB-tilstand

### Fase 1: AI
- [ ] OpenRouter-konto opprettet
- [ ] API-key generert
- [ ] `AI_BASE_URL` og `AI_API_KEY` satt som Supabase secrets
- [ ] `_shared/ai-client.ts` opprettet og testet
- [ ] brreg-query migrert og verifisert (pilot)
- [ ] Resterende 20 functions migrert
- [ ] `LOVABLE_API_KEY` fjernet fra alle functions
- [ ] `LOVABLE_API_KEY` slettet som secret

### Fase 2: Supabase
- [ ] Supabase-konto opprettet med mpharnes@gmail.com
- [ ] Personlig org opprettet
- [ ] (A) Lovable kontaktet for transfer / (B) Nytt prosjekt opprettet
- [ ] Tilgang verifisert i Supabase Dashboard
- [ ] (B kun) Data + migrasjoner overført
- [ ] (B kun) Frontend env vars oppdatert i Vercel
- [ ] (B kun) Frontend redeployet
- [ ] Cron-jobb verifisert at den fortsatt kjører

### Fase 3: Deploy
- [ ] Supabase CLI installert lokalt
- [ ] `supabase link` til prosjektet
- [ ] Test-deploy av en function via CLI fungerer
- [ ] GitHub Actions workflow opprettet (valgfritt)
- [ ] Lovable Cloud-abonnement kansellert (siste steg)

---

## 9. Hva som ikke endres

Disse fungerer som før, uavhengig av Lovable:
- Vercel-deploy av frontend
- GitHub som kilde-repo
- Domenenavn
- Stripe-betalinger (egne nøkler, ikke Lovable)
- Brreg API-kall (offentlig, ingen auth)
- Brukerdata, artikler, alle tabeller

---

## 10. Kostnadssammenligning (estimat)

Per måned, antar moderat trafikk:

| Komponent | Lovable Cloud | Egen Supabase + OpenRouter |
|---|---|---|
| Database + auth + storage | Inkludert i Lovable | Supabase Pro $25/mnd |
| Edge functions | Inkludert | Inkludert i Supabase Pro |
| AI-kall (Gemini Flash) | Inkludert (uklar grense) | OpenRouter $5-20/mnd |
| **Totalt** | Lovable-pris | **$30-45/mnd** |

Bytt til Supabase Free tier (under 500MB DB) hvis trafikken er lav: ~$5-20/mnd totalt.

---

## 11. Vurdering

**Hvis du vil ha full uavhengighet og kontroll:** Gjør Fase 1 → Fase 2 A → Fase 3. Tar 1-2 uker spredt over kvelder/helger.

**Hvis du primært bekymrer deg om AI-vendor lock-in:** Gjør kun Fase 1. Tar 1-2 dager. Du har fortsatt Lovable Cloud men kan bytte AI uten kode-rewrite.

**Hvis du tenker langsiktig vekst:** Begynn med Fase 1 nå, planlegg Fase 2-3 i et roligere kvartal. Du vinner ikke noe på å rive alt ned på én gang.

---

*Dokumentert av Claude Code, 2026-05-21.*
