SELECT set_config('app.streak_rpc', 'on', false);

WITH days AS (
  SELECT user_id, (watched_at AT TIME ZONE 'utc')::date AS d FROM public.watch_history
  UNION
  SELECT user_id, day::date FROM public.audio_listen_daily
), grp AS (
  SELECT user_id, d, d - (row_number() OVER (PARTITION BY user_id ORDER BY d))::int AS g
  FROM (SELECT DISTINCT user_id, d FROM days) s
), runs AS (
  SELECT user_id, g, count(*)::int AS len, max(d) AS run_end FROM grp GROUP BY user_id, g
), agg AS (
  SELECT user_id,
         max(len) AS longest,
         max(CASE WHEN run_end >= (now() AT TIME ZONE 'utc')::date - 1 THEN len ELSE 0 END) AS current,
         max(run_end) AS last_day,
         (SELECT count(DISTINCT d) FROM grp gg WHERE gg.user_id = runs.user_id)::int AS total_days
  FROM runs GROUP BY user_id
)
UPDATE public.streaks s
SET current_streak = GREATEST(s.current_streak, a.current),
    longest_streak = GREATEST(s.longest_streak, a.longest, s.current_streak, a.current),
    last_completed_date = GREATEST(s.last_completed_date, a.last_day),
    total_doses_completed = GREATEST(s.total_doses_completed, a.total_days),
    updated_at = now()
FROM agg a
WHERE a.user_id = s.user_id;

SELECT set_config('app.streak_rpc', 'off', false);