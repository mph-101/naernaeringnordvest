-- Review bolk 4 — soft human-publish gate + Plattform/avis provenance.
-- Decisions: 4-D1 soft (no forced publish RPC / no restrictive WITH CHECK),
-- 4-D2 add scheduled_by + agent_runs. Additive, non-destructive.

-- 1) agent_runs: machine-readable log of who ORDERED/instructed AI work. Closes
--    the "no record of the instruction chain" gap and gives the Plattform-vs-
--    editorial boundary an audit trail. Service-role writes only; staff read.
create table if not exists public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  function    text not null,
  ordered_by  uuid references auth.users(id) on delete set null,
  article_id  uuid references public.articles(id) on delete set null,
  model       text,
  created_at  timestamptz not null default now()
);
alter table public.agent_runs enable row level security;
create policy "Staff can read agent runs" on public.agent_runs
  for select using (
    has_role(auth.uid(), 'admin'::app_role)
    or has_role(auth.uid(), 'editor'::app_role)
    or has_role(auth.uid(), 'journalist'::app_role)
  );
create index if not exists idx_agent_runs_ordered_by on public.agent_runs(ordered_by);
create index if not exists idx_agent_runs_article on public.agent_runs(article_id) where article_id is not null;

-- 2) scheduled_by: which human scheduled a publish. A BEFORE trigger stamps it
--    from auth.uid() whenever scheduled_publish_at is (re)set, so the client can't
--    spoof it and a cron/automation-set schedule (auth.uid() is null) is auditable
--    as "no human scheduled this". The soft human-gate: publishing stays role-gated
--    as today, but the scheduling actor is now recorded and non-forgeable.
alter table public.articles add column if not exists scheduled_by uuid references auth.users(id) on delete set null;

create or replace function public.set_scheduled_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.scheduled_publish_at is null then
    new.scheduled_by := null;
  elsif tg_op = 'INSERT' then
    new.scheduled_by := auth.uid();
  elsif old.scheduled_publish_at is distinct from new.scheduled_publish_at then
    -- OLD only referenced in this branch, which is unreachable on INSERT
    new.scheduled_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_scheduled_by on public.articles;
create trigger trg_set_scheduled_by
  before insert or update on public.articles
  for each row execute function public.set_scheduled_by();
