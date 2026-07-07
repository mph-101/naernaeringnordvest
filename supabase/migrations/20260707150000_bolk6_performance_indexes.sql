-- Review bolk 6a — performance indexes (design: docs/bolk5-6-data-integrity-and-performance.md,
-- decision 6-D1 ja; init-plan rewrite deferred to post-launch per 6-D2).
-- All additive. FK list is the exact unindexed_foreign_keys set from the prod
-- performance advisor 2026-07-07 (13 items).

-- Unindexed foreign keys: without these, FK-side lookups and cascade checks
-- seq-scan the child table.
create index if not exists idx_article_gallery_items_media on public.article_gallery_items (media_id);
create index if not exists idx_articles_created_by on public.articles (created_by);
create index if not exists idx_barometer_modules_updated_by on public.barometer_modules (updated_by);
create index if not exists idx_barometer_signals_reviewed_by on public.barometer_signals (reviewed_by);
create index if not exists idx_employer_profiles_region on public.employer_profiles (region_slug);
create index if not exists idx_group_invitations_group on public.group_invitations (group_id);
create index if not exists idx_group_messages_article on public.group_messages (article_id);
create index if not exists idx_group_messages_group on public.group_messages (group_id);
create index if not exists idx_hjernevelv_panelists_writer on public.hjernevelv_panelists (writer_id);
create index if not exists idx_job_listings_employer_profile on public.job_listings (employer_profile_id);
create index if not exists idx_newsletter_issues_region on public.newsletter_issues (region_slug);
create index if not exists idx_region_hidden_articles_hidden_by on public.region_hidden_articles (hidden_by);
create index if not exists idx_tips_reviewed_by on public.tips (reviewed_by);

-- Admin badge: tips.select(count).eq('status','new') runs on every admin load;
-- status had no index at all.
create index if not exists idx_tips_status_new on public.tips (status) where status = 'new';

-- Canonical feed query: WHERE published = true ORDER BY published_at DESC.
-- Existing indexes cover only the boolean `published` and `created_at`;
-- this partial index serves the feed (and its region-filtered variant) directly.
create index if not exists idx_articles_published_pubdate
  on public.articles (published_at desc) where published;

-- has_active_subscription() and auto_assign_business_seat() match on
-- lower(email_domain), but idx_business_accounts_domain indexes the raw
-- column -> seq scan on an auth-adjacent hot path (runs inside RLS).
create index if not exists idx_business_accounts_domain_lower
  on public.business_accounts (lower(email_domain))
  where email_domain is not null and domain_verified_at is not null;
