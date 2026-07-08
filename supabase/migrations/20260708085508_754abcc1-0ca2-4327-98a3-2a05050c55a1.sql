
CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  video_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression','click','dismiss','convert')),
  score real,
  reasons jsonb DEFAULT '[]'::jsonb,
  signals jsonb DEFAULT '{}'::jsonb,
  surface text,
  session_id text,
  provider text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.recommendation_events TO authenticated;
GRANT INSERT ON public.recommendation_events TO anon;
GRANT ALL ON public.recommendation_events TO service_role;

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own recommendation events"
  ON public.recommendation_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all recommendation events"
  ON public.recommendation_events FOR SELECT
  USING (public.has_min_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can log recommendation events they saw"
  ON public.recommendation_events FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS recommendation_events_user_idx
  ON public.recommendation_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_events_video_idx
  ON public.recommendation_events (video_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_events_recent_idx
  ON public.recommendation_events (created_at DESC);

-- Aggregate popularity signal used by the trending stage. Cheap read: bounded
-- to the last 14 days and joins on curated_videos, which stays hot in cache.
CREATE OR REPLACE FUNCTION public.get_trending_video_ids(_limit int DEFAULT 200, _window_hours int DEFAULT 336)
RETURNS TABLE (video_id text, hits bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT re.video_id, count(*) AS hits
  FROM public.recommendation_events re
  WHERE re.created_at > now() - make_interval(hours => _window_hours)
    AND re.event_type IN ('click','convert')
  GROUP BY re.video_id
  ORDER BY hits DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_trending_video_ids(int, int) TO anon, authenticated;
