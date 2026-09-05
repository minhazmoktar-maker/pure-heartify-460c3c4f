-- lovable-cron-fallback-reviewed: 720 runs/day; edge isolates evict after ~1-2 min idle, so only a sub-2-minute ping keeps the first real user off the 4-6s cold path. No row change or webhook can trigger this — it is purely time-based warmth.
CREATE OR REPLACE FUNCTION public.warm_serving_functions()
RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _base text := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/';
  _hdr jsonb := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE');
BEGIN
  PERFORM net.http_post(url := _base || 'feed', headers := _hdr, body := '{"limit":1}'::jsonb);
  PERFORM net.http_post(url := _base || 'recommendations', headers := _hdr, body := '{"limit":1}'::jsonb);
  PERFORM net.http_post(url := _base || 'search', headers := _hdr, body := '{"q":"quran","limit":1}'::jsonb);
END; $$;

REVOKE ALL ON FUNCTION public.warm_serving_functions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.warm_serving_functions() TO service_role;

SELECT cron.unschedule('warm-serving-functions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'warm-serving-functions');

SELECT cron.schedule('warm-serving-functions', '*/2 * * * *',
  $$ SELECT public.warm_serving_functions(); $$);