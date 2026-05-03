## Problem

To relaterte issues med bildevisning:

1. **Artikkel-hero er for lav**: `h-48 md:h-64 lg:h-72` (192/256/288 px) — for trangt for 16:9-bilder, og parallax bruker `scale(1.15)` som zoomer ekstra inn.
2. **Bildeutsnitt på front zoomer for tett**: `cropToObjectPosition()` i `src/lib/image-crop.ts` bruker bare focal point / crop-senter som `object-position`, men ignorerer crop-rektangelets størrelse. Når en redaktør lager et tett crop (f.eks. 30% av bildet), brukes hele originalbildet som `background-size: cover` med kun en posisjons-justering — så crop-en gjenspeiles ikke i hvor mye av bildet som vises. I praksis blir bildet bare panorert, ikke beskåret/zoomet.

## Løsning

### 1. Øk hero-høyden i `src/pages/Article.tsx` (linje 196, 199)
- Endre fra `h-48 md:h-64 lg:h-72` til `h-64 md:h-[420px] lg:h-[520px]`.
- Reduser parallax-zoom fra `scale(1.15)` til `scale(1.08)` så ansikter ikke kuttes.

### 2. Forbedre `cropToObjectPosition` til ekte crop-emulering
Bruk crop-rektangelet til å beregne både `object-position` OG `background-size`, slik at et tett crop faktisk zoomer/beskjærer riktig del av bildet.

Algoritme (når `crop` finnes):
- `bgWidth  = 100 / (crop.width  / 100)` → 100/(0.3) = 333% hvis crop er 30% bredt
- `bgHeight = 100 / (crop.height / 100)`
- `posX = crop.x / (100 - crop.width)  * 100` (samme for Y) — flytter crop-vinduet til synlig område
- Returner både string for position og size

Endre signatur eller legg til en ny helper:
```ts
export function cropToBackgroundStyle(crop, focal): { position: string; size: string }
```
Beholder `cropToObjectPosition` for bakoverkompatibilitet (focal-only bruk), men bruker den nye i:
- `src/pages/Article.tsx` (hero)
- `src/components/NewsFeed.tsx` (featured + grid-kort)
- `src/components/admin/ArticlePreviewDialog.tsx`
- `src/components/admin/ImageCropDialog.tsx` (preview)

For container med ulikt aspekt enn crop-rektangelet brukes `background-size: cover`-prinsipp på det virtuelle "crop-vinduet": vi bruker `max(bgWidth, bgHeight * containerRatio / cropRatio)` — men siden vi ikke kjenner container-ratio i CSS uten JS, bruker vi den enkle og tryggere varianten:
- `background-size: {100/cropW*100}% {100/cropH*100}%` 
- `background-position: {posX}% {posY}%`

Dette gir riktig "zoom-inn" på crop-rektangelet. Mindre passende ved aspekt-mismatch, men bedre enn dagens oppførsel.

### 3. Verifisering
Ingen DB-endringer. Testes visuelt på `/` (front) og en artikkel der bilde har trangt crop.

## Filer som endres
- `src/lib/image-crop.ts` — ny `cropToBackgroundStyle` helper
- `src/pages/Article.tsx` — større hero, mindre parallax-skalering, bruk ny helper
- `src/components/NewsFeed.tsx` — bruk ny helper for både featured og grid
- `src/components/admin/ArticlePreviewDialog.tsx` — bruk ny helper
- `src/components/admin/ImageCropDialog.tsx` — bruk ny helper i preview
