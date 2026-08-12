-- Optional, privacy-preserving reminders for sadaqah challenges.
-- Only day/act COUNTS are ever referenced. No amounts, categories or notes.
CREATE OR REPLACE FUNCTION public.sadaqah_challenge_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'UTC')::date;
  r record;
  sent int := 0;
  considered int := 0;
BEGIN
  FOR r IN
    SELECT cm.user_id,
           min(GREATEST(0, (c.ends_at::date - today)))::int AS days_left,
           count(*)::int AS challenges
      FROM public.challenge_members cm
      JOIN public.challenges c ON c.id = cm.challenge_id
     WHERE cm.state = 'joined'
       AND c.type IN ('sadaqah_days', 'sadaqah_acts')
       AND c.starts_at <= now()
       AND c.ends_at >= now()
       AND NOT EXISTS (
             SELECT 1 FROM public.sadaqah_acts s
              WHERE s.user_id = cm.user_id AND s.day = today AND s.acts > 0
           )
     GROUP BY cm.user_id
  LOOP
    considered := considered + 1;
    IF public.social_notify(
         r.user_id,
         'sadaqah_challenge',
         'Your sadaqah challenge',
         CASE WHEN r.days_left <= 1
              THEN 'Last day — log today''s act of giving to complete your challenge.'
              ELSE 'You have not logged an act of giving today. ' || r.days_left || ' days left.'
         END,
         jsonb_build_object('url', '/sadaqah', 'challenges', r.challenges),
         1
       ) THEN
      sent := sent + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'considered', considered, 'sent', sent, 'day', today);
END; $$;

REVOKE ALL ON FUNCTION public.sadaqah_challenge_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sadaqah_challenge_reminders() TO service_role;

-- Daily at 17:00 UTC — late enough that most timezones have had a chance to give.
SELECT cron.unschedule('sadaqah-challenge-reminders')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sadaqah-challenge-reminders');

SELECT cron.schedule(
  'sadaqah-challenge-reminders',
  '0 17 * * *',
  $$ SELECT public.sadaqah_challenge_reminders(); $$
);