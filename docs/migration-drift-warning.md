# ⚠️ Migrasjonsdrift: repo ≠ prod

> Oppdaget 2026-06-03 under sikkerhetsgjennomgangen. Dette er en operasjonell
> advarsel, ikke en kodeoppgave med én fiks. Les før du stoler på en
> migrasjonsfil som fasit for prod-skjemaet.

## Hva som er galt

Filene i `supabase/migrations/` reflekterer **ikke** lenger faktisk tilstand i
prod-databasen (`oemzrhlybemakwpyhcno`). Prod ble re-baselined **2026-05-26** til
en serie `step24_extensions … step35_data_*`-migrasjoner med egne navn og
timestamps, og kjørt videre med noen få inkrementelle etterpå. De lokale
filnavnene/timestampene (f.eks. `20260424093724_f95d04d7…`,
`20260601120100_add_scheduled_publish`) matcher ikke prods historikk
(`20260601093042 add_scheduled_publish`).

Prod-historikk per 2026-06-03 (fra `list_migrations`):

```
20260526101717 step24_extensions  …  20260526194840 step35_data_list_items_votes_members_tips
20260528090607 storage_objects_rls_policies
20260529221712 jobbytte_incremental_state
20260531185935 add_tip_status_and_reviewer
20260601093041 fix_duplicate_tag_notifications
20260601093042 add_scheduled_publish
20260601093050 schedule_auto_publish_cron
20260602092758 yjs_collab_infrastructure
```

## Konkret bevis (hvorfor dette betyr noe)

`article_views`-UPDATE-policyen ble lest som usikker i en migrasjonsfil:

```sql
-- supabase/migrations/20260417082616_…sql  (STALE — ikke prod)
CREATE POLICY "Anyone can update own session view"
  ON public.article_views FOR UPDATE
  USING (true) WITH CHECK (true);
```

Men faktisk policy i prod (verifisert med `pg_policies`) er korrekt avgrenset:

```
"Users can update own recent view" (UPDATE)
  auth.uid() IS NOT NULL AND user_id = auth.uid()
  AND viewed_at > now() - interval '2 hours'
```

Også INSERT-policyen i prod er strengere enn fila (validerer `session_id`- og
`article_id`-lengde). En review som kun leser migrasjonsfiler ville altså
konkludert med et sikkerhetshull som ikke finnes — det skjedde for funn #3 i
2026-06-03-gjennomgangen (PR #99, lukket).

## Konsekvenser

1. **Ikke stol på `supabase/migrations/*.sql` som fasit for prod-skjema.** Verifiser
   mot levende database (`pg_policies`, `pg_get_functiondef`, `list_tables`) før
   du konkluderer om RLS, policies eller funksjoner.
2. **`supabase db push` er utrygt akkurat nå** — lokal historikk og prods historikk
   er ikke samme sett. Push kan prøve å re-kjøre eller feile. Migrasjoner kjøres
   i praksis manuelt (SQL Editor / dashboard).
3. `DROP POLICY IF EXISTS "<navn>"` kan no-op-e stille hvis prod-navnet er et
   annet enn i fila — sjekk alltid det faktiske policy-navnet først.

## Anbefalt oppfølging (egen jobb, krever Magnus)

- Forson historikken: enten `supabase db pull` mot prod for å regenerere en
  baseline som matcher virkeligheten, eller ta en `pg_dump --schema-only` og
  sjekk inn som ny baseline. Mål: én sann kilde igjen.
- Vurder en CI-sjekk som diff-er lokalt skjema mot prod og varsler ved drift.
- Inntil dette er gjort: behandle hver migrasjonsfil eldre enn 2026-05-26 som
  potensielt utdatert.

## Hva som IKKE er berørt av driften

Funn #1 og #2 fra 2026-06-03-gjennomgangen bygger på edge-function-**kode**
(`create-checkout`, `check-article-access`, `payments-webhook`), som deployes fra
repoet — ikke på migrasjonsfiler. `has_active_subscription` ble dessuten verifisert
mot prod og matcher repoet eksakt. Kun funn #3 (RLS lest fra migrasjonsfil) var feil.
