## Mål

Tre nye funksjoner for å øke engasjement:
1. **Forside-meningsmåling** styrt fra CMS — gjennomsnitt vises etter eget svar
2. **Artikkel-handlinger** under hver artikkel: Notat, Del, Kontakt journalist
3. **Maskot-guide** ved første innlogging — animert kompass, kan skrus av/på

---

## 1) Meningsmåling på front

### Database
Ny tabell `polls`:
- `question` (text), `description` (text, valgfri)
- `options` (jsonb: `[{ id, label }]`, 2–5 valg)
- `active` (bool), `starts_at`, `ends_at` (timestamptz) — én aktiv om gangen via "siste publiserte mellom datoer"
- `created_by` (uuid), standard timestamps

Ny tabell `poll_votes`:
- `poll_id`, `option_id`, `user_id` (nullable), `session_id` (text — for utloggede)
- Unik constraint per `(poll_id, user_id)` og `(poll_id, session_id)` slik at man ikke kan stemme to ganger
- RLS: alle kan `INSERT`, kun egen `SELECT` — aggregater hentes via SQL-funksjon

Ny SQL-funksjon `poll_results(_poll_id uuid)` (SECURITY DEFINER):
- Returnerer `option_id, votes, percent` for alle valg
- Også `current_user_choice(_poll_id uuid)` for å lese egen stemme

### Admin
Nytt menypunkt "Meningsmåling" i `AdminDashboard` (`PollsManager.tsx`):
- Liste over polls, opprett/rediger/arkiver
- Felter: spørsmål, beskrivelse, 2–5 svaralternativ, aktiv-toggle, periode (forhåndsvalg "neste 7 dager")
- Påminnelse: "Aktuelt spørsmål minst en gang i uken" — vis advarsel hvis ingen aktiv poll løper neste 7 dager

### Frontend
Ny komponent `FrontpagePoll.tsx` plassert øverst på `/` (under hero, over feed):
- Henter aktiv poll (`active=true` AND `now()` mellom `starts_at`/`ends_at`)
- Før stemme: viser spørsmål + alternativer som klikkbare kort
- Etter stemme: viser stolper med prosent + totalt antall stemmer, eget valg uthevet
- Lokal `localStorage`-cache av session_id for utloggede + serversynk

---

## 2) Engasjements-handlinger under artikkel

Ny komponent `ArticleEngagementBar.tsx` rendres i `Article.tsx` like under brødteksten (over "Relaterte artikler"):
- Tre kort i grid (1 kol mobil, 3 kol desktop), Scandinavian rounded-2xl-stil:
  1. **Skriv et notat** — åpner eksisterende `ArticleNotes` FAB-dialog direkte
  2. **Del artikkelen** — Web Share API + fallback til kopier-lenke + LinkedIn/X knapper
  3. **Kontakt journalisten** — åpner sheet/dialog med skjema (gjenbruker `TipForm`-mønster, men adressert til artikkelens `author`/`created_by`)

Hver handling logges til `user_events` for analyse (`event_type = 'engagement_*'`).

For "Kontakt journalist": ny tabell `journalist_messages` med `article_id`, `journalist_id`, `from_user_id`, `from_email`, `body`, `created_at`. RLS: bruker ser egne; journalist+admin ser sine. Vises i admin under et nytt "Meldinger"-panel (kan ev. legges senere).

---

## 3) Kompass-maskot guide

### Maskot (visuell)
Ny `CompassMascot.tsx` — SVG basert på eksisterende kompassikon:
- Roterende nål med subtil "puste"-animasjon (CSS keyframes: `rotate` + `scale`)
- Reagerer på hover/klikk (nålen peker mot markøren)
- To størrelser: full (guide) og mini (floating-knapp)
- Bruker semantic tokens (peach/dusty rose) — ingen hardkodede farger

### Onboarding-tour
Ny `MascotTour.tsx` — overlay som guider gjennom:
1. Toppmeny (Spør / Utforsk / Tall)
2. Søk på forsiden
3. Meningsmåling
4. Artikkel-handlinger (vises kun ved første artikkelbesøk)
5. Profil-snarvei

Bruker en lett egen-implementasjon (ingen ekstra lib): et fast positionert kort + en spotlight-overlay som peker mot et `data-tour="..."`-element. Maskoten "hopper" mellom stegene.

### Av/på
- `profiles.mascot_enabled` (bool, default true) — migrering legger kolonnen til
- Floating mini-maskot nederst-høyre når aktiv; klikk → restarter tour
- Kan skrus av i `ProfileEditor` under "UI-innstillinger" (eksisterende seksjon)
- Ved første pålogging: tour starter automatisk hvis `mascot_enabled = true` AND `profiles.tour_completed_at IS NULL`
- "Skip tour"-knapp setter `tour_completed_at = now()`

---

## Filer

### Database (én migrasjon)
- Tabeller: `polls`, `poll_votes`, `journalist_messages`
- Kolonner: `profiles.mascot_enabled`, `profiles.tour_completed_at`
- Funksjoner: `poll_results`, `poll_user_choice`
- RLS-policyer på alle nye tabeller

### Nye komponenter
- `src/components/FrontpagePoll.tsx`
- `src/components/ArticleEngagementBar.tsx`
- `src/components/JournalistContactDialog.tsx`
- `src/components/mascot/CompassMascot.tsx`
- `src/components/mascot/MascotTour.tsx`
- `src/components/mascot/useMascotTour.tsx` (hook for state + steg)
- `src/components/admin/PollsManager.tsx`

### Endrede filer
- `src/pages/Index.tsx` — montere `FrontpagePoll` + `data-tour`-attributter
- `src/pages/Article.tsx` — montere `ArticleEngagementBar`
- `src/components/admin/AdminDashboard.tsx` — nytt menypunkt "Meningsmåling"
- `src/components/ProfileEditor.tsx` — av/på-bryter for maskot
- `src/App.tsx` — global `MascotTour`-mount

---

## Spørsmål før implementering

1. **Maskot-stil**: Vil du at maskoten skal ha "ansikt" (øyne på kompasshuset) eller bare en abstrakt animert nål?
2. **Kontakt-journalist**: Skal meldingen sendes som e-post (krever Resend), lagres i DB for journalist å lese inne i appen, eller begge?
3. **Poll-stemmer for utloggede**: Tillatt eller krever innlogging? (Anonymt gir flere svar, men kan manipuleres.)

Jeg implementerer alle tre i én leveranse når du svarer.
