
-- =========================================================================
-- Batch 4a: Family seats schema
-- =========================================================================

-- 1) plus_households
CREATE TABLE IF NOT EXISTS public.plus_households (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Family',
  plan TEXT NOT NULL DEFAULT 'family',
  seat_limit INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plus_households TO authenticated;
GRANT ALL ON public.plus_households TO service_role;
ALTER TABLE public.plus_households ENABLE ROW LEVEL SECURITY;

-- 2) plus_household_members
CREATE TABLE IF NOT EXISTS public.plus_household_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.plus_households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',   -- 'owner' | 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id),
  UNIQUE (user_id) -- a user can only belong to one household
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plus_household_members TO authenticated;
GRANT ALL ON public.plus_household_members TO service_role;
ALTER TABLE public.plus_household_members ENABLE ROW LEVEL SECURITY;

-- 3) plus_seat_invites
CREATE TABLE IF NOT EXISTS public.plus_seat_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  household_id UUID NOT NULL REFERENCES public.plus_households(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'accepted' | 'revoked' | 'expired'
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plus_seat_invites_household ON public.plus_seat_invites(household_id);
CREATE INDEX IF NOT EXISTS idx_plus_seat_invites_email ON public.plus_seat_invites(lower(invited_email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plus_seat_invites TO authenticated;
GRANT ALL ON public.plus_seat_invites TO service_role;
ALTER TABLE public.plus_seat_invites ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Security-definer helpers (avoid recursive RLS on household tables)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.user_household_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id
  FROM public.plus_household_members
  WHERE user_id = _user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_household_owner(_user_id UUID, _household_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plus_households
    WHERE id = _household_id AND owner_id = _user_id
  );
$$;

-- =========================================================================
-- RLS policies
-- =========================================================================

-- plus_households
DROP POLICY IF EXISTS "households_owner_all" ON public.plus_households;
CREATE POLICY "households_owner_all" ON public.plus_households
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "households_member_read" ON public.plus_households;
CREATE POLICY "households_member_read" ON public.plus_households
  FOR SELECT TO authenticated
  USING (id = public.user_household_id(auth.uid()));

-- plus_household_members
DROP POLICY IF EXISTS "hh_members_owner_all" ON public.plus_household_members;
CREATE POLICY "hh_members_owner_all" ON public.plus_household_members
  FOR ALL TO authenticated
  USING (public.is_household_owner(auth.uid(), household_id))
  WITH CHECK (public.is_household_owner(auth.uid(), household_id));

DROP POLICY IF EXISTS "hh_members_read_self_or_same_household" ON public.plus_household_members;
CREATE POLICY "hh_members_read_self_or_same_household" ON public.plus_household_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR household_id = public.user_household_id(auth.uid()));

DROP POLICY IF EXISTS "hh_members_leave_self" ON public.plus_household_members;
CREATE POLICY "hh_members_leave_self" ON public.plus_household_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- plus_seat_invites
DROP POLICY IF EXISTS "invites_owner_all" ON public.plus_seat_invites;
CREATE POLICY "invites_owner_all" ON public.plus_seat_invites
  FOR ALL TO authenticated
  USING (public.is_household_owner(auth.uid(), household_id))
  WITH CHECK (public.is_household_owner(auth.uid(), household_id));

DROP POLICY IF EXISTS "invites_read_by_email" ON public.plus_seat_invites;
CREATE POLICY "invites_read_by_email" ON public.plus_seat_invites
  FOR SELECT TO authenticated
  USING (lower(invited_email) = lower(coalesce((auth.jwt() ->> 'email'), '')));

-- =========================================================================
-- Validation triggers (seat limit + expiry)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.enforce_household_seat_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limit_val INTEGER;
  current_count INTEGER;
BEGIN
  SELECT seat_limit INTO limit_val FROM public.plus_households WHERE id = NEW.household_id;
  SELECT count(*) INTO current_count FROM public.plus_household_members WHERE household_id = NEW.household_id;
  IF current_count >= limit_val THEN
    RAISE EXCEPTION 'Household is full (seat limit %)', limit_val USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_household_seat_limit ON public.plus_household_members;
CREATE TRIGGER trg_household_seat_limit
  BEFORE INSERT ON public.plus_household_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_household_seat_limit();

CREATE OR REPLACE FUNCTION public.validate_seat_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite expiry must be in the future';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_seat_invite ON public.plus_seat_invites;
CREATE TRIGGER trg_validate_seat_invite
  BEFORE INSERT OR UPDATE ON public.plus_seat_invites
  FOR EACH ROW EXECUTE FUNCTION public.validate_seat_invite();

-- updated_at triggers (reuse existing update_updated_at_column if present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $body$
    BEGIN NEW.updated_at = now(); RETURN NEW; END;
    $body$ LANGUAGE plpgsql SET search_path = public;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_plus_households_updated ON public.plus_households;
CREATE TRIGGER trg_plus_households_updated
  BEFORE UPDATE ON public.plus_households
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_plus_seat_invites_updated ON public.plus_seat_invites;
CREATE TRIGGER trg_plus_seat_invites_updated
  BEFORE UPDATE ON public.plus_seat_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
