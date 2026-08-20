-- 1) Public comment reads must not call has_role(): anon has no EXECUTE on it,
-- so the combined policy made every signed-out read fail with 42501.
DROP POLICY IF EXISTS "Anyone can read visible comments" ON public.video_comments;

CREATE POLICY "Anon can read visible comments"
  ON public.video_comments FOR SELECT TO anon
  USING (status = 'visible');

CREATE POLICY "Members read visible, own and admin comments"
  ON public.video_comments FOR SELECT TO authenticated
  USING (status = 'visible' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 2) Reduce YouTube quota pressure from the embeddability sweep: hourly,
-- smaller batches (was every 10 minutes with 40 batches = ~5.7k units/day).
SELECT cron.unschedule('sweep-embeddable-10min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep-embeddable-10min');

SELECT cron.schedule(
  'sweep-embeddable-hourly',
  '17 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/sweep-embeddable?batches=20',
    headers:=jsonb_build_object('Content-Type','application/json',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{}'::jsonb,
    timeout_milliseconds:=180000);
  $$
);