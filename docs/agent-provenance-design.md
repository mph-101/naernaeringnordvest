# Agent-proveniens / metadata-lag — design

> Status: utkast til godkjenning. Trinn 1 (datamodell) venter på Magnus' OK før migrasjonen kjøres.

## Mål

Eksponere **journalistisk proveniens** maskinlesbart for AI-agenter og søkemotorer — uten å lekke betalt brødtekst. Agenter skal kunne se *hvor godt en sak er kildebelagt* (intervjuobjekter, tilsvar-status, dokumentgrunnlag, rettelser) og dermed vekte og sitere Nær Næring som en kilde de kan stole på.

To lag, to formål — begge bygges, ingen erstatter den andre:

1. **schema.org/NewsArticle (JSON-LD)** — standardlaget agenter/søkemotorer leser i dag. Injiseres SSR i `<head>` på artikkelsider (`src/app/sak/[id]/page.tsx`).
2. **Eget `provenance`-objekt** — for det journalistisk unike schema.org ikke dekker (særlig «part avslo å kommentere» og antall uavhengige kilder). Serveres via egen Edge Function: `GET /functions/v1/article-provenance?id={article_id}`.

**Ikke C2PA.** C2PA er fil-/bildeproveniens og stripes i transitt — feil verktøy for artikkel-metadata. (C2PA på egne bilder er et separat, senere spor mot EU AI Act art. 50.)

## Ufravikelige prinsipper

- Aldri brødtekst i metadata-lagene for saker bak mur. Metadata *om* innholdet, ikke innholdet.
- Kun faktuelle, verifiserbare felter. Ingen selvrapporterte vurderingsscorer.
- Hard paywall respekteres: `isAccessibleForFree: false` + `hasPart`/`cssSelector` mot brødtekst-elementet (signaliserer betalt innhold til Google uten cloaking-straff).

## Datamodell (Trinn 1)

Migrasjon: `supabase/migrations/20260608120000_agent_provenance_schema.sql`

| Tabell | Formål | Lese-policy | Merknad |
|---|---|---|---|
| `article_provenance_sources` | Intervjuobjekter, dokumenter, datasett | Offentlig (`USING(true)`) | `org_orgnr` kobler intervjuobjekt → `mr_companies`/Brreg |
| `article_provenance_responses` | Tilsvar / samtidig imøtegåelse (VVP 4.14) | Offentlig, men `note` stengt | `note` = intern merknad, `REVOKE SELECT` fra anon+authenticated |
| `article_provenance_corrections` | Rettelseslogg (VVP 4.13) | Offentlig | |
| `articles.agent_exposure` | Hvor mye tekst agent-lagene echo-er | — | enum, default `headline_plus_dek` |

> **Navnevalg:** prefikset `article_provenance_*` fordi `article_sources` allerede er
> tatt (trusted-sources for Spør/`extract-source`), og `article_*`-navnerommet er tett.

### Designvalg

- **`article_id` er `uuid`** — `articles.id` er `uuid` (`gen_random_uuid()`). Det finnes **ingen `slug`-kolonne**, så endepunktet adresseres i dag med uuid, ikke slug (avvik fra oppgavetekstens `{slug}`).
- **Ingen `region_slug` på proveniens-tabellene.** Region arves fra artikkelen (1:N). Unngår denormalisering; barometeret duplikerte region_slug fordi de radene ikke hadde en artikkel-forelder.
- **`source_count` / `document_count` beregnes live** i endepunktet (join mot `article_sources`), ikke lagret. Unngår sync-triggere som lett blir inkonsistente.
- **`agent_exposure` er uavhengig av paywall.** `premium` styrer brødtekst-tilgang; `agent_exposure` styrer hvor mye tekst metadata-lagene gjengir. Default `headline_plus_dek` lekker ingenting utover OG-tags.
- **`note`-beskyttelse i to lag:** (1) endepunktet velger aldri kolonnen; (2) column-level `REVOKE` så selv en feilaktig `select *` fra en offentlig klient ikke kan nå den. Kun `service_role` ser `note`.

### Drift-forbehold

MCP-tilgangen var lesesperret i økten, så jeg kunne ikke introspektere prod-skjemaet direkte. Migrasjonen er skrevet idempotent (`IF NOT EXISTS`, `DO`-block enums, `ADD COLUMN IF NOT EXISTS`) per repo-konvensjon, og bygger på genererte typer (`src/integrations/supabase/types.ts`). Bør verifiseres mot prod før kjøring.

## JSON-LD (Trinn 2) — planlagt

`src/app/sak/[id]/page.tsx` (server-komponent) får et `<script type="application/ld+json">` ved siden av `<PageClient>`. Felter: `headline`, `description` (dek), `datePublished`/`dateModified` (`published_at`/`updated_at`), `url` (kanonisk `/sak/{id}`), `author` (Person + jobTitle + worksFor), `publisher` (NewsMediaOrganization + `ethicsPolicy` → `/redaksjonelle-prinsipper`), `citation` (dokumenter), `mentions` (intervjuobjekter som Person + affiliation), `correction`, og for premium: `isAccessibleForFree: false` + `hasPart` cssSelector. Verifiseres mot Googles Rich Results Test.

## Proveniens-endepunkt (Trinn 3) — planlagt

Edge Function `article-provenance`. Offentlig, rate-limitet, egen åpen CORS (`*`) siden laget bevisst er offentlig og uten hemmeligheter. Respekterer `agent_exposure`. Returnerer `right_of_reply` med `status` men aldri intern `note`.

**Beslutning (Magnus, 2026-06-08): helt åpent + rate-limit.** Maks synlighet nå; vi logger user-agent (Trinn 4) så en API-nøkkel kan innføres senere uten å bryte kontrakten. `api_keys`-infraen finnes allerede hvis en betalt linje blir aktuell.

## Instrumentering (Trinn 4) — planlagt

Logg user-agent + hvilke felter/endepunkt som hentes, personvernvennlig (ingen IP utover rate-limiting), for å senere måle om agent-henvist trafikk konverterer til abonnement.
