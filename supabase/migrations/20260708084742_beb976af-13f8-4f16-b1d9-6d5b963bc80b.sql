
CREATE INDEX IF NOT EXISTS curated_videos_title_trgm_idx
  ON public.curated_videos USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS curated_videos_channel_trgm_idx
  ON public.curated_videos USING gin (channel_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS curated_videos_search_tsv_idx
  ON public.curated_videos USING gin (search_tsv);
CREATE INDEX IF NOT EXISTS curated_videos_trusted_pub_idx
  ON public.curated_videos (is_trusted_channel, published_at DESC);
