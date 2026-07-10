-- Aggregerer «Mest lest» server-side (design-audit optimize, del A).
-- Erstatter klient-side aggregering der forsiden lastet ned samtlige rå
-- article_views-rader siste 7 dager. SECURITY DEFINER slik at den brede
-- klient-SELECT-en på article_views senere kan strammes inn uten å knekke
-- forsiden; STABLE + låst search_path per husmønster.
-- NB: article_views.article_id er TEXT i skjemaet (ikke uuid).
-- Applisert mot prod 2026-07-10 via MCP (navn: trending_articles_rpc).
create or replace function public.get_trending_articles(days integer default 7, max_rows integer default 12)
returns table(article_id text, views bigint)
language sql
stable
security definer
set search_path = public
as $$
  select av.article_id, count(*)::bigint as views
  from article_views av
  where av.viewed_at >= now() - make_interval(days => days)
    and av.article_id is not null
  group by av.article_id
  order by count(*) desc, av.article_id
  limit max_rows;
$$;

comment on function public.get_trending_articles(integer, integer) is
  'Mest leste artikler siste N dager (forsidens Mest lest-seksjon). Server-side erstatning for klient-aggregering av rå article_views-rader.';

grant execute on function public.get_trending_articles(integer, integer) to anon, authenticated;
