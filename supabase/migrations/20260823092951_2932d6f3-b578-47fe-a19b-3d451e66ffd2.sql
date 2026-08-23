DO $$
DECLARE i int;
BEGIN
  FOR i IN 1..5 LOOP
    BEGIN
      PERFORM cron.unschedule('visual-safety-sweep-par-' || i);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'visual-safety-sweep-par-' || i,
      '* * * * *',
      $q$
      SELECT net.http_post(
        url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/visual-safety-sweep',
        headers:=jsonb_build_object('Content-Type','application/json',
          'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
        body:='{"batch":300}'::jsonb,
        timeout_milliseconds:=120000);
      $q$
    );
  END LOOP;
END $$;