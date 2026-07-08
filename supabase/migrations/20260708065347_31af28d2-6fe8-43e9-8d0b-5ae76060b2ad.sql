
-- =========================================================================
-- OWNER / SUPER ADMIN RBAC
-- =========================================================================

-- 1. platform_owners table --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_owners (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

GRANT SELECT ON public.platform_owners TO authenticated;
GRANT ALL ON public.platform_owners TO service_role;

ALTER TABLE public.platform_owners ENABLE ROW LEVEL SECURITY;

-- 2. is_owner() helper ------------------------------------------------------
-- Owner = row in platform_owners OR canonical owner email (belt-and-braces
-- so the owner keeps access even if the row is ever purged in error).
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_owners WHERE user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND lower(email) = 'minhazmoktar@gmail.com'
  );
$$;

-- 3. has_min_role() ---------------------------------------------------------
-- Tier order: user < moderator < admin < owner.
-- Owner inherits all downward permissions.
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id UUID, _min_tier TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_rank INT := 0;
  required_rank INT;
BEGIN
  -- Rank the caller (highest tier wins).
  IF public.is_owner(_user_id) THEN
    effective_rank := 4;
  ELSIF public.has_role(_user_id, 'admin'::app_role) THEN
    effective_rank := 3;
  -- 'moderator' would be rank 2 if/when added to the enum. Not enforced yet.
  ELSE
    effective_rank := 1; -- signed-in user
  END IF;

  required_rank := CASE lower(_min_tier)
    WHEN 'owner'     THEN 4
    WHEN 'admin'     THEN 3
    WHEN 'moderator' THEN 2
    ELSE 1
  END;

  RETURN effective_rank >= required_rank;
END;
$$;

-- 4. Auto-register the canonical owner on signup ---------------------------
-- Update the existing handle_new_user to also seed platform_owners.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  IF lower(NEW.email) = 'minhazmoktar@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.platform_owners (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: if the owner already exists, register them now.
INSERT INTO public.platform_owners (user_id, email)
SELECT id, email FROM auth.users
WHERE lower(email) = 'minhazmoktar@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'minhazmoktar@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Protect the Owner from demotion or deletion ---------------------------
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'admin' AND public.is_owner(OLD.user_id) THEN
      RAISE EXCEPTION 'Owner role cannot be removed';
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role = 'admin' AND public.is_owner(OLD.user_id)
       AND NEW.role <> 'admin' THEN
      RAISE EXCEPTION 'Owner role cannot be modified';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_owner_role ON public.user_roles;
CREATE TRIGGER trg_protect_owner_role
BEFORE UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

-- Protect platform_owners rows too (only service_role / SQL can insert; the
-- Owner cannot be removed via the client).
CREATE OR REPLACE FUNCTION public.protect_platform_owners()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND lower(OLD.email) = 'minhazmoktar@gmail.com' THEN
    RAISE EXCEPTION 'Canonical owner cannot be removed';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_platform_owners ON public.platform_owners;
CREATE TRIGGER trg_protect_platform_owners
BEFORE DELETE ON public.platform_owners
FOR EACH ROW EXECUTE FUNCTION public.protect_platform_owners();

-- RLS on platform_owners: only owner can see the list.
DROP POLICY IF EXISTS "owner reads platform_owners" ON public.platform_owners;
CREATE POLICY "owner reads platform_owners"
ON public.platform_owners
FOR SELECT
TO authenticated
USING (public.is_owner(auth.uid()));

-- 6. Immutable privileged action audit log ---------------------------------
CREATE TABLE IF NOT EXISTS public.privileged_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  previous_state JSONB,
  new_state JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_privileged_actions_created_at
  ON public.privileged_actions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_privileged_actions_user
  ON public.privileged_actions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_privileged_actions_target
  ON public.privileged_actions_log(target_type, target_id);

-- Only owner may read; only service_role may write (edge functions).
GRANT SELECT ON public.privileged_actions_log TO authenticated;
GRANT ALL ON public.privileged_actions_log TO service_role;

ALTER TABLE public.privileged_actions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads audit log" ON public.privileged_actions_log;
CREATE POLICY "owner reads audit log"
ON public.privileged_actions_log
FOR SELECT
TO authenticated
USING (public.is_owner(auth.uid()));

-- Immutability: block UPDATE / DELETE for everyone except service_role.
DROP POLICY IF EXISTS "no updates to audit log" ON public.privileged_actions_log;
CREATE POLICY "no updates to audit log"
ON public.privileged_actions_log
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "no deletes from audit log" ON public.privileged_actions_log;
CREATE POLICY "no deletes from audit log"
ON public.privileged_actions_log
FOR DELETE
TO authenticated
USING (false);

-- 7. Extend admin-scoped policies to accept Owner --------------------------
-- Owner is already an admin (row seeded above) so has_role('admin') is true.
-- We add explicit is_owner() OR policies as a safety net for tables where
-- admin membership might be revoked or where extra clarity is desired.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'approved_channels',
    'blocked_creators',
    'removed_videos',
    'channel_audit_log',
    'video_audit_log',
    'moderation_overrides'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "owner full access %1$I" ON public.%1$I', tbl
    );
    EXECUTE format(
      'CREATE POLICY "owner full access %1$I" ON public.%1$I
       FOR ALL TO authenticated
       USING (public.is_owner(auth.uid()))
       WITH CHECK (public.is_owner(auth.uid()))',
      tbl
    );
  END LOOP;
END $$;
