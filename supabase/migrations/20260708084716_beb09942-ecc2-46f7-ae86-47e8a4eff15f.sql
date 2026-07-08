
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
SET search_path = public
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION public.curated_videos_tsv_refresh()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(NEW.title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(NEW.channel_title, ''))), 'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(NEW.category, ''))), 'C');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS curated_videos_tsv_trg ON public.curated_videos;
CREATE TRIGGER curated_videos_tsv_trg
  BEFORE INSERT OR UPDATE OF title, channel_title, category
  ON public.curated_videos
  FOR EACH ROW EXECUTE FUNCTION public.curated_videos_tsv_refresh();
