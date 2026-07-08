
-- Rate-limit counters. Rows are ephemeral; they exist only to protect us
-- against abuse and runaway costs. Access is limited to service_role so
-- edge functions can bump counters via the SECURITY DEFINER helper below.

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  identity   TEXT        NOT NULL,
  action     TEXT        NOT NULL,
  bucket_at  TIMESTAMPTZ NOT NULL,
  count      INTEGER     NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (identity, action, bucket_at)
);

CREATE INDEX IF NOT EXISTS rate_limit_counters_bucket_idx
  ON public.rate_limit_counters (bucket_at);

GRANT ALL ON public.rate_limit_counters TO service_role;
-- No grants to anon or authenticated — this table is server-only.

ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON public.rate_limit_counters;
CREATE POLICY "service role only"
  ON public.rate_limit_counters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.rate_limit_increment(
  _identity TEXT,
  _action   TEXT,
  _bucket   TIMESTAMPTZ
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.rate_limit_counters (identity, action, bucket_at, count, updated_at)
  VALUES (_identity, _action, _bucket, 1, now())
  ON CONFLICT (identity, action, bucket_at)
  DO UPDATE SET
    count = public.rate_limit_counters.count + 1,
    updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- Restrict execution to service_role (edge functions). Prevents any client
-- from calling the helper directly to inflate someone else's counter.
REVOKE ALL ON FUNCTION public.rate_limit_increment(TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_limit_increment(TEXT, TEXT, TIMESTAMPTZ) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_increment(TEXT, TEXT, TIMESTAMPTZ) TO service_role;

CREATE OR REPLACE FUNCTION public.rate_limit_cleanup(_older_than_minutes INTEGER DEFAULT 60)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  removed INTEGER;
BEGIN
  DELETE FROM public.rate_limit_counters
  WHERE bucket_at < now() - make_interval(mins => _older_than_minutes);
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_cleanup(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_limit_cleanup(INTEGER) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_cleanup(INTEGER) TO service_role;

-- Backfill content_language when possible (H11 mitigation).
-- If ingestion has stamped a locale in moderation_signals, mirror it into
-- curated_videos.content_language so the language_match ranker actually fires.
UPDATE public.curated_videos v
   SET content_language = lower(v.moderation_signals->>'detected_language')
 WHERE v.content_language IS NULL
   AND v.moderation_signals ? 'detected_language'
   AND length(v.moderation_signals->>'detected_language') BETWEEN 2 AND 8;
