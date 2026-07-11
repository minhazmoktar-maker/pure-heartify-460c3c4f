
-- Enable pgvector for semantic search + recommendations recall
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding column on curated_videos (openai/text-embedding-3-small = 1536 dims)
ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_model text,
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz;

-- HNSW index for cosine similarity (only over approved videos to keep it small).
CREATE INDEX IF NOT EXISTS curated_videos_embedding_hnsw
  ON public.curated_videos USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL AND moderation_state IN ('approved','auto_approved');

-- Fast lookup for backfill / re-embed jobs.
CREATE INDEX IF NOT EXISTS curated_videos_embedding_null_idx
  ON public.curated_videos (id)
  WHERE embedding IS NULL AND moderation_state IN ('approved','auto_approved');

-- Semantic search RPC. Callable only by service_role (edge functions).
CREATE OR REPLACE FUNCTION public.match_curated_videos(
  query_embedding vector(1536),
  match_count int DEFAULT 40,
  category_filter text DEFAULT NULL,
  exclude_premium boolean DEFAULT false
)
RETURNS TABLE (
  video_id text,
  title text,
  channel_title text,
  category text,
  thumbnail_url text,
  halal_score int,
  published_at timestamptz,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.video_id,
    v.title,
    v.channel_title,
    v.category,
    v.thumbnail_url,
    v.halal_score,
    v.published_at,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM public.curated_videos v
  WHERE v.embedding IS NOT NULL
    AND v.moderation_state IN ('approved','auto_approved')
    AND (category_filter IS NULL OR v.category = category_filter)
    AND (NOT exclude_premium OR COALESCE(v.is_premium_only, false) = false)
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_curated_videos(vector, int, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_curated_videos(vector, int, text, boolean) TO service_role;
