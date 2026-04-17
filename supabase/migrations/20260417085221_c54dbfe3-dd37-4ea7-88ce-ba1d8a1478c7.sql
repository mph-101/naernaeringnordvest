ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS proofread_settings jsonb;