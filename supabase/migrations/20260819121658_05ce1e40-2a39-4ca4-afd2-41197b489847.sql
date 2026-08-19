
CREATE OR REPLACE FUNCTION public.return_digest(p_limit integer DEFAULT 6)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_last timestamptz;
  v_langs text[];
  v_items jsonb := '[]'::jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 6), 1), 12);
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'last_seen', NULL, 'away_hours', NULL);
  END IF;

  SELECT max(watched_at) INTO v_last FROM public.watch_history WHERE user_id = v_uid;
  IF v_last IS NULL THEN
    RETURN jsonb_build_object('items', '[]'::jsonb, 'last_seen', NULL, 'away_hours', NULL);
  END IF;

  SELECT coalesce(
           array_agg(DISTINCT x) FILTER (WHERE x IS NOT NULL),
           ARRAY[]::text[]
         )
    INTO v_langs
    FROM (
      SELECT jsonb_array_elements_text(coalesce(p.preferences->'content_languages', '[]'::jsonb)) AS x
      FROM public.profiles p WHERE p.user_id = v_uid
    ) s;

  WITH base AS (
    SELECT v.*
    FROM public.curated_videos v
    WHERE v.is_hidden = false
      AND v.is_archived = false
      AND coalesce(v.embeddable, true) = true
      AND v.moderation_state IN ('approved', 'auto_approved')
      AND coalesce(v.is_premium_only, false) = false
  ),
  resume AS (
    SELECT b.video_id, b.title, b.channel_title, b.thumbnail_url, b.category,
           'resume'::text AS kind,
           'Pick up where you left off'::text AS reason,
           w.progress_seconds AS progress_seconds,
           w.watched_at AS sort_at
    FROM public.watch_history w
    JOIN base b ON b.video_id = w.video_id
    WHERE w.user_id = v_uid
      AND coalesce(w.completed, false) = false
      AND coalesce(w.progress_seconds, 0) > 30
      AND (w.duration_seconds IS NULL OR w.progress_seconds < w.duration_seconds * 0.9)
    ORDER BY w.watched_at DESC
    LIMIT 2
  ),
  follows AS (
    SELECT b.video_id, b.title, b.channel_title, b.thumbnail_url, b.category,
           'follow_upload'::text AS kind,
           'New from a creator you follow'::text AS reason,
           NULL::integer AS progress_seconds,
           coalesce(b.published_at, b.ingested_at) AS sort_at
    FROM public.channel_follows f
    JOIN public.approved_channels c ON c.id = f.channel_id
    JOIN base b ON b.channel_id = c.youtube_channel_id
    WHERE f.follower_id = v_uid
      AND coalesce(b.ingested_at, b.published_at) > v_last
      AND NOT EXISTS (
        SELECT 1 FROM public.watch_history wh
        WHERE wh.user_id = v_uid AND wh.video_id = b.video_id
      )
    ORDER BY coalesce(b.published_at, b.ingested_at) DESC
    LIMIT 3
  ),
  gems AS (
    SELECT b.video_id, b.title, b.channel_title, b.thumbnail_url, b.category,
           'fresh_gem'::text AS kind,
           'A hidden gem since your last visit'::text AS reason,
           NULL::integer AS progress_seconds,
           coalesce(b.ingested_at, b.published_at) AS sort_at
    FROM base b
    WHERE coalesce(b.ingested_at, b.published_at) > v_last
      AND coalesce(b.halal_score, 0) >= 92
      AND coalesce(b.is_trusted_channel, false) = true
      AND (cardinality(v_langs) = 0 OR b.content_language = ANY (v_langs))
      AND NOT EXISTS (
        SELECT 1 FROM public.watch_history wh
        WHERE wh.user_id = v_uid AND wh.video_id = b.video_id
      )
    ORDER BY coalesce(b.view_count, 0) ASC, coalesce(b.ingested_at, b.published_at) DESC
    LIMIT 3
  ),
  merged AS (
    SELECT DISTINCT ON (video_id) *
    FROM (
      SELECT * FROM resume
      UNION ALL SELECT * FROM follows
      UNION ALL SELECT * FROM gems
    ) u
  )
  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY
            CASE m.kind WHEN 'resume' THEN 0 WHEN 'follow_upload' THEN 1 ELSE 2 END,
            m.sort_at DESC), '[]'::jsonb)
    INTO v_items
  FROM (SELECT * FROM merged LIMIT v_limit) m;

  RETURN jsonb_build_object(
    'items', v_items,
    'last_seen', v_last,
    'away_hours', round(extract(epoch FROM (now() - v_last)) / 3600.0)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.return_digest(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.return_digest(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.return_digest(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_digest(integer) TO service_role;

INSERT INTO public.event_schemas (event_name, description, required_properties, is_active)
VALUES
  ('return.digest_viewed', 'Since-you-were-away summary rendered with at least one real item', ARRAY['item_count','away_hours'], true),
  ('return.digest_clicked', 'User opened a video from the since-you-were-away summary', ARRAY['video_id','kind','position'], true),
  ('return.digest_dismissed', 'User dismissed the since-you-were-away summary', ARRAY['item_count'], true)
ON CONFLICT (event_name) DO UPDATE
  SET description = EXCLUDED.description,
      required_properties = EXCLUDED.required_properties,
      is_active = true;
