-- 1) Scope blanket UPDATE triggers to the columns they actually read.
DROP TRIGGER IF EXISTS trg_enforce_blocked_creators ON public.curated_videos;
CREATE TRIGGER trg_enforce_blocked_creators
  BEFORE INSERT OR UPDATE OF title, channel_title, is_archived ON public.curated_videos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_blocked_creators();

DROP TRIGGER IF EXISTS trg_reject_removed_video ON public.curated_videos;
CREATE TRIGGER trg_reject_removed_video
  BEFORE INSERT OR UPDATE OF video_id ON public.curated_videos
  FOR EACH ROW EXECUTE FUNCTION public.reject_removed_video();

-- 2) Supporting index for the removal blocklist lookup.
CREATE INDEX IF NOT EXISTS removed_videos_video_id_idx ON public.removed_videos (video_id);

-- 3) Set-based embedding writer: one statement per batch instead of one per row.
CREATE OR REPLACE FUNCTION public.apply_video_embeddings(_rows jsonb, _model text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH src AS (
    SELECT (e->>'video_id')::text AS video_id,
           (e->>'embedding')::extensions.vector(1536) AS embedding
    FROM jsonb_array_elements(_rows) AS e
  )
  UPDATE public.curated_videos cv
     SET embedding = src.embedding,
         embedding_model = _model,
         embedding_updated_at = now()
    FROM src
   WHERE cv.video_id = src.video_id
     AND cv.embedding IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_video_embeddings(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_video_embeddings(jsonb, text) TO service_role;

-- 4) Set-based search_tsv backfill (replaces per-row "touch" updates).
CREATE OR REPLACE FUNCTION public.backfill_search_tsv(_limit integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  WITH slice AS (
    SELECT id FROM public.curated_videos
     WHERE search_tsv IS NULL
     LIMIT greatest(least(_limit, 5000), 1)
  )
  UPDATE public.curated_videos cv
     SET search_tsv =
       setweight(to_tsvector('simple', coalesce(cv.title, '')), 'A') ||
       setweight(to_tsvector('simple', coalesce(cv.channel_title, '')), 'B') ||
       setweight(to_tsvector('simple', coalesce(cv.category, '')), 'C')
    FROM slice
   WHERE cv.id = slice.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_search_tsv(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_search_tsv(integer) TO service_role;