-- Review bolk 5 — data integrity + remaining RLS gaps (design: docs/bolk5-6-data-integrity-and-performance.md,
-- decisions 5-D1 ja / 5-D2 ja). Additive; policy names verified against prod 2026-07-07.

-- ============================================================================
-- 5a — one active personal subscription per user (per Stripe environment).
-- Partial unique index: a user can hold at most one trialing/active/past_due
-- subscription row per environment. 'canceled' rows (even with future
-- current_period_end) don't block a new signup. Webhook upserts that would
-- create a second active sub now fail with 23505 -> webhook returns 400 ->
-- Stripe retries/alerts instead of silently double-billing access.
-- ============================================================================
create unique index if not exists uniq_subscriptions_one_active_per_user
  on public.subscriptions (user_id, environment)
  where status in ('trialing', 'active', 'past_due');

-- ============================================================================
-- 5b — atomic business-seat claim. Replaces the edge function's
-- count-then-upsert (TOCTOU: two concurrent invites with different emails
-- could exceed seat_count). FOR UPDATE on the account row serializes claims
-- per account; the auth.users email lookup replaces the O(all-users)
-- listUsers({perPage:1000}) scan that silently missed users beyond page 1.
-- Service-role only.
-- ============================================================================
create or replace function public.claim_business_seat(
  _account_id uuid,
  _owner_id uuid,
  _email text,
  _invite_token text
)
returns table(status text, linked boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer;
  acct_owner uuid;
  existing_user_id uuid;
  seat_exists boolean;
begin
  select seat_count, owner_user_id into cap, acct_owner
  from public.business_accounts
  where id = _account_id
  for update;

  if not found then
    return query select 'not_found'::text, false; return;
  end if;
  if acct_owner is distinct from _owner_id then
    return query select 'forbidden'::text, false; return;
  end if;

  select id into existing_user_id
  from auth.users
  where lower(email) = lower(_email)
  limit 1;

  select exists (
    select 1 from public.business_seats
    where business_account_id = _account_id and email = _email
  ) into seat_exists;

  if seat_exists then
    -- Re-invite: refresh the existing seat; does not consume a new seat.
    update public.business_seats
    set user_id      = existing_user_id,
        invite_token = case when existing_user_id is null then _invite_token else null end,
        accepted_at  = case when existing_user_id is not null then now() else null end,
        source       = 'invite'
    where business_account_id = _account_id and email = _email;
    return query select 'updated'::text, existing_user_id is not null; return;
  end if;

  if (select count(*) from public.business_seats where business_account_id = _account_id)
     >= coalesce(cap, 1) then
    return query select 'full'::text, false; return;
  end if;

  insert into public.business_seats
    (business_account_id, email, user_id, invite_token, accepted_at, source)
  values (
    _account_id,
    _email,
    existing_user_id,
    case when existing_user_id is null then _invite_token else null end,
    case when existing_user_id is not null then now() else null end,
    'invite'
  );
  return query select 'created'::text, existing_user_id is not null;
end;
$$;

revoke all on function public.claim_business_seat(uuid, uuid, text, text) from public;
revoke all on function public.claim_business_seat(uuid, uuid, text, text) from anon;
revoke all on function public.claim_business_seat(uuid, uuid, text, text) from authenticated;
grant execute on function public.claim_business_seat(uuid, uuid, text, text) to service_role;

-- ============================================================================
-- 5c1 — notifications: enforce the column-immutability the RLS comment
-- already claims. Users may only flip read_at on their own rows; everything
-- else is frozen at insert. Service-role writes bypass (system maintenance).
-- ============================================================================
create or replace function public.notifications_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if (new.id, new.user_id, new.type, new.orgnr, new.company_name, new.payload, new.created_at)
     is distinct from
     (old.id, old.user_id, old.type, old.orgnr, old.company_name, old.payload, old.created_at) then
    raise exception 'Only read_at can be updated on notifications';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifications_guard_update on public.notifications;
create trigger trg_notifications_guard_update
  before update on public.notifications
  for each row execute function public.notifications_guard_update();

-- ============================================================================
-- 5c2 — group_invitations UPDATE: add the missing WITH CHECK so a group
-- admin can't re-parent an invitation into a group they don't administer.
-- Policy name verified in prod.
-- ============================================================================
alter policy "Group admins can update invitations" on public.group_invitations
  with check (is_group_admin(auth.uid(), group_id));

-- ============================================================================
-- 5c3 — newsletter_subscriptions: the table already has double-opt-in schema
-- (confirmed / confirmation_token), but the open INSERT policy (WITH CHECK
-- true) let any client insert a row with confirmed=true or a self-chosen
-- confirmation_token — forging a confirmed subscription for someone else's
-- email. Force unconfirmed state + server-generated tokens for all non-staff
-- inserts. (IP rate-limiting of junk rows deliberately deferred — needs an
-- edge-function subscribe flow; rows stay unconfirmed so the send pipeline
-- must filter on confirmed=true.)
-- ============================================================================
create or replace function public.newsletter_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role'
     or public.has_role(auth.uid(), 'admin'::public.app_role)
     or public.has_role(auth.uid(), 'editor'::public.app_role) then
    return new;
  end if;
  new.confirmed := false;
  new.confirmed_at := null;
  new.confirmation_token := encode(extensions.gen_random_bytes(32), 'hex');
  new.unsubscribe_token := encode(extensions.gen_random_bytes(32), 'hex');
  return new;
end;
$$;

drop trigger if exists trg_newsletter_guard_insert on public.newsletter_subscriptions;
create trigger trg_newsletter_guard_insert
  before insert on public.newsletter_subscriptions
  for each row execute function public.newsletter_guard_insert();
