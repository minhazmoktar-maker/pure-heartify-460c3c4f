
-- Wave M2 — Beneficial Intelligence Engine
-- Also fixes M1: expose get_public_attestation to anon/auth (publicly indexable /verify page)

REVOKE ALL ON FUNCTION public.get_public_attestation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_attestation(text) TO anon, authenticated, service_role;

-- Composite return type: surface_video + reason + benefit_score.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'beneficial_video') THEN
    CREATE TYPE public.beneficial_video AS (
      video_id text,
      title text,
      channel_id text,
      channel_title text,
      thumbnail_url text,
      category text,
      section_id text,
      published_at timestamptz,
      ingested_at timestamptz,
      halal_score numeric,
      view_count bigint,
      is_trusted_channel boolean,
      is_premium_only boolean,
      content_language text,
      reason text,
      benefit_score numeric
    );
  END IF;
END $$;

-- pool_beneficial_v1 — ranks by *benefit*, not watch-time.
-- Signals blended (all bounded, no view_count):
--   trust      = moderation tier (approved 1.0 / auto 0.85) + trusted-channel bonus + halal_score/100
--   goal_fit   = alignment with the user's stated learning interests
--   novelty    = new-to-user channel bonus (encourages breadth over rabbit-holes)
--   personal   = taste-profile topic + creator + language affinity (if warm)
--   freshness  = mild recency term so the shelf breathes
-- Anti-engagement: NO view_count in the ranking. Repeat-channel is penalised.
CREATE OR REPLACE FUNCTION public.pool_beneficial_v1(
  _user_id uuid,
  _limit int DEFAULT 160,
  _exclude_premium boolean DEFAULT false
) RETURNS SETOF public.beneficial_video
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH prof AS (
    SELECT creator_affinity, topic_affinity, language_affinity, signal_count
    FROM public.user_taste_profiles WHERE user_id = _user_id
  ),
  goals AS (
    SELECT primary_interest, secondary_interest, exploration_interest
    FROM public.user_interests WHERE user_id = _user_id
  ),
  seen AS (
    SELECT video_id FROM public.watch_history WHERE user_id = _user_id
  ),
  seen_channels AS (
    SELECT DISTINCT v.channel_id
    FROM public.watch_history h
    JOIN public.curated_videos v ON v.video_id = h.video_id
    WHERE h.user_id = _user_id AND h.watched_at > now() - interval '30 days'
      AND v.channel_id IS NOT NULL
  ),
  scored AS (
    SELECT v.*,
      -- Trust: state weight + trusted channel + halal_score
      (CASE v.moderation_state
         WHEN 'approved' THEN 1.0
         WHEN 'auto_approved' THEN 0.85
         ELSE 0.6 END)
        + (CASE WHEN v.is_trusted_channel THEN 0.15 ELSE 0 END)
        + COALESCE(v.halal_score, 90)::numeric / 500.0                             AS trust_s,
      -- Goal alignment (Islamic taxonomy match on stated interests)
      (CASE WHEN v.category = (SELECT primary_interest FROM goals) THEN 0.60
            WHEN v.category = (SELECT secondary_interest FROM goals) THEN 0.35
            WHEN v.category = (SELECT exploration_interest FROM goals) THEN 0.20
            ELSE 0 END)                                                            AS goal_s,
      -- Personal affinity (taste profile) — only meaningful once warm
      COALESCE((SELECT (topic_affinity->>v.category)::numeric FROM prof), 0)       AS topic_s,
      COALESCE((SELECT (creator_affinity->>v.channel_id)::numeric FROM prof), 0)   AS creator_s,
      COALESCE((SELECT (language_affinity->>v.content_language)::numeric FROM prof), 0) AS lang_s,
      -- Novelty: reward channels the user has NOT already watched a lot
      (CASE WHEN v.channel_id IS NOT NULL
              AND v.channel_id NOT IN (SELECT channel_id FROM seen_channels)
            THEN 0.25 ELSE 0 END)                                                  AS novelty_s,
      -- Mild freshness
      0.30 / GREATEST(EXTRACT(EPOCH FROM (now() - COALESCE(v.published_at, v.ingested_at)))/86400.0 + 3, 3)
                                                                                   AS fresh_s
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden = false AND v.is_archived = false
      AND (NOT _exclude_premium OR v.is_premium_only = false)
      AND v.video_id NOT IN (SELECT video_id FROM seen)
  ),
  ranked AS (
    SELECT s.*,
      (1.4 * trust_s + 1.6 * goal_s + 1.2 * topic_s + 0.9 * creator_s
       + 0.5 * lang_s + 0.6 * novelty_s + 0.4 * fresh_s) AS benefit_score,
      -- Reason chip: pick the single strongest reason so the UI can explain it.
      CASE
        WHEN (SELECT primary_interest FROM goals) IS NOT NULL
             AND s.category = (SELECT primary_interest FROM goals)
          THEN 'Aligned with your goal: ' || s.category
        WHEN creator_s >= 0.4
          THEN 'From a creator you learn from'
        WHEN topic_s >= 0.4
          THEN 'Because you learn ' || s.category
        WHEN s.is_trusted_channel
          THEN 'Trusted source · reviewed'
        WHEN s.channel_id IS NOT NULL
             AND s.channel_id NOT IN (SELECT channel_id FROM seen_channels)
          THEN 'New voice worth hearing'
        WHEN COALESCE(s.halal_score, 0) >= 95
          THEN 'Highly reviewed'
        ELSE 'Beneficial for you'
      END AS reason
    FROM scored s
  )
  SELECT video_id, title, channel_id, channel_title, thumbnail_url, category, section_id,
         published_at, ingested_at, halal_score, view_count, is_trusted_channel,
         is_premium_only, content_language, reason, benefit_score
  FROM ranked
  ORDER BY benefit_score DESC NULLS LAST, ingested_at DESC
  LIMIT _limit
$$;

REVOKE ALL ON FUNCTION public.pool_beneficial_v1(uuid,int,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pool_beneficial_v1(uuid,int,boolean) TO authenticated, service_role;

COMMENT ON FUNCTION public.pool_beneficial_v1(uuid,int,boolean) IS
  'Wave M2 Beneficial Intelligence Engine: ranks videos by benefit (trust + goal alignment + novelty + personal affinity + freshness). No view_count in the ranking. Returns a `reason` chip so the UI can explain each recommendation.';
