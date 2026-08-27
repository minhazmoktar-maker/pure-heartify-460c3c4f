DROP FUNCTION IF EXISTS public.admin_unchecked_videos(text, integer, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_unchecked_videos(
  _channel text DEFAULT NULL,
  _min_age_hours integer DEFAULT NULL,
  _dedup_status text DEFAULT NULL,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  video_id text, title text, channel_id text, channel_title text,
  thumbnail_url text, moderation_state text, visual_state text,
  visual_checked_at timestamptz, ingested_at timestamptz, age_hours numeric,
  duplicate_group_id text, is_duplicate_canonical boolean, total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT cv.*
    FROM public.curated_videos cv
    WHERE cv.moderation_state IN ('approved','auto_approved')
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND cv.is_archived = false
      AND (_channel IS NULL
           OR cv.channel_title ILIKE '%' || _channel || '%'
           OR cv.channel_id = _channel)
      AND (_min_age_hours IS NULL
           OR cv.ingested_at <= now() - make_interval(hours => _min_age_hours))
      AND (_dedup_status IS NULL
           OR (_dedup_status = 'grouped'   AND cv.duplicate_group_id IS NOT NULL)
           OR (_dedup_status = 'ungrouped' AND cv.duplicate_group_id IS NULL)
           OR (_dedup_status = 'canonical' AND cv.is_duplicate_canonical IS TRUE))
  ), counted AS (SELECT count(*) AS n FROM base)
  SELECT b.video_id, b.title, b.channel_id, b.channel_title, b.thumbnail_url,
         b.moderation_state::text, b.visual_state, b.visual_checked_at, b.ingested_at,
         round(extract(epoch FROM now() - b.ingested_at) / 3600.0, 1),
         b.duplicate_group_id, b.is_duplicate_canonical, c.n
  FROM base b CROSS JOIN counted c
  ORDER BY b.ingested_at ASC NULLS FIRST
  LIMIT GREATEST(LEAST(_limit, 500), 1)
  OFFSET GREATEST(_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unchecked_videos(text, integer, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unchecked_videos(text, integer, text, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_queue_visual_scan(
  _video_ids text[] DEFAULT NULL,
  _channel text DEFAULT NULL,
  _min_age_hours integer DEFAULT NULL,
  _dedup_status text DEFAULT NULL,
  _max integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor uuid := auth.uid();
  _ids text[];
  _n integer;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT array_agg(video_id) INTO _ids FROM (
    SELECT cv.video_id
    FROM public.curated_videos cv
    WHERE cv.moderation_state IN ('approved','auto_approved')
      AND cv.is_archived = false
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND (_video_ids IS NULL OR cv.video_id = ANY(_video_ids))
      AND (_channel IS NULL
           OR cv.channel_title ILIKE '%' || _channel || '%'
           OR cv.channel_id = _channel)
      AND (_min_age_hours IS NULL
           OR cv.ingested_at <= now() - make_interval(hours => _min_age_hours))
      AND (_dedup_status IS NULL
           OR (_dedup_status = 'grouped'   AND cv.duplicate_group_id IS NOT NULL)
           OR (_dedup_status = 'ungrouped' AND cv.duplicate_group_id IS NULL)
           OR (_dedup_status = 'canonical' AND cv.is_duplicate_canonical IS TRUE))
    ORDER BY cv.ingested_at ASC NULLS FIRST
    LIMIT GREATEST(LEAST(_max, 2000), 1)
  ) s;

  IF _ids IS NULL THEN
    RETURN jsonb_build_object('queued', 0, 'reason', 'nothing_matched');
  END IF;

  UPDATE public.curated_videos
  SET visual_state = 'unchecked', visual_checked_at = NULL
  WHERE video_id = ANY(_ids);
  GET DIAGNOSTICS _n = ROW_COUNT;

  INSERT INTO public.video_audit_log (video_id, action, actor_id, reason, metadata)
  SELECT vid, 'queued_visual_scan', _actor, 'admin one-click requeue for next sweep',
         jsonb_build_object('batch_size', _n)
  FROM unnest(_ids) AS vid;

  RETURN jsonb_build_object('queued', _n, 'video_ids', to_jsonb(_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_queue_visual_scan(text[], text, integer, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_queue_visual_scan(text[], text, integer, text, integer) TO authenticated, service_role;
