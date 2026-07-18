
-- Recommendation Engine v3 — impression memory, pool mix config, explainability

CREATE TABLE public.feed_impressions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_count INT NOT NULL DEFAULT 1,
  last_action TEXT,
  last_action_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, video_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feed_impressions TO authenticated;
GRANT ALL ON public.feed_impressions TO service_role;

ALTER TABLE public.feed_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_impressions_select" ON public.feed_impressions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_impressions_insert" ON public.feed_impressions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_impressions_update" ON public.feed_impressions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_impressions_delete" ON public.feed_impressions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_feed_impressions_user_seen ON public.feed_impressions (user_id, last_seen_at DESC);
CREATE INDEX idx_feed_impressions_user_count ON public.feed_impressions (user_id, seen_count);

-- Bulk upsert RPC — increments seen_count on conflict, resets on positive action.
CREATE OR REPLACE FUNCTION public.log_feed_impressions(_video_ids TEXT[])
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _n INT := 0;
BEGIN
  IF _uid IS NULL OR _video_ids IS NULL OR array_length(_video_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;
  INSERT INTO public.feed_impressions (user_id, video_id, first_seen_at, last_seen_at, seen_count)
  SELECT _uid, v, now(), now(), 1
  FROM unnest(_video_ids) AS v
  WHERE v IS NOT NULL AND length(v) > 0
  ON CONFLICT (user_id, video_id) DO UPDATE
    SET seen_count = feed_impressions.seen_count + 1,
        last_seen_at = now();
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.log_feed_impressions(TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_feed_impressions(TEXT[]) TO authenticated, service_role;

-- Positive action reset
CREATE OR REPLACE FUNCTION public.mark_feed_action(_video_id TEXT, _action TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL OR _video_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.feed_impressions (user_id, video_id, seen_count, last_action, last_action_at)
  VALUES (_uid, _video_id, 0, _action, now())
  ON CONFLICT (user_id, video_id) DO UPDATE
    SET seen_count = CASE
          WHEN _action IN ('watch','complete','save','share','follow','rewatch') THEN 0
          ELSE feed_impressions.seen_count
        END,
        last_action = _action,
        last_action_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_feed_action(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_feed_action(TEXT, TEXT) TO authenticated, service_role;

-- Nightly purge (>30d old with no positive action)
CREATE OR REPLACE FUNCTION public.purge_feed_impressions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n INT;
BEGIN
  DELETE FROM public.feed_impressions
  WHERE last_seen_at < now() - interval '30 days'
    AND (last_action IS NULL OR last_action_at < now() - interval '30 days');
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_feed_impressions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_feed_impressions() TO service_role;

-- Seed pool-mix config (owner-editable via _internal_config UI)
INSERT INTO public._internal_config (key, value)
VALUES (
  'reco_pool_mix',
  jsonb_build_object(
    'recently_added', 0.20,
    'deep_personal',  0.35,
    'trending',       0.15,
    'hidden_gems',    0.10,
    'continue',       0.10,
    'rediscovery',    0.05,
    'exploration',    0.05
  )
)
ON CONFLICT (key) DO NOTHING;
