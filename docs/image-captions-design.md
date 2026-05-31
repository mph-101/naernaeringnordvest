# Designnotat: Bildetekst og foto-byline i artikler

Status: **Venter på godkjenning fra Magnus** (skjemaendring + inline-format)
Dato: 2026-05-31

## Mål

Vise bildetekst ("bildetekst") og foto-byline ("Foto: …") både på toppbildet og
på inline-bilder i brødteksten. Standard visning er **avkortet** (én linje, …),
med en "vis mer"-knapp som utvider til full bildetekst + byline.

## Beslutninger fra Magnus (avklart)

1. **Delvis visning**: Avkortet tekst på én linje med "vis mer"/"vis mindre".
2. **Omfang**: Både toppbilde og inline-bilder nå.
3. **Datakilde toppbilde**: Hentes fra `media_assets` ved valg, men kan
   **overstyres per artikkel** uten at endringen skrives tilbake til
   `media_assets` (arkivet forblir uendret).

## Datamodell

### Toppbilde — nye kolonner på `articles` (KREVER MIGRASJON)

```sql
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS image_caption text,
  ADD COLUMN IF NOT EXISTS image_credit  text,
  ADD COLUMN IF NOT EXISTS image_source  text;
```

- Fylles automatisk fra `media_assets` (caption / photographer / source) når et
  bilde lastes opp eller velges fra arkivet i editoren — via den eksisterende
  `onUploadWithMeta`-callbacken i `ImageUpload`.
- Redaktøren kan deretter redigere feltene fritt i artikkelen. Lagres kun på
  `articles`, aldri tilbake til `media_assets`.
- Eksisterende artikler får `NULL` → faller tilbake til oppslag mot
  `media_assets.public_url = articles.image_url` ved visning, så gamle artikler
  med arkiverte bilder fortsatt viser tekst.

**RLS**: Ingen ny policy nødvendig. Kolonnene arver `articles` sine eksisterende
policies (samme som title/excerpt/body). Ingen sensitiv data.

### Inline-bilder — lagres i body-HTML (INGEN migrasjon)

Inline-bilder ligger allerede i `articles.body` som ren HTML. Vi bytter fra
`<img>` til semantisk `<figure>` med data-attributter:

```html
<figure data-nn-image="true"
        data-caption="Bildetekst her"
        data-credit="Ola Nordmann"
        data-source="NTB">
  <img src="…" alt="…" />
</figure>
```

Rendres av `ArticleBody` (samme segment-splitting som charts/source-cards
allerede bruker) til en `<figure>` med toggle-bar `<figcaption>`.

## Frontend

- **Ny delt komponent** `ImageCaption.tsx`: tar `caption`, `credit`, `source`,
  viser avkortet linje + "vis mer"-toggle. Gjenbrukes av toppbilde, inline-bilder
  og kan senere erstatte galleri-figcaption.
- **`Article.tsx`**: figcaption under hero-bildet (henter override-kolonner med
  fallback til media_assets-oppslag).
- **`ArticleBody.tsx`**: gjenkjenner `<figure data-nn-image>` og rendrer bilde +
  `ImageCaption`.
- **`ArticleEditor.tsx`**: `handleInsertImage` åpner en liten dialog (gjenbruker
  metadata-mønsteret fra `ImageUpload`) for å fange bildetekst/foto ved
  innsetting, og skriver `<figure>`-markup. Toppbilde-feltene blir redigerbare i
  meta-panelet.

## Det jeg trenger go på

1. De tre nye kolonnene på `articles` (over).
2. `<figure data-nn-image>`-formatet for inline-bilder.

Når dette er godkjent skriver jeg migrasjonen (ny datostemplet fil, rører ingen
eksisterende migrasjon) + frontend-endringene.
```
