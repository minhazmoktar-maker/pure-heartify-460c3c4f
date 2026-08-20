SELECT cron.unschedule('visual-safety-sweep-1min');
SELECT cron.schedule('visual-safety-sweep-1min', '* * * * *', $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/visual-safety-sweep',
    headers:=jsonb_build_object('Content-Type','application/json',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"batch":200}'::jsonb,
    timeout_milliseconds:=120000);
$$);