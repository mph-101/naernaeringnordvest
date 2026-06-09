-- Floating "Spør" assistant button: per-user on/off, synced across devices.
-- Mirrors profiles.mascot_enabled (the compass guide toggle). Default on so
-- existing users see the button until they choose to hide it.
alter table public.profiles
  add column if not exists spor_enabled boolean not null default true;

comment on column public.profiles.spor_enabled is
  'Whether the global floating Spør (AI assistant) button is shown for this user. Mirrors mascot_enabled.';
