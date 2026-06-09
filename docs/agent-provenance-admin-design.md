# Agent-proveniens — admin-UI (design)

> Status: utkast til godkjenning. Ingen kode skrevet før Magnus' OK (CLAUDE.md:
> store ting → designnotat → godkjenning). Bygger på `docs/agent-provenance-design.md`.

## Mål

Gi redaksjonen en inngang i artikkeleditoren for å fylle inn proveniens-dataene
de tre lese-lagene allerede serverer tomt i dag: **intervjuobjekter/kilder**,
**tilsvar-status** og **rettelser** — pluss å sette **`agent_exposure`** per sak.

Når dette er på plass går JSON-LD-en (`mentions`/`citation`/`correction`) og
`/article-provenance`-endepunktet fra tomme til fylte for sakene redaksjonen
faktisk kildemerker.

## Hvor det lever

`ArticleEditor.tsx` er 2341 linjer og flagget som skjør (CLAUDE.md). For å ikke
vokse monolitten med UI- og lagringslogikk:

1. **`ArticleProvenancePanel.tsx`** (ny) — ren presentasjonskomponent, en
   `CollapsibleSection` («Proveniens (for agenter)») i editorens høyre kolonne,
   ved siden av «Metadata»/«Hovedbilde». Tar `value` + `onChange`-callbacks, ingen
   egen IO. Tre under-seksjoner + eksponeringsvelger.
2. **`useArticleProvenance(articleId)`** (ny hook) — eier state (de tre rad-listene),
   laster ved redigering, og eksponerer `save(articleId)` som gjør delete-så-insert.
   Holder all logikk UTE av `ArticleEditor`; monolitten får kun tre linjer:
   instansiér hooken, render panelet, og kall `provenance.save(id)` i `handleSave`.

Dette speiler nøyaktig det eksisterende `companyTags`-mønsteret (last ved edit,
delete+insert ved lagring i begge baner: ny artikkel og oppdatering), men pakket
i en hook så `ArticleEditor` ikke svulmer.

`agent_exposure` er en kolonne på `articles`, så den foldes inn i det vanlige
`form`/`updateForm`-løpet og lagres med artikkelen — ikke via barnerad-løpet.

## Seksjonene i panelet

### 1. Kilder (`article_provenance_sources`)
Liste med rad-editor. Per rad:
- `kind`: intervju / dokument / datasett (select)
- `name` (påkrevd), `role`, `org`, `doc_type` (vis `doc_type` kun for dokument)
- `org_orgnr`: **gjenbruk `brreg-proxy`-søket** som allerede driver firma-taggene
  (skriv firmanavn → velg → orgnr fylles). Kobler intervjuobjekt til
  næringslivsdatabasen. Valgfritt; fritekst-org uten orgnr er lov.
- Drag-håndtak / opp-ned for `sort_order` (samme som faktabokser).

### 2. Tilsvar (`article_provenance_responses`)
Liste med rad-editor. Per rad:
- `party_name` (påkrevd), `party_role`
- `status`: svarte / avslo / svarte ikke / ikke relevant (select)
- `note`: **intern merknad** — fritekst. Tydelig merket «Intern — vises aldri
  offentlig». (Skrives via authenticated-klient; RLS-skrivepolicyen tillater det
  for redaksjonelle roller. Tilbakelesing av `note` er et eget, senere spor via
  service-role — se åpent punkt under.)

### 3. Rettelser (`article_provenance_corrections`)
Liste med rad-editor. Per rad: `corrected_at` (dato) + `summary` (påkrevd).
Append-orientert; sjelden redigering.

### Eksponeringsvelger (`articles.agent_exposure`)
Radio/select: «Kun tittel» / «Tittel + ingress» (default) / «Sammendrag».
Kort hjelpetekst om hva agenter da får se.

## Datflyt

- **Last (ved redigering):** hooken henter de tre rad-settene på `articleId`
  (som linje ~420 henter `article_company_tags`). Ny artikkel → tomme lister.
- **Lagre:** `provenance.save(id)` kjøres i `handleSave` etter at artikkel-id finnes
  (insert-bane: etter `inserted.id`; update-bane: med eksisterende id). Per tabell:
  `delete().eq("article_id", id)` så `insert(rows)` — atomisk-nok og idempotent,
  identisk med `article_tags`-mønsteret.
- **RLS:** «Staff can manage»-policyene finnes allerede (lag 1-migrasjonen). Ingen
  nye policyer. Authenticated journalist/redaktør/admin skriver direkte.

## Sikkerhet / prinsipper

- `note` skrives, men leses aldri tilbake offentlig (column-REVOKE i prod). I admin
  vises det redaksjonen selv skriver inn i økten; tilbakelesing ved senere redigering
  krever service-role (åpent punkt). Ingen brødtekst lagres i proveniens-feltene.
- Kun faktuelle felter (samme prinsipp som datamodellen) — ingen vurderingsscorer.

## Bevisst UTENFOR scope (egne senere spor)

- Service-role-vei for å lese `note` tilbake ved redigering (admin-EF).
- AI-assistert uttrekk av kilder/tilsvar fra brødteksten (det finnes allerede
  `extract-source`/`AIDraftFromSourcesButton` — kan kobles på senere).
- «Publisert av X / sist endret av Y»-revisjonsspor (det er Fase 4.3 / redaktørplakat).

## Beslutninger (Magnus, 2026-06-09)

1. **`note`-tilbakelesing: ja, med en gang.** Lag en service-role admin-EF
   (`provenance-admin-notes` el.l.) som verifiserer redaksjonell rolle og leser
   `note` tilbake, så merknader vises ved redigering. +1 edge function (auth-mønster
   fra `admin-create-user`) + deno-test.
2. **Plassering: `CollapsibleSection` i høyre kolonne.** Samme mønster som «Metadata».
3. **Soft-advarsel i `PrePublishChecklist`.** Nudge («mangler kilder/tilsvar-status»)
   uten å blokkere publisering.

## Revidert omfang / PR-strategi

Beslutning 1 og 3 utvider scope noe. For å holde PR-ene i gullsonen og isolere den
skjøre `ArticleEditor`-innkoblingen, bygges det i denne rekkefølgen, med checkpoint:

- **Slice A (kjernen):** `useArticleProvenance`-hook + `provenance-admin-notes`-EF
  (note-tilbakelesing) + `ArticleProvenancePanel` + innkobling i `ArticleEditor`.
- **Slice B:** soft-advarsel i `PrePublishChecklist`.

Avgjør ved checkpoint om A og B blir én eller to PR-er, avhengig av linjeantall.

## Testing

- Hook-logikken (bygg lagrings-payload, diff mot lastet state) er ren → vitest.
- Manuell: legg inn kilder/tilsvar/rettelse på en testsak → lagre → verifiser at
  `/article-provenance?id=...` og JSON-LD nå returnerer dem.

## Estimat

~1 PR i gullsonen: ny komponent (~200 l) + hook (~120 l) + tre små innkoblinger i
`ArticleEditor` + en vitest. Ingen migrasjon, ingen nye avhengigheter, ingen RLS-endring.
