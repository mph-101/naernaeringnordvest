# Designnotat — Bolk 4: håndhev «kun mennesker publiserer» + proveniens-aktør

**Dato:** 2026-07-07
**Status:** Venter på Magnus' godkjenning (RLS + ny RPC + skjemaendring + arkitektur/forretningsregel → forelegges per CLAUDE.md; dette er en redaksjonell beslutning, ikke bare teknisk)
**Opphav:** Code review 2026-07-06, arkitektur-funn. Verifisert mot prod.

Dette er den mest «forretnings»-tunge bolken. Jeg foreslår at vi diskuterer valgene under før jeg skriver migrasjon.

---

## Problem (verifisert mot prod)

Ingen kode hindrer en ikke-menneskelig sti fra å publisere:
1. **Publisering er kun rolle-gated.** `articles` UPDATE-policy i prod: `USING (has_role(admin) OR has_role(editor))`, ingen `WITH CHECK`, ingen skille mellom menneske og automatikk. Hvem/hva som helst med editor/admin-JWT (eller service-role, som bypasser RLS) kan sette `published=true` direkte.
2. **`canPublish`-checklisten er ren UI** (`ArticleEditor.tsx:157`). Selve skrivingen (`published: form.status === "published"`, `:505`) går via vanlig klient bundet kun av rolle-RLS — checklisten kan omgås med et rått UPDATE.
3. **Cron `auto-publish-scheduled-articles`** (verifisert live i prod, hvert 5. min) kjører `UPDATE articles SET published=true` uten aktør ved publiseringstidspunktet.

Reglen holder *i praksis i dag* kun fordi ingen automatisk skriver finnes (`generate-article-draft` returnerer bare draft-JSON, publiserer aldri; `daily-edition`/`article-provenance` er read-only). Men koden forbyr det ikke.

Separat: proveniens-systemet registrerer redaksjonell proveniens (kilder/tilsvar/rettelser/`agent_exposure`), men **ikke hvem som bestilte/instruerte AI-arbeid** — ingen `ordered_by`/`instructed_by`-felt. Plattform-/avis-skillet er dermed dokumentert, ikke maskinlesbart håndhevet.

---

## Foreslått løsning

### 4a — `publish_article`-RPC (SECURITY DEFINER) som eneste publiseringsvei
Ny RPC som asserter menneskelig aktør + rolle + re-validerer publiseringskrav server-side:
```sql
create or replace function public.publish_article(_article_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  -- Human gate: service_role has no auth.uid(); an automated/edge path calling
  -- with the service key would have uid IS NULL and is rejected here.
  if uid is null then raise exception 'publish requires an authenticated human user'; end if;
  if not (public.has_role(uid,'admin') or public.has_role(uid,'editor')) then
    raise exception 'insufficient role to publish';
  end if;
  -- Server-side re-check of the pre-publish checklist invariants (e.g. hovedredaksjon
  -- satt, tittel/ingress finnes). Mirror PrePublishChecklist's blocking rules.
  perform 1 from public.articles a
    where a.id = _article_id and a.region_slug is not null /* + øvrige krav */;
  if not found then raise exception 'pre-publish checklist not satisfied'; end if;

  update public.articles
     set published = true, status = 'published', published_at = coalesce(published_at, now())
   where id = _article_id;
end $$;
```
Og stram `articles` UPDATE-RLS med et `WITH CHECK` som forbyr en klient å sette `published=true` direkte (tving publisering gjennom RPC-en):
```sql
-- Client UPDATEs may not flip an article to published; that must go through
-- publish_article(). Editors can still edit drafts and unpublish.
alter policy "Admins can update articles" on public.articles
  with check (
    (has_role(auth.uid(),'admin') or has_role(auth.uid(),'editor'))
    and published = false            -- direct client writes keep published=false
  );
```
`ArticleEditor` kaller `supabase.rpc('publish_article', { _article_id })` for publiseringsovergangen i stedet for et rått `update({ published: true })`. Utkast-lagring (published=false) går som før.

**Beslutning:** `WITH CHECK (... published = false)` betyr at ALL publisering må gå via RPC, også avpublisering/re-publisering. Dette er en atferdsendring i admin-flyten. Alternativ (mykere): behold rå UPDATE for editors, men legg kun til human-gate på scheduled/AI-stier. Anbefaling: RPC-veien (sterkest garanti), men den krever at jeg oppdaterer alle publiseringskall i `ArticleEditor` + evt. `ArticlesList` (hurtig-publiser).

### 4b — Scheduled publish beholder cron, men logger aktør
`scheduled_publish_at` settes av et menneske (verifisert: ProfileEditor/ArticleEditor). Cron-en publiserer på timer. Behold cron, men:
- Krev at `scheduled_publish_at` kun kan settes via en RPC/klient med menneskelig `auth.uid()` (samme WITH CHECK-mønster), og
- logg hvilken aktør som planla (ny kolonne `scheduled_by uuid` på `articles`, satt ved planlegging). Da er «et menneske besluttet publisering» sporbart selv om selve flippen er automatisk.

### 4c — Proveniens: registrer «bestilt av»
- Ny kolonne `ordered_by uuid` (FK → auth.users) på AI-draft-relaterte proveniens-rader, ELLER en `agent_runs`-logg som knytter hver `generate-*`-invokasjon til den verifiserte kalleren.
- `generate-article-draft` (og øvrige `generate-*`) legger til caller-verifisering (jf. `admin-create-user`-mønsteret: userClient fra Authorization → `getUser()` → `has_role`) og lagrer `user.id` som «ordered_by». Dette lukker også bolk 3-relatert funn om at `generate-article-draft` mangler rollesjekk (enhver innlogget bruker kan brenne AI-kreditt).

---

## Hva dette krever av deg (beslutninger før kode)
1. **RPC-vei vs. myk human-gate** for publisering (4a) — hvor strengt?
2. **Ny kolonne `scheduled_by`** (4b) og **`ordered_by`/`agent_runs`** (4c) — OK å legge til skjema? (Skjemaendring → din godkjenning.)
3. **Omfang av server-side checklist-revalidering** — hvilke av `PrePublishChecklist`-punktene skal være *blokkerende* i RPC-en (hovedredaksjon er allerede blokkerende i UI, jf. #129)?

## Testplan
- RPC: test at service-role-kall (uid null) avvises; at editor uten oppfylt checklist avvises; at gyldig editor publiserer.
- RLS: test at rått `update({published:true})` fra klient avvises av WITH CHECK.
- `generate-article-draft`: test at reader-JWT avvises, editor slipper gjennom, `ordered_by` lagres.
- eslint + vitest + deno check grønt.
