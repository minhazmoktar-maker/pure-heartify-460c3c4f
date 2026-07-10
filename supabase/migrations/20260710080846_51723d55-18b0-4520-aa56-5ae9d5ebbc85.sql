
CREATE OR REPLACE FUNCTION public.get_public_weekly_recap(_handle text, _week_start date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'handle', p.handle,
    'display_name', p.display_name,
    'week_start', r.week_start,
    'minutes_watched', r.minutes_watched,
    'favorites_added', r.favorites_added,
    'dhikr_count', r.dhikr_count,
    'juz_completed', r.juz_completed,
    'streak_length', r.streak_length
  )
  FROM public.profiles p
  JOIN public.weekly_recaps r ON r.user_id = p.user_id
  WHERE p.handle IS NOT NULL
    AND lower(p.handle) = lower(_handle)
    AND r.week_start = _week_start
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_weekly_recap(text, date) TO anon, authenticated;
