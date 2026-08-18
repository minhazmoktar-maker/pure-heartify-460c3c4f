-- YouTube now returns empty timedtext bodies to datacenter IPs, so the free
-- lane almost never lands. Run the AI lane frequently instead (it carries its
-- own daily budget cap) and keep the free lane as a cheap hourly probe.
SELECT cron.unschedule('ingest-captions-bulk-2min');
SELECT cron.unschedule('ingest-captions-ai-hourly');

SELECT cron.schedule('ingest-captions-ai-5min', '*/5 * * * *', $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/ingest-captions',
    headers:=jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"limit":4,"concurrency":2,"allow_ai":true,"daily_cap":600}'::jsonb,
    timeout_milliseconds:=20000);
$$);

SELECT cron.schedule('ingest-captions-free-probe-hourly', '45 * * * *', $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/ingest-captions',
    headers:=jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"limit":20,"concurrency":8,"allow_ai":false}'::jsonb,
    timeout_milliseconds:=20000);
$$);

-- Queue depth should track the AI budget (~600/day), not the whole corpus.
SELECT cron.unschedule('transcript-backlog-10min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'transcript-backlog-10min');
SELECT cron.schedule('transcript-backlog-hourly', '35 * * * *', $$select public.enqueue_transcript_backlog(80);$$);

-- Videos parked by the free lane are transcribable by AI — hand them back.
UPDATE public.transcript_jobs
   SET status = 'queued', attempts = 0, next_attempt_at = now(), updated_at = now()
 WHERE status = 'needs_ai';