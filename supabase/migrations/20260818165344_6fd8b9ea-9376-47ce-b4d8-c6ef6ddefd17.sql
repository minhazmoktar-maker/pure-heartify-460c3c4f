SELECT cron.unschedule('ingest-captions-bulk-2min');
SELECT cron.unschedule('ingest-captions-ai-hourly');

SELECT cron.schedule('ingest-captions-bulk-2min', '*/2 * * * *', $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/ingest-captions',
    headers:=jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"limit":60,"concurrency":10,"allow_ai":false}'::jsonb,
    timeout_milliseconds:=20000);
$$);

SELECT cron.schedule('ingest-captions-ai-hourly', '25 * * * *', $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/ingest-captions',
    headers:=jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"limit":4,"allow_ai":true}'::jsonb,
    timeout_milliseconds:=20000);
$$);