
-- Guard sensitive counters/stats from client-side manipulation.
-- Approach: BEFORE UPDATE triggers reset protected columns to OLD when the caller
-- is not the service_role (i.e., anon/authenticated JWT). Trusted server code
-- using the service role key (edge functions, SECURITY DEFINER rpcs invoked
-- from trusted contexts) can still write these fields.

-- 1) dhikr_circles: host may edit title/phrase/target_count/is_active/ends_at,
--    but not current_count.
CREATE OR REPLACE FUNCTION public.protect_dhikr_circles_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.current_count := OLD.current_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_dhikr_circles_counters ON public.dhikr_circles;
CREATE TRIGGER trg_protect_dhikr_circles_counters
BEFORE UPDATE ON public.dhikr_circles
FOR EACH ROW EXECUTE FUNCTION public.protect_dhikr_circles_counters();

-- 2) streaks: users cannot self-edit streak stats.
CREATE OR REPLACE FUNCTION public.protect_streak_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.current_streak := OLD.current_streak;
    NEW.longest_streak := OLD.longest_streak;
    NEW.total_doses_completed := OLD.total_doses_completed;
    NEW.last_completed_date := OLD.last_completed_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_streak_stats ON public.streaks;
CREATE TRIGGER trg_protect_streak_stats
BEFORE UPDATE ON public.streaks
FOR EACH ROW EXECUTE FUNCTION public.protect_streak_stats();

-- 3) team_streaks: creator can only edit name/member_limit; streak counters
--    and invite_code are server-managed.
CREATE OR REPLACE FUNCTION public.protect_team_streak_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.current_streak := OLD.current_streak;
    NEW.longest_streak := OLD.longest_streak;
    NEW.last_all_completed_date := OLD.last_all_completed_date;
    NEW.invite_code := OLD.invite_code;
    NEW.created_by := OLD.created_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_team_streak_stats ON public.team_streaks;
CREATE TRIGGER trg_protect_team_streak_stats
BEFORE UPDATE ON public.team_streaks
FOR EACH ROW EXECUTE FUNCTION public.protect_team_streak_stats();

-- 4) user_badges: remove self-insert; only service_role (edge functions /
--    security-definer RPCs run as service role) can grant badges.
DROP POLICY IF EXISTS ub_own_insert ON public.user_badges;
-- (No replacement policy for INSERT to authenticated: badges must be granted
--  by trusted server code that uses the service role.)

-- 5) video_comments: users may edit body/status of their own comment but
--    counters (likes_count, replies_count) are trigger-maintained.
CREATE OR REPLACE FUNCTION public.protect_video_comment_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.likes_count := OLD.likes_count;
    NEW.replies_count := OLD.replies_count;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_video_comment_counters ON public.video_comments;
CREATE TRIGGER trg_protect_video_comment_counters
BEFORE UPDATE ON public.video_comments
FOR EACH ROW EXECUTE FUNCTION public.protect_video_comment_counters();
