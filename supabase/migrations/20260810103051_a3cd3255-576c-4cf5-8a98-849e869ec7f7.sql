-- 1. PRIVACY SETTINGS ON PROFILES ------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.visibility_level AS ENUM ('everyone','connections','nobody');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility  public.visibility_level NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS progress_visibility public.visibility_level NOT NULL DEFAULT 'connections',
  ADD COLUMN IF NOT EXISTS streak_visibility   public.visibility_level NOT NULL DEFAULT 'connections',
  ADD COLUMN IF NOT EXISTS activity_visibility public.visibility_level NOT NULL DEFAULT 'connections',
  ADD COLUMN IF NOT EXISTS discoverable        boolean NOT NULL DEFAULT true;

-- 2. CONNECTIONS -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_connections_status_chk CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT user_connections_no_self CHECK (requester_id <> addressee_id)
);
-- one relationship per unordered pair
CREATE UNIQUE INDEX IF NOT EXISTS user_connections_pair_uniq
  ON public.user_connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS user_connections_addressee_idx ON public.user_connections (addressee_id, status);
CREATE INDEX IF NOT EXISTS user_connections_requester_idx ON public.user_connections (requester_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_connections TO authenticated;
GRANT ALL ON public.user_connections TO service_role;
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own connections"
  ON public.user_connections FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Members delete their own connections"
  ON public.user_connections FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- 3. CHALLENGES ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  goal integer NOT NULL,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz NOT NULL,
  visibility text NOT NULL DEFAULT 'invite',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenges_type_chk CHECK (type IN ('minutes','doses','videos','sessions')),
  CONSTRAINT challenges_visibility_chk CHECK (visibility IN ('private','invite')),
  CONSTRAINT challenges_status_chk CHECK (status IN ('active','completed','cancelled')),
  CONSTRAINT challenges_goal_chk CHECK (goal > 0 AND goal <= 100000),
  CONSTRAINT challenges_title_chk CHECK (char_length(btrim(title)) BETWEEN 1 AND 120)
);
CREATE INDEX IF NOT EXISTS challenges_creator_idx ON public.challenges (creator_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.challenge_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'invited',
  completed boolean NOT NULL DEFAULT false,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT challenge_members_state_chk CHECK (state IN ('invited','joined','declined','left')),
  CONSTRAINT challenge_members_uniq UNIQUE (challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS challenge_members_user_idx ON public.challenge_members (user_id, state);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_members TO authenticated;
GRANT ALL ON public.challenge_members TO service_role;
ALTER TABLE public.challenge_members ENABLE ROW LEVEL SECURITY;

-- membership helper (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_challenge_member(_challenge_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_members m
    WHERE m.challenge_id = _challenge_id AND m.user_id = _user_id
      AND m.state IN ('invited','joined')
  );
$$;

CREATE POLICY "Members read challenges they belong to"
  ON public.challenges FOR SELECT TO authenticated
  USING (auth.uid() = creator_id OR public.is_challenge_member(id, auth.uid()));

CREATE POLICY "Creators cancel their own challenges"
  ON public.challenges FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Members read rosters of their challenges"
  ON public.challenge_members FOR SELECT TO authenticated
  USING (public.is_challenge_member(challenge_id, auth.uid())
         OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.creator_id = auth.uid()));

-- 4. USER REPORTS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_user_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_reports_reason_chk CHECK (reason IN ('spam','harassment','inappropriate','abuse','other')),
  CONSTRAINT user_reports_status_chk CHECK (status IN ('open','reviewing','resolved','dismissed')),
  CONSTRAINT user_reports_no_self CHECK (reporter_id <> reported_user_id)
);
CREATE INDEX IF NOT EXISTS user_reports_status_idx ON public.user_reports (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reporters read their own reports"
  ON public.user_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins triage reports"
  ON public.user_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. updated_at triggers ---------------------------------------------------
CREATE TRIGGER user_connections_touch BEFORE UPDATE ON public.user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER challenges_touch BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER challenge_members_touch BEFORE UPDATE ON public.challenge_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER user_reports_touch BEFORE UPDATE ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();