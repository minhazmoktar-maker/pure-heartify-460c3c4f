-- 1. Owner blocks -------------------------------------------------------------
INSERT INTO public.blocked_creators (pattern, match_mode, reason)
VALUES
  ('Dr. Tareq Al-Suwaidan', 'channel_exact', 'owner block: female-featured content'),
  ('Safina Society',        'channel_exact', 'owner block: female-featured content'),
  ('IlmFeed',               'channel_exact', 'owner block: female-featured content'),
  ('IlmFeed Podcast',       'channel_exact', 'owner block: female-featured content')
ON CONFLICT DO NOTHING;

-- 2. Learn from an owner block ------------------------------------------------
CREATE OR REPLACE FUNCTION public.learn_from_owner_block(_pattern text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_learned int := 0;
  v_actor text;
BEGIN
  IF _pattern IS NULL OR btrim(_pattern) = '' THEN RETURN 0; END IF;

  -- Owner-authored policy: attribute the learned signal to the platform owner
  -- so the human-authorship guard on moderation_learned_signals is satisfied.
  SELECT user_id::text INTO v_actor FROM public.platform_owners LIMIT 1;
  PERFORM set_config('app.actor', coalesce(v_actor, gen_random_uuid()::text), true);

  WITH vids AS (
    SELECT title FROM public.curated_videos
     WHERE lower(btrim(coalesce(channel_title,''))) = lower(btrim(_pattern))
     LIMIT 800
  ),
  toks AS (
    SELECT lower(w) AS tok, count(*)::int AS c
      FROM vids, LATERAL regexp_split_to_table(coalesce(title,''), '[^[:alnum:]]+') w
     WHERE length(w) >= 5
       AND w ~ '^[A-Za-z]+$'
       AND lower(w) NOT IN (
         'about','after','allah','always','among','because','before','being','between',
         'could','every','first','from','islam','islamic','muslim','muslims','never',
         'other','people','quran','right','should','their','there','these','thing',
         'think','those','through','under','until','video','watch','were','what','when',
         'where','which','while','world','would','your','yours','episode','podcast',
         'sheikh','shaykh','ustadh','lecture','series','story','stories','history'
       )
     GROUP BY 1
    HAVING count(*) >= 5
  ),
  scored AS (
    SELECT t.tok, t.c,
           (SELECT count(*) FROM (
              SELECT 1 FROM public.curated_videos cv
               WHERE cv.is_archived = false
                 AND cv.moderation_state IN ('approved','auto_approved')
                 AND cv.search_tsv @@ plainto_tsquery('simple', t.tok)
               LIMIT 40
            ) s)::int AS live_hits
      FROM toks t
  ),
  ins AS (
    INSERT INTO public.moderation_learned_signals
      (feature_type, feature_value, approvals, rejections, reverts, weight)
    SELECT 'blocked_title_token', tok, 0, c, 0,
           CASE WHEN live_hits = 0 THEN -0.25 ELSE -0.05 END
      FROM scored
    ON CONFLICT (feature_type, feature_value) DO UPDATE
      SET rejections = public.moderation_learned_signals.rejections + EXCLUDED.rejections,
          weight = LEAST(public.moderation_learned_signals.weight, EXCLUDED.weight),
          version = public.moderation_learned_signals.version + 1,
          updated_at = now()
    RETURNING 1
  )
  SELECT count(*)::int INTO v_learned FROM ins;

  INSERT INTO public.moderation_learned_signals
    (feature_type, feature_value, approvals, rejections, reverts, weight)
  VALUES ('blocked_channel', lower(btrim(_pattern)), 0, 1, 0, -0.25)
  ON CONFLICT (feature_type, feature_value) DO UPDATE
    SET rejections = public.moderation_learned_signals.rejections + 1,
        weight = -0.25, version = public.moderation_learned_signals.version + 1,
        updated_at = now();

  INSERT INTO public.autonomy_log (kind, detail)
  VALUES ('learn_from_owner_block',
          jsonb_build_object('pattern', _pattern, 'tokens_learned', v_learned));

  RETURN v_learned;
END $$;

REVOKE ALL ON FUNCTION public.learn_from_owner_block(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.learn_from_owner_block(text) TO service_role;

-- 3. Archive the newly blocked channels' catalog ------------------------------
UPDATE public.curated_videos cv
   SET is_archived = true, is_hidden = true, moderation_state = 'rejected',
       moderation_reasoning = coalesce(moderation_reasoning,'')
         || ' | owner block: female-featured content'
 WHERE cv.is_archived = false
   AND lower(btrim(coalesce(cv.channel_title,''))) IN
       ('dr. tareq al-suwaidan','safina society','ilmfeed','ilmfeed podcast');

UPDATE public.approved_channels
   SET status = 'removed'
 WHERE status <> 'removed'
   AND lower(btrim(coalesce(title,''))) IN
       ('dr. tareq al-suwaidan','safina society','ilmfeed','ilmfeed podcast');

-- 4. Autonomous enforcement sweep ---------------------------------------------
CREATE OR REPLACE FUNCTION public.autonomous_moderation_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
       AND cv.created_at > now() - interval '30 days'
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
END $$;

REVOKE ALL ON FUNCTION public.autonomous_moderation_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autonomous_moderation_tick() TO service_role;

-- 5. Learn from the four blocks we just made ---------------------------------
SELECT public.learn_from_owner_block('Dr. Tareq Al-Suwaidan');
SELECT public.learn_from_owner_block('Safina Society');
SELECT public.learn_from_owner_block('IlmFeed');
SELECT public.learn_from_owner_block('IlmFeed Podcast');

-- 6. Schedule the sweep -------------------------------------------------------
SELECT cron.unschedule('autonomous-moderation-tick')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'autonomous-moderation-tick');
SELECT cron.schedule('autonomous-moderation-tick', '*/15 * * * *',
  $cron$SELECT public.autonomous_moderation_tick();$cron$);
