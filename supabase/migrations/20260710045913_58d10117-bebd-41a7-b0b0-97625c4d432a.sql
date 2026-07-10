
-- ============ FEATURE FLAGS ============
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  rollout_percent integer NOT NULL DEFAULT 100 CHECK (rollout_percent BETWEEN 0 AND 100),
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_read_all" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags_admin_write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));
CREATE TRIGGER trg_feature_flags_updated BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feature_flags(key, enabled, description) VALUES
  ('streaks', true, 'Daily engagement streak system'),
  ('referrals', true, 'Referral invite + reward flow'),
  ('group_khatm', true, 'Group Quran completion (Khatm) circles'),
  ('badges', true, 'Achievements & badges'),
  ('push_notifications', true, 'Send push notifications');

-- ============ NOTIFICATIONS ============
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_notifications_user ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications(user_id) WHERE read_at IS NULL;
GRANT SELECT, UPDATE, DELETE ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_own_read" ON public.user_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "notif_own_update" ON public.user_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notif_own_delete" ON public.user_notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============ STREAK FREEZES + MILESTONES ============
CREATE TABLE public.streak_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  reason text NOT NULL DEFAULT 'weekly_grant'
);
CREATE INDEX idx_streak_freezes_user ON public.streak_freezes(user_id, used_at);
GRANT SELECT, INSERT, UPDATE ON public.streak_freezes TO authenticated;
GRANT ALL ON public.streak_freezes TO service_role;
ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "freeze_own_read" ON public.streak_freezes FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "freeze_own_insert" ON public.streak_freezes FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "freeze_own_update" ON public.streak_freezes FOR UPDATE TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.streak_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone integer NOT NULL,
  reached_at timestamptz NOT NULL DEFAULT now(),
  shared boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, milestone)
);
GRANT SELECT, INSERT, UPDATE ON public.streak_milestones TO authenticated;
GRANT ALL ON public.streak_milestones TO service_role;
ALTER TABLE public.streak_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ms_own_read" ON public.streak_milestones FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "ms_own_insert" ON public.streak_milestones FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "ms_own_update" ON public.streak_milestones FOR UPDATE TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- ============ BADGES ============
CREATE TABLE public.badges (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🏅',
  category text NOT NULL DEFAULT 'general',
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges_read_all" ON public.badges FOR SELECT USING (true);
CREATE POLICY "badges_admin_write" ON public.badges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key text NOT NULL REFERENCES public.badges(key) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_key)
);
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id, earned_at DESC);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ub_own_read" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "ub_public_read" ON public.user_badges FOR SELECT USING (true); -- badges are shareable
CREATE POLICY "ub_own_insert" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);

INSERT INTO public.badges(key,name,description,icon,category) VALUES
  ('streak_3','Getting Started','3-day streak','🔥','streak'),
  ('streak_7','Weekly Warrior','7-day streak','🔥','streak'),
  ('streak_30','Monthly Devotee','30-day streak','🌙','streak'),
  ('streak_100','Centurion','100-day streak','💯','streak'),
  ('streak_365','Year of Devotion','365-day streak','🏆','streak'),
  ('referral_1','First Invite','Invited your first friend','🤝','referral'),
  ('referral_5','Community Builder','5 successful referrals','👥','referral'),
  ('referral_25','Ambassador','25 successful referrals','🌟','referral'),
  ('khatm_juz','Juz Complete','Completed 1 Juz in a group Khatm','📖','khatm'),
  ('khatm_group','Group Khatm','Contributed to a completed group Khatm','🕌','khatm')
ON CONFLICT (key) DO NOTHING;

-- ============ REFERRAL EXTENSIONS ============
CREATE TABLE public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('inviter','invitee')),
  reward_type text NOT NULL, -- 'premium_days','badge','feature'
  reward_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_rewards_user ON public.referral_rewards(user_id, granted_at DESC);
GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rr_own_read" ON public.referral_rewards FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "rr_admin_read" ON public.referral_rewards FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));

CREATE TABLE public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  ip_hash text,
  ua_hash text,
  fingerprint text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_referral_clicks_code ON public.referral_clicks(code, created_at DESC);
CREATE INDEX idx_referral_clicks_fingerprint ON public.referral_clicks(fingerprint);
GRANT INSERT ON public.referral_clicks TO anon, authenticated;
GRANT ALL ON public.referral_clicks TO service_role;
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc_insert_any" ON public.referral_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "rc_admin_read" ON public.referral_clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.is_owner(auth.uid()));

-- ============ GROUP KHATM ============
CREATE TABLE public.khatm_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  invite_code text NOT NULL UNIQUE DEFAULT lower(substr(md5(random()::text||clock_timestamp()::text),1,8)),
  intention text,
  target_completion_at timestamptz,
  completed_at timestamptz,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_khatm_groups_owner ON public.khatm_groups(owner_id);
CREATE INDEX idx_khatm_groups_public ON public.khatm_groups(is_public) WHERE is_public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.khatm_groups TO authenticated;
GRANT ALL ON public.khatm_groups TO service_role;
ALTER TABLE public.khatm_groups ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_khatm_groups_updated BEFORE UPDATE ON public.khatm_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.khatm_group_members (
  group_id uuid NOT NULL REFERENCES public.khatm_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_kgm_user ON public.khatm_group_members(user_id);
GRANT SELECT, INSERT, DELETE ON public.khatm_group_members TO authenticated;
GRANT ALL ON public.khatm_group_members TO service_role;
ALTER TABLE public.khatm_group_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper to break RLS recursion between groups and members
CREATE OR REPLACE FUNCTION public.is_khatm_member(_group_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.khatm_group_members WHERE group_id=_group_id AND user_id=_user_id);
$$;

CREATE POLICY "kg_read_member_or_public" ON public.khatm_groups FOR SELECT TO authenticated
  USING (is_public OR owner_id = auth.uid() OR public.is_khatm_member(id, auth.uid()));
CREATE POLICY "kg_public_read_anon" ON public.khatm_groups FOR SELECT TO anon USING (is_public);
CREATE POLICY "kg_owner_insert" ON public.khatm_groups FOR INSERT TO authenticated WITH CHECK (auth.uid()=owner_id);
CREATE POLICY "kg_owner_update" ON public.khatm_groups FOR UPDATE TO authenticated
  USING (auth.uid()=owner_id) WITH CHECK (auth.uid()=owner_id);
CREATE POLICY "kg_owner_delete" ON public.khatm_groups FOR DELETE TO authenticated USING (auth.uid()=owner_id);

CREATE POLICY "kgm_member_read" ON public.khatm_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_khatm_member(group_id, auth.uid()));
CREATE POLICY "kgm_self_join" ON public.khatm_group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "kgm_self_leave" ON public.khatm_group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TABLE public.khatm_juz_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.khatm_groups(id) ON DELETE CASCADE,
  juz_number integer NOT NULL CHECK (juz_number BETWEEN 1 AND 30),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(group_id, juz_number)
);
CREATE INDEX idx_kjc_group ON public.khatm_juz_claims(group_id);
CREATE INDEX idx_kjc_user ON public.khatm_juz_claims(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.khatm_juz_claims TO authenticated;
GRANT ALL ON public.khatm_juz_claims TO service_role;
ALTER TABLE public.khatm_juz_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kjc_member_read" ON public.khatm_juz_claims FOR SELECT TO authenticated
  USING (public.is_khatm_member(group_id, auth.uid()));
CREATE POLICY "kjc_self_claim" ON public.khatm_juz_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_khatm_member(group_id, auth.uid()));
CREATE POLICY "kjc_self_update" ON public.khatm_juz_claims FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "kjc_self_delete" ON public.khatm_juz_claims FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND completed_at IS NULL);

CREATE TABLE public.khatm_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.khatm_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_khatm_events_group ON public.khatm_events(group_id, created_at DESC);
GRANT SELECT, INSERT ON public.khatm_events TO authenticated;
GRANT ALL ON public.khatm_events TO service_role;
ALTER TABLE public.khatm_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ke_member_read" ON public.khatm_events FOR SELECT TO authenticated
  USING (public.is_khatm_member(group_id, auth.uid()));
CREATE POLICY "ke_member_insert" ON public.khatm_events FOR INSERT TO authenticated
  WITH CHECK (public.is_khatm_member(group_id, auth.uid()) AND (user_id = auth.uid() OR user_id IS NULL));

-- ============ RPCs ============

-- Ensure a referral code exists for the caller; return it.
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT code INTO _code FROM public.referrals
    WHERE inviter_id = _uid AND invitee_id IS NULL AND status='pending'
    ORDER BY created_at DESC LIMIT 1;
  IF _code IS NOT NULL THEN RETURN _code; END IF;

  LOOP
    _code := upper(substr(md5(random()::text || clock_timestamp()::text || _uid::text), 1, 8));
    BEGIN
      INSERT INTO public.referrals(code, inviter_id) VALUES (_code, _uid);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      -- retry
    END;
  END LOOP;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;

-- Redeem a referral code atomically with fraud guards.
CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _ref RECORD;
  _existing int;
  _inviter_total int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _code IS NULL OR length(_code) < 4 THEN RAISE EXCEPTION 'invalid_code'; END IF;

  SELECT * INTO _ref FROM public.referrals WHERE code = upper(_code) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'code_not_found'; END IF;
  IF _ref.inviter_id = _uid THEN RAISE EXCEPTION 'self_referral'; END IF;
  IF _ref.status = 'redeemed' AND _ref.invitee_id IS NOT NULL AND _ref.invitee_id <> _uid
    THEN RAISE EXCEPTION 'code_used'; END IF;

  SELECT count(*) INTO _existing FROM public.referrals
    WHERE invitee_id = _uid AND status = 'redeemed';
  IF _existing > 0 THEN RAISE EXCEPTION 'already_redeemed'; END IF;

  -- account-age fraud guard: invitee must be a real account (>= 1 minute old)
  IF (SELECT created_at FROM auth.users WHERE id = _uid) > now() - interval '1 minute' THEN
    RAISE EXCEPTION 'account_too_new';
  END IF;

  -- inviter cap: max 100 successful referrals to prevent abuse
  SELECT count(*) INTO _inviter_total FROM public.referrals
    WHERE inviter_id = _ref.inviter_id AND status = 'redeemed';
  IF _inviter_total >= 100 THEN RAISE EXCEPTION 'inviter_cap_reached'; END IF;

  UPDATE public.referrals
    SET invitee_id = _uid, status = 'redeemed', redeemed_at = now()
    WHERE id = _ref.id;

  -- Grant 14 days premium to invitee, 30 days to inviter (extendable).
  INSERT INTO public.entitlements(user_id, plan, expires_at)
  VALUES (_uid, 'premium', GREATEST(now(), coalesce(
      (SELECT expires_at FROM public.entitlements WHERE user_id=_uid), now())) + interval '14 days')
  ON CONFLICT (user_id) DO UPDATE
    SET plan='premium',
        expires_at = GREATEST(coalesce(public.entitlements.expires_at, now()), now()) + interval '14 days',
        updated_at = now();
  INSERT INTO public.referral_rewards(referral_id, user_id, role, reward_type, reward_value)
    VALUES (_ref.id, _uid, 'invitee', 'premium_days', jsonb_build_object('days',14));

  INSERT INTO public.entitlements(user_id, plan, expires_at)
  VALUES (_ref.inviter_id, 'premium', GREATEST(now(), coalesce(
      (SELECT expires_at FROM public.entitlements WHERE user_id=_ref.inviter_id), now())) + interval '30 days')
  ON CONFLICT (user_id) DO UPDATE
    SET plan='premium',
        expires_at = GREATEST(coalesce(public.entitlements.expires_at, now()), now()) + interval '30 days',
        updated_at = now();
  INSERT INTO public.referral_rewards(referral_id, user_id, role, reward_type, reward_value)
    VALUES (_ref.id, _ref.inviter_id, 'inviter', 'premium_days', jsonb_build_object('days',30));

  -- Badges
  INSERT INTO public.user_badges(user_id, badge_key) VALUES (_ref.inviter_id, 'referral_1')
    ON CONFLICT DO NOTHING;
  IF _inviter_total + 1 >= 5  THEN INSERT INTO public.user_badges(user_id,badge_key) VALUES (_ref.inviter_id,'referral_5')  ON CONFLICT DO NOTHING; END IF;
  IF _inviter_total + 1 >= 25 THEN INSERT INTO public.user_badges(user_id,badge_key) VALUES (_ref.inviter_id,'referral_25') ON CONFLICT DO NOTHING; END IF;

  -- Notifications
  INSERT INTO public.user_notifications(user_id, kind, title, body, data) VALUES
    (_uid, 'referral_redeemed', 'Welcome gift unlocked 🎁', '14 days of Premium added to your account.',
      jsonb_build_object('referral_id', _ref.id, 'days', 14)),
    (_ref.inviter_id, 'referral_rewarded', 'Someone joined with your code!', '30 days of Premium added — jazakAllahu khayran.',
      jsonb_build_object('referral_id', _ref.id, 'days', 30));

  RETURN jsonb_build_object('ok', true, 'invitee_days', 14, 'inviter_days', 30);
END; $$;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;

-- Claim a Juz slot in a group.
CREATE OR REPLACE FUNCTION public.claim_juz(_group_id uuid, _juz integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.is_khatm_member(_group_id, _uid) THEN RAISE EXCEPTION 'not_member'; END IF;
  IF _juz < 1 OR _juz > 30 THEN RAISE EXCEPTION 'invalid_juz'; END IF;

  INSERT INTO public.khatm_juz_claims(group_id, juz_number, user_id)
    VALUES (_group_id, _juz, _uid);
  INSERT INTO public.khatm_events(group_id, user_id, kind, data)
    VALUES (_group_id, _uid, 'juz_claimed', jsonb_build_object('juz', _juz));
  RETURN jsonb_build_object('ok', true, 'juz', _juz);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'juz_taken';
END; $$;
GRANT EXECUTE ON FUNCTION public.claim_juz(uuid,integer) TO authenticated;

-- Mark a juz complete; auto-complete the group when all 30 are done.
CREATE OR REPLACE FUNCTION public.complete_juz(_group_id uuid, _juz integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _done int;
  _members uuid[];
  _m uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  UPDATE public.khatm_juz_claims
    SET completed_at = now()
    WHERE group_id=_group_id AND juz_number=_juz AND user_id=_uid AND completed_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_your_claim_or_done'; END IF;

  INSERT INTO public.user_badges(user_id, badge_key) VALUES (_uid, 'khatm_juz') ON CONFLICT DO NOTHING;
  INSERT INTO public.khatm_events(group_id, user_id, kind, data)
    VALUES (_group_id, _uid, 'juz_completed', jsonb_build_object('juz', _juz));

  SELECT count(*) INTO _done FROM public.khatm_juz_claims
    WHERE group_id=_group_id AND completed_at IS NOT NULL;

  IF _done >= 30 THEN
    UPDATE public.khatm_groups SET completed_at = now() WHERE id=_group_id AND completed_at IS NULL;
    SELECT array_agg(user_id) INTO _members FROM public.khatm_group_members WHERE group_id=_group_id;
    FOREACH _m IN ARRAY coalesce(_members, ARRAY[]::uuid[]) LOOP
      INSERT INTO public.user_badges(user_id, badge_key) VALUES (_m, 'khatm_group') ON CONFLICT DO NOTHING;
      INSERT INTO public.user_notifications(user_id, kind, title, body, data) VALUES
        (_m, 'khatm_completed', 'Khatm complete! 🕌', 'Your group finished the Quran together. May Allah accept it.',
          jsonb_build_object('group_id', _group_id));
    END LOOP;
    INSERT INTO public.khatm_events(group_id, kind, data)
      VALUES (_group_id, 'group_completed', '{}'::jsonb);
  END IF;
  RETURN jsonb_build_object('ok', true, 'completed_juz', _done);
END; $$;
GRANT EXECUTE ON FUNCTION public.complete_juz(uuid,integer) TO authenticated;

-- Record a streak activity for today (idempotent per user/day).
CREATE OR REPLACE FUNCTION public.record_streak_activity()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _row RECORD;
  _today date := (now() at time zone 'utc')::date;
  _yesterday date := _today - 1;
  _new_current int;
  _new_longest int;
  _milestones int[] := ARRAY[3,7,14,30,60,100,180,365,500,1000];
  _m int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _row FROM public.streaks WHERE user_id=_uid FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.streaks(user_id, current_streak, longest_streak, last_completed_date, total_doses_completed)
      VALUES (_uid, 1, 1, _today, 1);
    _new_current := 1; _new_longest := 1;
  ELSIF _row.last_completed_date = _today THEN
    RETURN jsonb_build_object('ok', true, 'unchanged', true, 'current', _row.current_streak);
  ELSE
    IF _row.last_completed_date = _yesterday THEN
      _new_current := _row.current_streak + 1;
    ELSIF _row.last_completed_date < _yesterday THEN
      -- Auto-consume a freeze if the gap is exactly 1 extra day
      IF _row.last_completed_date = _yesterday - 1 THEN
        UPDATE public.streak_freezes SET used_at = now()
          WHERE id = (SELECT id FROM public.streak_freezes
                      WHERE user_id=_uid AND used_at IS NULL
                      ORDER BY granted_at LIMIT 1);
        IF FOUND THEN
          _new_current := _row.current_streak + 1;
        ELSE
          _new_current := 1;
        END IF;
      ELSE
        _new_current := 1;
      END IF;
    ELSE
      _new_current := _row.current_streak + 1;
    END IF;
    _new_longest := GREATEST(_row.longest_streak, _new_current);
    UPDATE public.streaks
      SET current_streak=_new_current,
          longest_streak=_new_longest,
          last_completed_date=_today,
          total_doses_completed=_row.total_doses_completed + 1,
          updated_at=now()
      WHERE user_id=_uid;
  END IF;

  -- Weekly freeze grant: at most 1 unused freeze, granted no more than 1x per 7 days
  IF NOT EXISTS (SELECT 1 FROM public.streak_freezes WHERE user_id=_uid AND used_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM public.streak_freezes WHERE user_id=_uid AND granted_at > now() - interval '7 days')
  THEN
    INSERT INTO public.streak_freezes(user_id) VALUES (_uid);
  END IF;

  -- Milestones + badges
  FOREACH _m IN ARRAY _milestones LOOP
    IF _new_current = _m THEN
      INSERT INTO public.streak_milestones(user_id, milestone) VALUES (_uid, _m)
        ON CONFLICT DO NOTHING;
      INSERT INTO public.user_notifications(user_id, kind, title, body, data) VALUES
        (_uid, 'streak_milestone', _m || '-day streak! 🔥', 'Keep going — share your milestone.',
          jsonb_build_object('milestone', _m));
      IF _m IN (3,7,30,100,365) THEN
        INSERT INTO public.user_badges(user_id, badge_key)
          VALUES (_uid, 'streak_' || _m) ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'current', _new_current, 'longest', _new_longest);
END; $$;
GRANT EXECUTE ON FUNCTION public.record_streak_activity() TO authenticated;

-- Unread notification count helper.
CREATE OR REPLACE FUNCTION public.unread_notification_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT count(*)::int FROM public.user_notifications
    WHERE user_id = auth.uid() AND read_at IS NULL;
$$;
GRANT EXECUTE ON FUNCTION public.unread_notification_count() TO authenticated;
