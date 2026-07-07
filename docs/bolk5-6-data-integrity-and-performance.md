# Designnotat — Bolk 5 (dataintegritet + RLS-rester) & Bolk 6 (ytelse)

**Dato:** 2026-07-07
**Status:** Venter på Magnus' godkjenning (RLS + skjema + indekser → migrasjoner forelegges per CLAUDE.md)
**Opphav:** Code review 2026-07-06. Alle DB-fakta verifisert mot prod (`oemzrhlybemakwpyhcno`).

Lavere alvorlighet enn bolk 1–4, men rydder de siste integritets- og ytelseshullene før launch. Kan kjøres som to PR-er (5 = korrekthet, 6 = ytelse) eller én «DB-hygiene»-PR.

---

## Bolk 5 — Dataintegritet & gjenstående RLS

### 5a — `subscriptions`: ingen «ett aktivt abonnement per bruker»-garanti (Medium)
- **Verifisert prod:** kun UNIQUE `(provider, provider_subscription_id)` + PK. Ingenting hindrer flere samtidige aktive rader per `user_id`.
- **Fix (om ønsket):** partial unique index `create unique index on subscriptions (user_id) where status in ('trialing','active','past_due');` ELLER dedup i webhook-upsert.
- **Beslutning:** ønskes én aktiv personlig sub per bruker? (Kan kollidere med legitime overganger — trenger din avklaring.)

### 5b — Business-seat: `seat_count` kan overskrides (Medium)
- **Verifisert prod:** `business_seats` har UNIQUE `(business_account_id, email)` (samme e-post dobles ikke), men ingen DB-binding mellom `count(seats)` og `business_accounts.seat_count`. `invite-business-seat` teller-så-inserter (TOCTOU) → to samtidige invitasjoner med ulike e-poster kan sprenge taket. Dessuten `listUsers({perPage:1000})` = O(alle brukere) og bommer forbi 1000.
- **Fix:** håndhev taket atomisk i en `SECURITY DEFINER`-RPC (`insert ... where (select count(*) ...) < seat_count`), og erstatt `listUsers`-scan med målrettet e-post-oppslag.

### 5c — Gjenstående RLS-mangler (Lav)
- **`notifications` UPDATE** håndhever ikke kolonne-immutabiliteten kommentaren lover — bruker kan skrive om `type`/`orgnr`/`payload` på egne rader. Enten fjern villedende kommentar, eller `BEFORE UPDATE`-trigger som kun tillater `read_at`.
- **`group_invitations` UPDATE** mangler `WITH CHECK` → gruppe-admin kan re-parente `group_id`. Legg matchende `WITH CHECK`.
- **`newsletter_subscriptions` INSERT `WITH CHECK true`** (prod-advisor) → anon kan innsette vilkårlige e-poster. Legg double-opt-in eller IP-hash-rate-limit.

---

## Bolk 6 — Ytelse (alt verifisert via prod-advisor + skjema)

### 6a — Manglende indekser (Medium)
- **13 uindekserte FK-er** — bl.a. `tips.reviewed_by`, `group_messages.group_id`, `group_messages.article_id`, `job_listings.employer_profile_id`, `articles.created_by`, `group_invitations.group_id`, `region_hidden_articles.hidden_by`. Legg dekkende indeks per FK.
- **`tips(status)`** mangler indeks — admin-badge kjører `count WHERE status='new'` på hver admin-last. `create index idx_tips_status on tips(status) where status='new';`
- **Feed-composite** — `where published=true order by published_at desc` har kun indeks på boolean `published` + `created_at`, ingen på `published_at`. `create index idx_articles_published_pubdate on articles (published_at desc) where published;`
- **`has_active_subscription` domene-match** — query er `where lower(email_domain)=...` men `idx_business_accounts_domain` er på rå `email_domain` → seq scan på auth-nær hot path. `create index ... on business_accounts (lower(email_domain)) where domain_verified_at is not null;`

### 6b — RLS init-plan (Medium)
- **192 `auth_rls_initplan`-policyer** re-evaluerer `auth.uid()`/`has_role()` per rad. Wrap som `(select auth.uid())` i policy-uttrykk (Supabase-anbefalt). Størst effekt: `events`, `article_comments`, `job_listings`, `articles`. Dette er mange policy-omskrivinger — egen fokusert PR, og bør verifiseres mot prod policy-for-policy pga. drift.

### 6c — Over-henting av `body` i lister (Medium, edge/frontend-kode)
- `NewsFeed.tsx:121`, `feed-api:155-157`, `article-data.ts PUBLISHED_ARTICLE_SELECT`, `jobs.ts fetchPublishedJobs` (`select("*")`) henter fullt `body`/`description_html` for kort-lister. Snevre inn liste-selects; hent full body kun på detalj-visning. (Bekreft om `feed-api` full body er tilsiktet API-kontrakt — se bolk 3b.)

### 6d — Ryddes IKKE nå
- **71 ubrukte indekser** — vent til trafikkmønster er bekreftet i drift; å droppe før launch er for tidlig. Kun noter.
- **140 `multiple_permissive_policies`** — konsolideres sammen med 6b hvis vi tar RLS-omskrivingen.

---

## Beslutninger du må ta
1. 5a: ønskes «én aktiv sub per bruker»-invariant?
2. 5b/5c/6a: OK å legge til de nevnte indeksene + RPC + triggere? (Additive migrasjoner.)
3. 6b: skal vi ta den store RLS init-plan-omskrivingen før launch (ytelse), eller utsette til etter (mange policyer, drift-risiko)?

## Testplan
- Indeks-migrasjoner: additive, verifiser `explain` bruker ny indeks på feed/tips/domene-query mot prod-branch.
- RPC/trigger: enhetstest på seat-cap-race og notifications-immutabilitet.
- 6c: enhetstest at liste-select ikke returnerer `body`.
