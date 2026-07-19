
CREATE OR REPLACE FUNCTION public.refresh_active_taste_profiles(_max_users int DEFAULT 500)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
  _n int := 0;
BEGIN
  FOR _uid IN
    SELECT DISTINCT user_id FROM (
      SELECT user_id, MAX(at) AS at FROM (
        SELECT user_id, watched_at AS at FROM public.watch_history
          WHERE watched_at >= now() - interval '14 days'
        UNION ALL
        SELECT user_id, created_at FROM public.favorites
          WHERE created_at >= now() - interval '14 days'
        UNION ALL
        SELECT user_id, last_action_at FROM public.feed_impressions
          WHERE last_action_at >= now() - interval '14 days'
      ) s
      GROUP BY user_id
      ORDER BY MAX(at) DESC
      LIMIT _max_users
    ) t
  LOOP
    PERFORM public.refresh_user_taste_profile(_uid);
    _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.refresh_active_taste_profiles(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_active_taste_profiles(int) TO service_role;

-- Unschedule prior versions if they exist, then schedule every 15 min.
DO $$ BEGIN
  PERFORM cron.unschedule('refresh-taste-profiles-15m');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'refresh-taste-profiles-15m',
  '*/15 * * * *',
  $$SELECT public.refresh_active_taste_profiles(500);$$
);
