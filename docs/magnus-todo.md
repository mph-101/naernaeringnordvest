# Magnus-todo

## Etter merge av 1.5
- [ ] Vurder å rotere `VITE_SUPABASE_PUBLISHABLE_KEY` i Supabase dashboard (ikke hemmelig, men god praksis)

## Lyd-først-modus (lagt til 2026-05-18)

- [ ] Aktivér ElevenLabs-abonnement (Pro-plan ~$22/mnd for Instant Voice Cloning + 100k tegn/mnd)
- [ ] Legg `ELEVENLABS_API_KEY` inn som secret i Lovable Cloud
- [ ] Når nøkkelen er på plass: gå til Admin → Forfattere, åpne en forfatter, last opp 1–3 min ren tale under "Stemmeprofil (AI)" for å klone stemmen
- [ ] Test "Hør dagens utgave"-knappen på forsiden etter at minst én artikkel er publisert siste 36 t

Edge functions er allerede deployet og returnerer en tydelig "AUDIO_NOT_CONFIGURED"-melding inntil nøkkelen er satt — UI håndterer dette gracet.