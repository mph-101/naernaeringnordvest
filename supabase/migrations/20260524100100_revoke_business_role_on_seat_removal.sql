-- Bug fix: when a business_seat is removed, the user keeps the 'business'
-- role in user_roles and therefore keeps premium access forever. Add a
-- trigger that removes the role IF the user has no other active seats.
--
-- "Active seat" = a row in business_seats that is not in a canceled/disabled
-- business_account. We approximate this as "any business_seats row at all"
-- since seat removal is the only common DELETE path.

CREATE OR REPLACE FUNCTION public.revoke_business_role_on_seat_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_remaining_seats integer;
BEGIN
  -- How many other seats does this user still have?
  SELECT count(*) INTO v_remaining_seats
    FROM public.business_seats
   WHERE user_id = OLD.user_id;

  IF v_remaining_seats = 0 THEN
    DELETE FROM public.user_roles
     WHERE user_id = OLD.user_id
       AND role = 'business';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_revoke_business_role_on_seat_removal ON public.business_seats;
CREATE TRIGGER trg_revoke_business_role_on_seat_removal
AFTER DELETE ON public.business_seats
FOR EACH ROW EXECUTE FUNCTION public.revoke_business_role_on_seat_removal();
