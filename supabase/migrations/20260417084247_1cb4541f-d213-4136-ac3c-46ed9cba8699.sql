-- 1) Table: api_keys (only the hash is stored)
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,           -- e.g. "nn_live_abcd" — shown in UI for identification
  key_hash text NOT NULL UNIQUE,      -- sha256 hex of the full key
  last_used_at timestamptz,
  request_count bigint NOT NULL DEFAULT 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_user_id_idx ON public.api_keys(user_id);
CREATE INDEX api_keys_key_hash_idx ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 2) RLS — owners + admin
CREATE POLICY "Users can view own api keys"
  ON public.api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all api keys"
  ON public.api_keys FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own api keys"
  ON public.api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- (No INSERT/UPDATE policies — all writes go through SECURITY DEFINER RPCs)

-- 3) Create key — returns the prefix + id; the full key is built on the client
CREATE OR REPLACE FUNCTION public.create_api_key(_name text, _key_hash text, _key_prefix text, _expires_at timestamptz DEFAULT NULL)
RETURNS TABLE (id uuid, key_prefix text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  new_created timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    has_role(auth.uid(), 'subscriber'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Krever abonnement for API-tilgang';
  END IF;

  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RAISE EXCEPTION 'Navn er påkrevd';
  END IF;

  IF _key_hash IS NULL OR length(_key_hash) <> 64 THEN
    RAISE EXCEPTION 'Ugyldig key_hash';
  END IF;

  INSERT INTO public.api_keys (user_id, name, key_prefix, key_hash, expires_at)
  VALUES (auth.uid(), trim(_name), _key_prefix, _key_hash, _expires_at)
  RETURNING api_keys.id, api_keys.created_at INTO new_id, new_created;

  RETURN QUERY SELECT new_id, _key_prefix, new_created;
END;
$$;

-- 4) Revoke (hard delete — owner only)
CREATE OR REPLACE FUNCTION public.revoke_api_key(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.api_keys
  WHERE id = _id AND user_id = auth.uid();
END;
$$;

-- 5) Validate (used by edge function with service role)
-- Returns the key row if it's valid AND the owner still has subscriber/admin.
-- Also bumps last_used_at and request_count.
CREATE OR REPLACE FUNCTION public.validate_api_key(_key_hash text)
RETURNS TABLE (user_id uuid, key_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k_id uuid;
  k_user uuid;
  k_expires timestamptz;
BEGIN
  SELECT id, api_keys.user_id, expires_at
  INTO k_id, k_user, k_expires
  FROM public.api_keys
  WHERE api_keys.key_hash = _key_hash
  LIMIT 1;

  IF k_id IS NULL THEN
    RETURN;
  END IF;

  IF k_expires IS NOT NULL AND k_expires < now() THEN
    RETURN;
  END IF;

  IF NOT (
    has_role(k_user, 'subscriber'::app_role)
    OR has_role(k_user, 'admin'::app_role)
  ) THEN
    RETURN;
  END IF;

  UPDATE public.api_keys
  SET last_used_at = now(),
      request_count = request_count + 1
  WHERE id = k_id;

  RETURN QUERY SELECT k_user, k_id;
END;
$$;