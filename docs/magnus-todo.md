# Magnus — handlinger utenfor kode

Ting som krever din handling i dashboards / secrets / DB, utenfor det Claude kan gjøre.

## Åpne

### Bildetekst-funksjon (2026-05-31) — KRITISK før deploy
- **Kjør migrasjonen `supabase/migrations/20260531120000_article_image_caption.sql`** mot prod.
  Claude fikk `permission denied` via MCP-tokenet og kunne ikke kjøre den selv.
  Den legger til `image_caption`, `image_credit`, `image_source` på `articles`.
- **Hvorfor kritisk:** Artikkel-editoren skriver nå disse tre feltene ved hver
  lagring. Uten kolonnene vil **all artikkellagring feile** ("column does not
  exist"). Migrasjonen MÅ kjøres før (eller samtidig som) frontend-koden går live.
- `src/integrations/supabase/types.ts` er allerede manuelt oppdatert til å matche
  migrasjonen. Når du kjører `supabase gen types` neste gang blir den uansett lik.
