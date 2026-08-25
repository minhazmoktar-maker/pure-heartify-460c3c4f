DO $do$
DECLARE
  r record;
  new_def text;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('channel_pipeline_tick', 'benefit_ranker_autoramp')
  LOOP
    new_def := regexp_replace(
      r.def,
      'INSERT\s+INTO\s+public\.autonomy_log\s*\(\s*action\s*,',
      'INSERT INTO public.autonomy_log (kind,',
      'gi'
    );
    IF new_def <> r.def THEN
      EXECUTE new_def;
    END IF;
  END LOOP;
END
$do$;