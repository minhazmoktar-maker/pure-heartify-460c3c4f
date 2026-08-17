CREATE OR REPLACE FUNCTION public.autonomous_moderation_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_hidden int := 0;
  v_channels int := 0;
BEGIN
  -- 4a. Hide live videos matching high-confidence learned deny tokens.
  WITH deny AS (
    SELECT feature_value AS tok FROM public.moderation_learned_signals
     WHERE feature_type = 'blocked_title_token'
       AND weight <= -0.20 AND rejections >= 5
     LIMIT 400
  ),
  hit AS (
    SELECT DISTINCT cv.id
      FROM public.curated_videos cv
      JOIN deny d ON cv.search_tsv @@ plainto_tsquery('simple', d.tok)
     WHERE cv.is_archived = false
     LIMIT 5000
  ),
  upd AS (
    UPDATE public.curated_videos cv
       SET is_hidden = true, is_archived = true, moderation_state = 'rejected',
           moderation_reasoning = coalesce(cv.moderation_reasoning,'')
             || ' | learned policy: matches owner-block signal'
      FROM hit
     WHERE cv.id = hit.id
    RETURNING 1
  )
  SELECT count(*)::int INTO v_hidden FROM upd;

  -- 4b. Blocklist channels whose live catalog is dominated by denied signals.
  WITH deny AS (
    SELECT feature_value AS tok FROM public.moderation_learned_signals
     WHERE feature_type = 'blocked_title_token'
       AND weight <= -0.20 AND rejections >= 5
     LIMIT 400
  ),
  per_channel AS (
    SELECT lower(btrim(cv.channel_title)) AS ch,
           count(*)::int AS total,
           count(*) FILTER (
             WHERE EXISTS (SELECT 1 FROM deny d
                            WHERE cv.search_tsv @@ plainto_tsquery('simple', d.tok))
           )::int AS bad
      FROM public.curated_videos cv
     WHERE coalesce(cv.channel_title,'') <> ''
       AND cv.ingested_at > now() - interval '30 days'
     GROUP BY 1
    HAVING count(*) >= 10
  ),
  ins AS (
    INSERT INTO public.blocked_creators (pattern, match_mode, reason)
    SELECT ch, 'channel_exact', 'autonomous: learned deny signal share '
           || round((bad::numeric / total) * 100) || '%'
      FROM per_channel
     WHERE bad::numeric / total >= 0.30
       AND NOT EXISTS (
         SELECT 1 FROM public.blocked_creators bc
          WHERE bc.match_mode = 'channel_exact'
            AND lower(btrim(bc.pattern)) = per_channel.ch
       )
    RETURNING pattern
  )
  SELECT count(*)::int INTO v_channels FROM ins;

  IF v_channels > 0 THEN
    UPDATE public.curated_videos cv
       SET is_hidden = true, is_archived = true, moderation_state = 'rejected',
           moderation_reasoning = coalesce(cv.moderation_reasoning,'')
             || ' | autonomous channel block'
      FROM public.blocked_creators bc
     WHERE bc.match_mode = 'channel_exact'
       AND lower(btrim(cv.channel_title)) = lower(btrim(bc.pattern))
       AND cv.is_archived = false;
  END IF;

  INSERT INTO public.autonomy_log (kind, detail)
  VALUES ('autonomous_moderation_tick',
          jsonb_build_object('videos_hidden', v_hidden, 'channels_blocked', v_channels));

  INSERT INTO public.ops_metrics (metric, value, tags)
  VALUES ('autonomous_moderation', v_hidden,
          jsonb_build_object('videos_hidden', v_hidden, 'channels_blocked', v_channels));

  RETURN jsonb_build_object('videos_hidden', v_hidden, 'channels_blocked', v_channels);
END $fn$;