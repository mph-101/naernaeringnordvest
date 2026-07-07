-- Review bolk 3c: the feed-api rate limiter did SELECT count -> decide in JS ->
-- UPDATE count, a non-atomic read-modify-write that concurrent requests bypass
-- (all read the same count, all write count+1, last-write-wins), and the first-key
-- INSERT had an unhandled 23505 race. Move the whole decision into one atomic
-- statement (INSERT ... ON CONFLICT ... RETURNING) so N concurrent requests advance
-- the counter N times. Rejected (over-limit) requests still increment (decision 3-D3).
create or replace function public.bump_api_key_rate_limit(
  _key_id uuid,
  _max integer,
  _window_ms bigint
)
returns table(limited boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_ts timestamptz := now();
  window_interval interval := make_interval(secs => _window_ms / 1000.0);
  cnt integer;
  win_start timestamptz;
begin
  insert into public.api_key_rate_limits as r (key_id, request_count, window_start)
  values (_key_id, 1, now_ts)
  on conflict (key_id) do update
    set request_count = case
          when r.window_start < now_ts - window_interval then 1
          else r.request_count + 1
        end,
        window_start = case
          when r.window_start < now_ts - window_interval then now_ts
          else r.window_start
        end
  returning r.request_count, r.window_start into cnt, win_start;

  -- Matches the previous evaluateRateWindow semantics: _max requests allowed per
  -- window, the (_max + 1)th is limited.
  if cnt > _max then
    return query
      select true,
             greatest(0, ceil(extract(epoch from (win_start + window_interval - now_ts))))::integer;
  else
    return query select false, 0;
  end if;
end;
$$;

-- Only the service role (feed-api) may call this; keep anon/authenticated out.
revoke all on function public.bump_api_key_rate_limit(uuid, integer, bigint) from public;
