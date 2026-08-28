ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS pushed_at timestamptz;

CREATE INDEX IF NOT EXISTS user_notifications_unpushed_idx
  ON public.user_notifications (created_at)
  WHERE pushed_at IS NULL;

-- Schedule the background push fan-out worker (every minute).
DO $$
DECLARE fn_url text; secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  PERFORM cron.unschedule('notification-fanout') 
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notification-fanout');

  SELECT value INTO secret FROM public._internal_config WHERE key = 'cron_secret' LIMIT 1;
  fn_url := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/notification-fanout';

  PERFORM cron.schedule(
    'notification-fanout',
    '* * * * *',
    format(
      $cmd$select net.http_post(
        url := %L,
        headers := jsonb_build_object('content-type','application/json','x-cron-secret', %L),
        body := '{}'::jsonb,
        timeout_milliseconds := 25000
      );$cmd$,
      fn_url,
      COALESCE(secret, '')
    )
  );
END $$;