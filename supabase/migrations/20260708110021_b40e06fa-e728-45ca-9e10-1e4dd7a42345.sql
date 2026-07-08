
-- 1. Extend reciters
ALTER TABLE public.reciters
  ADD COLUMN IF NOT EXISTS biography       TEXT,
  ADD COLUMN IF NOT EXISTS image_url       TEXT,
  ADD COLUMN IF NOT EXISTS popularity_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_years    TEXT,
  ADD COLUMN IF NOT EXISTS social_links    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS search_tsv      tsvector;

CREATE INDEX IF NOT EXISTS reciters_popularity_idx     ON public.reciters (popularity_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS reciters_search_tsv_idx     ON public.reciters USING GIN (search_tsv);
CREATE INDEX IF NOT EXISTS reciters_name_en_trgm_idx   ON public.reciters USING GIN (canonical_name_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS reciter_aliases_alias_trgm_idx ON public.reciter_aliases USING GIN (alias gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.reciters_tsv_refresh()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(NEW.canonical_name_en, ''))), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.canonical_name_ar, '')), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(NEW.country, ''))), 'C') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(NEW.primary_riwayah, ''))), 'C') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(NEW.biography, ''))), 'D');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS reciters_tsv_refresh_trg ON public.reciters;
CREATE TRIGGER reciters_tsv_refresh_trg
  BEFORE INSERT OR UPDATE OF canonical_name_en, canonical_name_ar, country, primary_riwayah, biography
  ON public.reciters
  FOR EACH ROW EXECUTE FUNCTION public.reciters_tsv_refresh();

UPDATE public.reciters
   SET search_tsv =
     setweight(to_tsvector('simple', public.f_unaccent(coalesce(canonical_name_en, ''))), 'A') ||
     setweight(to_tsvector('simple', coalesce(canonical_name_ar, '')), 'A') ||
     setweight(to_tsvector('simple', public.f_unaccent(coalesce(country, ''))), 'C') ||
     setweight(to_tsvector('simple', public.f_unaccent(coalesce(primary_riwayah, ''))), 'C');

-- 2. reciter_audio_sources
CREATE TABLE IF NOT EXISTS public.reciter_audio_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reciter_id   UUID NOT NULL REFERENCES public.reciters(id) ON DELETE CASCADE,
  source_name  TEXT NOT NULL,
  base_url     TEXT NOT NULL,
  riwayah      TEXT,
  quality      TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  license      TEXT,
  attribution  TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reciter_id, source_name, base_url)
);
GRANT SELECT ON public.reciter_audio_sources TO anon, authenticated;
GRANT ALL    ON public.reciter_audio_sources TO service_role;
ALTER TABLE public.reciter_audio_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reciter audio sources" ON public.reciter_audio_sources;
DROP POLICY IF EXISTS "Admins manage reciter audio sources"   ON public.reciter_audio_sources;
CREATE POLICY "Public can view reciter audio sources"
  ON public.reciter_audio_sources FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage reciter audio sources"
  ON public.reciter_audio_sources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

DROP TRIGGER IF EXISTS reciter_audio_sources_updated_at ON public.reciter_audio_sources;
CREATE TRIGGER reciter_audio_sources_updated_at
  BEFORE UPDATE ON public.reciter_audio_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS reciter_audio_sources_reciter_idx
  ON public.reciter_audio_sources (reciter_id) WHERE is_active;

-- 3. Search RPC
CREATE OR REPLACE FUNCTION public.search_reciters(_query text, _limit integer DEFAULT 20)
RETURNS TABLE (
  id UUID, canonical_name_en TEXT, canonical_name_ar TEXT, country TEXT,
  primary_riwayah TEXT, image_url TEXT, popularity_score INTEGER,
  is_living BOOLEAN, match_type TEXT, rank REAL
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q text := lower(trim(coalesce(_query, '')));
  ts tsquery;
BEGIN
  IF q = '' THEN
    RETURN QUERY
    SELECT r.id, r.canonical_name_en, r.canonical_name_ar, r.country,
           r.primary_riwayah, r.image_url, r.popularity_score, r.is_living,
           'browse'::text, 0.0::real
    FROM public.reciters r WHERE r.is_verified = true
    ORDER BY r.popularity_score DESC NULLS LAST, r.canonical_name_en
    LIMIT _limit;
    RETURN;
  END IF;

  ts := plainto_tsquery('simple', public.f_unaccent(q));

  RETURN QUERY
  WITH matches AS (
    SELECT r.*,
      ts_rank(r.search_tsv, ts) AS ts_score,
      GREATEST(
        similarity(lower(public.f_unaccent(r.canonical_name_en)), q),
        COALESCE((
          SELECT MAX(similarity(lower(public.f_unaccent(a.alias)), q))
          FROM public.reciter_aliases a WHERE a.reciter_id = r.id
        ), 0)
      ) AS trgm_score,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.reciter_aliases a
        WHERE a.reciter_id = r.id AND a.alias_norm = regexp_replace(q, '[^a-z0-9]+', '', 'g')
      ) THEN 1.0 ELSE 0.0 END AS alias_hit
    FROM public.reciters r
    WHERE r.is_verified = true
      AND (
        r.search_tsv @@ ts
        OR r.canonical_name_en ILIKE '%' || q || '%'
        OR EXISTS (SELECT 1 FROM public.reciter_aliases a WHERE a.reciter_id = r.id AND a.alias ILIKE '%' || q || '%')
      )
  )
  SELECT m.id, m.canonical_name_en, m.canonical_name_ar, m.country,
         m.primary_riwayah, m.image_url, m.popularity_score, m.is_living,
         CASE WHEN m.alias_hit > 0 THEN 'alias'
              WHEN m.ts_score > 0.05 THEN 'fulltext'
              ELSE 'fuzzy' END::text,
         (0.5 * m.ts_score + 0.3 * m.trgm_score + 0.15 * m.alias_hit
          + 0.05 * LEAST(m.popularity_score::numeric / 100.0, 1.0))::real
  FROM matches m
  ORDER BY rank DESC, m.popularity_score DESC NULLS LAST
  LIMIT _limit;
END; $$;

REVOKE ALL ON FUNCTION public.search_reciters(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_reciters(text, integer) TO anon, authenticated;

-- 4. Seed more reciters (idempotent).
INSERT INTO public.reciters
  (canonical_name_en, canonical_name_ar, country, gender, category, era, primary_riwayah, voice_style, is_verified, is_living, popularity_score)
VALUES
  ('Adel Al-Kalbani','عادل الكلباني','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,55),
  ('Hatem Fareed Al-Waer','حاتم فريد الواعر','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,40),
  ('Khalid Al-Qahtani','خالد القحطاني','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,48),
  ('Faisal Nomani','فيصل نعماني','Pakistan','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,32),
  ('Ahmad Al-Shalabi','أحمد الشلبي','Jordan','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,30),
  ('Mustafa Al-Azzawi','مصطفى العزاوي','Iraq','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,28),
  ('Youssef Kalo','يوسف كالو','Turkey','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,26),
  ('Mansour Al-Hazmi','منصور الحازمي','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,25),
  ('Abdulaziz Al-Zahrani','عبد العزيز الزهراني','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,29),
  ('Yasser Al-Mazroyee','ياسر المزروعي','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,22),
  ('Mohamed Al-Barrak','محمد البراك','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,38),
  ('Toufik As-Sayegh','توفيق الصائغ','Saudi Arabia','male','quran_reciter','contemporary','Hafs an Asim','murattal',true,true,45)
ON CONFLICT (canonical_name_en) DO UPDATE
  SET popularity_score = EXCLUDED.popularity_score, updated_at = now();

-- Popularity for prominent reciters
UPDATE public.reciters SET popularity_score = 99 WHERE canonical_name_en = 'Mishary Rashid Alafasy';
UPDATE public.reciters SET popularity_score = 95 WHERE canonical_name_en = 'Abdul Rahman Al-Sudais';
UPDATE public.reciters SET popularity_score = 93 WHERE canonical_name_en = 'Maher Al-Muaiqly';
UPDATE public.reciters SET popularity_score = 92 WHERE canonical_name_en = 'Saud Al-Shuraim';
UPDATE public.reciters SET popularity_score = 90 WHERE canonical_name_en = 'Yasser Al-Dossari';
UPDATE public.reciters SET popularity_score = 88 WHERE canonical_name_en = 'Saad Al-Ghamdi';
UPDATE public.reciters SET popularity_score = 96 WHERE canonical_name_en = 'Abdul Basit Abdus Samad';
UPDATE public.reciters SET popularity_score = 94 WHERE canonical_name_en = 'Muhammad Siddiq Al-Minshawi';
UPDATE public.reciters SET popularity_score = 93 WHERE canonical_name_en = 'Mahmoud Khalil Al-Hussary';

-- Audio sources for reciters that have known mp3quran slugs.
INSERT INTO public.reciter_audio_sources
  (reciter_id, source_name, base_url, riwayah, quality, license, attribution)
SELECT r.id, s.source_name, s.base_url, s.riwayah, s.quality, s.license, s.attribution
FROM public.reciters r
JOIN (
  VALUES
    ('Mishary Rashid Alafasy',    'mp3quran.net', 'https://server8.mp3quran.net/afs/{surah:03d}.mp3',    'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Abdul Rahman Al-Sudais',    'mp3quran.net', 'https://server11.mp3quran.net/sds/{surah:03d}.mp3',   'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Nasser Al-Qatami',          'mp3quran.net', 'https://server6.mp3quran.net/qtm/{surah:03d}.mp3',    'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Abdul Basit Abdus Samad',   'mp3quran.net', 'https://server7.mp3quran.net/basit/{surah:03d}.mp3',  'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Muhammad Siddiq Al-Minshawi','mp3quran.net','https://server10.mp3quran.net/minsh/{surah:03d}.mp3', 'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Yasser Al-Dossari',         'mp3quran.net', 'https://server11.mp3quran.net/yasser/{surah:03d}.mp3','Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Maher Al-Muaiqly',          'mp3quran.net', 'https://server12.mp3quran.net/maher/{surah:03d}.mp3', 'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Saud Al-Shuraim',           'mp3quran.net', 'https://server7.mp3quran.net/shur/{surah:03d}.mp3',   'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Saad Al-Ghamdi',            'mp3quran.net', 'https://server7.mp3quran.net/s_gmd/{surah:03d}.mp3',  'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Ahmed Al-Ajmi',             'mp3quran.net', 'https://server10.mp3quran.net/ajm/{surah:03d}.mp3',   'Hafs an Asim','128kbps','public-domain','mp3quran.net'),
    ('Abu Bakr Al-Shatri',        'mp3quran.net', 'https://server11.mp3quran.net/shatri/{surah:03d}.mp3','Hafs an Asim','128kbps','public-domain','mp3quran.net')
) AS s(name_en, source_name, base_url, riwayah, quality, license, attribution)
  ON s.name_en = r.canonical_name_en
ON CONFLICT (reciter_id, source_name, base_url) DO NOTHING;
