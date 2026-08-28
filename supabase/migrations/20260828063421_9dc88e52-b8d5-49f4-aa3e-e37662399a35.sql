-- YouTube's daily quota resets at midnight Pacific (08:00 UTC). Ingestion
-- normally consumes it during the day, which starved the duration sweep.
-- Reserve the first hour after reset for duration/embeddability verification:
-- 12 runs x 50 batches x 50 ids = up to 30k rows/day at ~600 quota units.
SELECT cron.schedule(
  'duration-backfill-burst',
  '*/5 8 * * *',
  $cmd$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/sweep-embeddable?batches=50',
    headers:=jsonb_build_object('Content-Type','application/json',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{}'::jsonb,
    timeout_milliseconds:=240000);
  $cmd$
);