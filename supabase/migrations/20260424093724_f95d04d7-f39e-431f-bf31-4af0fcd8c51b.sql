-- ==============================================================
-- 1) PERSONAL SUBSCRIPTIONS
-- ==============================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'paddle')),
  provider_subscription_id TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('quarterly', 'yearly', 'business_seat')),
  price_id TEXT,
  product_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subscription_id)
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status, current_period_end);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================
-- 2) BUSINESS ACCOUNTS
-- ==============================================================
CREATE TABLE public.business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  orgnr TEXT,
  provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe', 'paddle')),
  provider_subscription_id TEXT,
  provider_customer_id TEXT,
  seat_count INTEGER NOT NULL DEFAULT 1 CHECK (seat_count >= 1),
  email_domain TEXT,
  domain_verification_token TEXT,
  domain_verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'incomplete',
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_business_accounts_owner ON public.business_accounts(owner_user_id);
CREATE INDEX idx_business_accounts_domain ON public.business_accounts(email_domain) WHERE email_domain IS NOT NULL AND domain_verified_at IS NOT NULL;
CREATE UNIQUE INDEX uniq_business_accounts_provider_sub ON public.business_accounts(provider, provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;

ALTER TABLE public.business_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own business account"
  ON public.business_accounts FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owner can update own business account"
  ON public.business_accounts FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Staff can view all business accounts"
  ON public.business_accounts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER trg_business_accounts_updated_at
  BEFORE UPDATE ON public.business_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================
-- 3) BUSINESS SEATS (invite-based access for company employees)
-- ==============================================================
CREATE TABLE public.business_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  invite_token TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'invite' CHECK (source IN ('invite', 'domain_auto')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_account_id, email)
);

CREATE INDEX idx_business_seats_user ON public.business_seats(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_business_seats_email ON public.business_seats(lower(email));

ALTER TABLE public.business_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seat"
  ON public.business_seats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can manage seats"
  ON public.business_seats FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_accounts ba
      WHERE ba.id = business_seats.business_account_id
        AND ba.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_accounts ba
      WHERE ba.id = business_seats.business_account_id
        AND ba.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view all seats"
  ON public.business_seats FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'editor'::app_role));

CREATE TRIGGER trg_business_seats_updated_at
  BEFORE UPDATE ON public.business_seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================
-- 4) ACCESS-CHECK FUNCTION (provider-agnostic)
-- ==============================================================
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_domain TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Personal subscription (trialing/active/past_due with valid period, or canceled with future end)
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND (
        (status IN ('trialing', 'active', 'past_due') AND (current_period_end IS NULL OR current_period_end > now()))
        OR (status = 'canceled' AND current_period_end IS NOT NULL AND current_period_end > now())
      )
  ) THEN
    RETURN true;
  END IF;

  -- 2. Active business seat
  IF EXISTS (
    SELECT 1 FROM public.business_seats bs
    JOIN public.business_accounts ba ON ba.id = bs.business_account_id
    WHERE bs.user_id = _user_id
      AND ba.status IN ('trialing', 'active', 'past_due')
      AND (ba.current_period_end IS NULL OR ba.current_period_end > now())
  ) THEN
    RETURN true;
  END IF;

  -- 3. Verified email-domain match
  SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
  IF user_email IS NOT NULL THEN
    user_domain := lower(split_part(user_email, '@', 2));
    IF user_domain <> '' AND EXISTS (
      SELECT 1 FROM public.business_accounts
      WHERE lower(email_domain) = user_domain
        AND domain_verified_at IS NOT NULL
        AND status IN ('trialing', 'active', 'past_due')
        AND (current_period_end IS NULL OR current_period_end > now())
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- ==============================================================
-- 5) AUTO-PROVISION SEAT WHEN NEW USER MATCHES VERIFIED DOMAIN
-- ==============================================================
CREATE OR REPLACE FUNCTION public.auto_assign_business_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_domain TEXT;
  matching_account_id UUID;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  user_domain := lower(split_part(NEW.email, '@', 2));
  IF user_domain = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO matching_account_id
  FROM public.business_accounts
  WHERE lower(email_domain) = user_domain
    AND domain_verified_at IS NOT NULL
    AND status IN ('trialing', 'active', 'past_due')
    AND (current_period_end IS NULL OR current_period_end > now())
  LIMIT 1;

  IF matching_account_id IS NOT NULL THEN
    INSERT INTO public.business_seats (business_account_id, user_id, email, accepted_at, source)
    VALUES (matching_account_id, NEW.id, NEW.email, now(), 'domain_auto')
    ON CONFLICT (business_account_id, email) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          accepted_at = COALESCE(business_seats.accepted_at, EXCLUDED.accepted_at);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_business_seat
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_business_seat();