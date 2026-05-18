
# Lyd først — dagsutgave med klonede journaliststemmer

En "podcast-modus" der hver artikkel introduseres av en AI-klonet versjon av forfatterens stemme. Brukeren får et 30–60 sek sammendrag per sak, kan trykke "les hele" for full opplesning, eller hoppe til neste sak. Spilleren ligger som flytende mini-bar i bunnen og kan skrus av i profil.

## Brukerflyt

1. På forsiden vises "🎧 Hør dagens utgave" CTA over feed.
2. Klikk → henter dagens publiserte saker i brukerens region, viser køen og starter avspilling.
3. For hver sak: kort jingle/innledning → sammendrag i forfatterens stemme → pause-prompt: "Les hele" / "Hopp over" / vent → neste.
4. Mini-spiller (a la Spotify) følger brukeren rundt i appen med play/pause, neste sak, framdriftsbar, lukk-knapp.
5. Egen `/lytt`-side med full kø-visning, kapittel-hopp, hastighet (1x/1.25x/1.5x/2x), artikkel-lenke per sak.
6. Profil → Innstillinger: toggle "Vis lyd-modus" (på/av). Avslått → CTA og mini-spiller skjules helt.

## Stemmekloning (admin)

- Ny seksjon i forfatter-admin (`AuthorsManager`): "Stemmeprofil"
  - Last opp 1–3 min ren tale (eksisterende `audio-uploads`-bøtte)
  - Knapp "Klon stemme" → edge function `clone-author-voice` → ElevenLabs Instant Voice Cloning API
  - Lagrer `elevenlabs_voice_id`, `voice_cloned_at`, `voice_sample_path` på `authors`
  - Preview-knapp tester stemmen med en standard frase
- Hvis forfatter mangler klonet stemme → fall tilbake til en standard redaksjonsstemme (konfigurerbar i admin-settings)

## Lyd-generering (on-demand, cached)

- Edge function `generate-article-audio` med input `{ article_id, mode: "summary" | "full" }`:
  1. Sjekk cache i ny tabell `article_audio` (`article_id`, `mode`, `voice_id`, `storage_path`, `duration_seconds`, `generated_at`). Hvis fersk (artikkel ikke endret etter `generated_at`), returner signed URL.
  2. Hvis `mode = summary`: kall Lovable AI (`google/gemini-3-flash-preview`) for å lage 60–90 ords muntlig sammendrag i nyhetsanker-tone, norsk.
  3. Hent forfatterens `elevenlabs_voice_id` (eller fallback).
  4. Kall ElevenLabs TTS (`eleven_multilingual_v2`, `mp3_44100_128`) → få MP3-buffer.
  5. Last opp til ny privat bucket `article-audio` med path `{article_id}/{mode}-{voice_id}.mp3`.
  6. Upsert rad i `article_audio`, returner signed URL (1 t gyldighet).
- Edge function `daily-edition` returnerer ordnet kø `{ articles: [{ id, title, author, summary_url, full_url_pending: true }] }` for dagens publiseringer i regionen. Full-versjoner genereres lazy når bruker velger "les hele".

## Frontend-komponenter

- `src/hooks/useAudioPlayer.tsx` — global player-context (kø, current, isPlaying, speed, skip, play/pause). Mountes i `App.tsx` rundt `Routes`.
- `src/components/audio/MiniPlayer.tsx` — sticky bottom-bar, vises når `audio_mode_enabled && queue.length > 0 && !on /lytt page`.
- `src/components/audio/DailyEditionCTA.tsx` — knapp på forside (i `Index.tsx` over `NewsFeed`).
- `src/pages/Lytt.tsx` — full kø-side med kapittel-liste, hastighetskontroll, "Les artikkelen"-lenke, "Les hele"-toggle per sak.
- Profil-innstilling: ny rad i `NotificationsSection.tsx` (eller egen `AudioSection.tsx`) som lagrer `audio_mode_enabled` på `profiles`.

## Database

Migrasjon legger til:
- `authors.elevenlabs_voice_id text`, `authors.voice_cloned_at timestamptz`, `authors.voice_sample_path text`
- `profiles.audio_mode_enabled boolean default true`
- Ny tabell `article_audio (id, article_id text, mode text check in ('summary','full'), voice_id text, storage_path text, duration_seconds int, generated_at timestamptz, region_slug text)` med unique på `(article_id, mode, voice_id)`
- Ny privat storage-bucket `article-audio` med RLS: SELECT for autentiserte brukere via signed URLs fra edge function (ingen direkte client read)
- RLS på `article_audio`: kun service role skriver; lesing skjer via edge function

## Avhengigheter / konfig

- **ElevenLabs**: kobles via `standard_connectors--connect` (connector_id `elevenlabs`). Bruker `ELEVENLABS_API_KEY` server-side i edge functions.
- **Kostnadsnotat til Magnus**: ElevenLabs Pro-plan (~$22/mnd) kreves for Instant Voice Cloning + 100k tegn/mnd. Logges i `docs/magnus-todo.md`.
- Feature flag `FEATURE_AUDIO_FIRST` i `src/lib/features.ts` så modulen kan skrus av globalt (gradvis utrulling, jf. CLAUDE.md fase 3.7).

## Tekniske detaljer

- Stream MP3 direkte til `<audio>`-elementet via signed URL (ingen base64-overføring).
- "Hopp over"-knapp i mini-spiller og `/lytt` kaller `player.next()`; stopper full-generering hvis den var i kø.
- Cache-invalidering: når artikkel oppdateres (`articles.updated_at` endres), slett tilhørende `article_audio`-rader via trigger i en senere iterasjon (fase 1: enkel sjekk `generated_at > articles.updated_at`).
- Analytikk: logg `audio_play_started`, `audio_segment_completed`, `audio_skipped` i eksisterende `user_events`-tabell for senere innsikt.

## Sikkerhet

- Edge functions validerer JWT (krever innlogget bruker for full lesning hvis artikkelen er gated; sammendrag følger samme gating-regel som teksten).
- Signed URLs kort gyldighet (1 t).
- Stemme-sample-opplasting kun for admin/editor-roller (RLS-sjekk i `clone-author-voice`).

## Leveranseplan

1. Migrasjon + ElevenLabs-tilkobling + feature flag
2. Edge functions `clone-author-voice`, `generate-article-audio`, `daily-edition`
3. Admin UI for stemmekloning i `AuthorsManager`
4. Global player-hook + `MiniPlayer` + profil-toggle
5. `/lytt`-side + forside-CTA
6. QA med Magnus (én ekte journaliststemme + 3 testartikler) før vi ruller ut bredere
