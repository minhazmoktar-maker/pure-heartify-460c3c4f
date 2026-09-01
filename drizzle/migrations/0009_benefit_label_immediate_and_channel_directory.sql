-- 1) Allow an immediate (T+0) benefit label so the in-feed one-tap prompt has volume.
ALTER TABLE public.benefit_labels DROP CONSTRAINT IF EXISTS benefit_labels_horizon_days_check;
ALTER TABLE public.benefit_labels
  ADD CONSTRAINT benefit_labels_horizon_days_check
  CHECK (horizon_days = ANY (ARRAY[0, 7, 30, 90]));

CREATE OR REPLACE FUNCTION public.queue_benefit_label_now(_video_id text, _video_title text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _video_id IS NULL OR length(_video_id) = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.benefit_labels (user_id, video_id, video_title, horizon_days, watched_at, due_at)
  VALUES (auth.uid(), _video_id, left(coalesce(_video_title, ''), 300), 0, now(), now())
  ON CONFLICT (user_id, video_id, horizon_days) DO NOTHING
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_benefit_label_now(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_benefit_label_now(text, text) TO authenticated, service_role;

-- Fresh watches (last 30 min) are asked first: recall is strongest then.
CREATE OR REPLACE FUNCTION public.get_due_benefit_label()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.benefit_labels b
  SET asked_at = COALESCE(b.asked_at, now())
  WHERE b.id = (
    SELECT id FROM public.benefit_labels
    WHERE user_id = auth.uid()
      AND responded_at IS NULL
      AND due_at <= now()
      AND dismissed_count < 3
    ORDER BY (watched_at > now() - interval '30 minutes') DESC, horizon_days DESC, due_at
    LIMIT 1
  )
  RETURNING jsonb_build_object(
    'id', b.id,
    'video_id', b.video_id,
    'video_title', b.video_title,
    'horizon_days', b.horizon_days,
    'watched_at', b.watched_at
  ) INTO row_out;

  RETURN row_out;
END;
$$;

-- 2) Public Muslim directory of approved channels (follow + upload notifications).
CREATE OR REPLACE FUNCTION public.list_directory_channels(
  _q text DEFAULT NULL,
  _limit int DEFAULT 60,
  _offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.youtube_channel_id AS channel_id,
           c.title,
           c.handle,
           c.category,
           c.trust_tier::text AS trust_tier,
           c.consistency_score,
           (SELECT count(*) FROM public.video_candidates v
             WHERE v.youtube_channel_id = c.youtube_channel_id
               AND v.status = 'approved') AS video_count,
           (SELECT v.thumbnail_url FROM public.video_candidates v
             WHERE v.youtube_channel_id = c.youtube_channel_id
               AND v.status = 'approved'
             ORDER BY v.created_at DESC LIMIT 1) AS thumbnail_url
      FROM public.approved_channels c
     WHERE c.status = 'approved'
       AND (_q IS NULL OR _q = '' OR c.title ILIKE '%' || _q || '%' OR coalesce(c.handle,'') ILIKE '%' || _q || '%')
     ORDER BY c.trust_tier, coalesce(c.consistency_score, 0) DESC, c.title
     LIMIT greatest(1, least(coalesce(_limit, 60), 100))
    OFFSET greatest(0, coalesce(_offset, 0))
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(base) ORDER BY trust_tier, video_count DESC), '[]'::jsonb) FROM base;
$$;

REVOKE ALL ON FUNCTION public.list_directory_channels(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_directory_channels(text, int, int) TO anon, authenticated, service_role;