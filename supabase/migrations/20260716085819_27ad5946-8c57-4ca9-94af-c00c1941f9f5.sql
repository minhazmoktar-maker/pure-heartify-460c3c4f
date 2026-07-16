
-- 1. Extend channel_candidates with confidence/language/depth signals.
ALTER TABLE public.channel_candidates
  ADD COLUMN IF NOT EXISTS confidence_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS language_detected TEXT,
  ADD COLUMN IF NOT EXISTS crawl_depth INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS educational_quality INTEGER,
  ADD COLUMN IF NOT EXISTS organization_type TEXT;

-- Allow new discovery source values (preserving existing).
ALTER TABLE public.channel_candidates DROP CONSTRAINT IF EXISTS channel_candidates_source_check;
ALTER TABLE public.channel_candidates ADD CONSTRAINT channel_candidates_source_check
  CHECK (source = ANY (ARRAY[
    'manual','discovery','user_suggestion','import',
    'topic_search','playlist_collab','description_mention','featured_channel','institution_seed'
  ]));

CREATE INDEX IF NOT EXISTS channel_candidates_language_idx
  ON public.channel_candidates(language_detected) WHERE language_detected IS NOT NULL;

-- 2. discovery_seeds — resumable crawl cursor.
CREATE TABLE IF NOT EXISTS public.discovery_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_channel_id TEXT,
  method TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  next_page_token TEXT,
  last_processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  exhausted BOOLEAN NOT NULL DEFAULT false,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (seed_channel_id, method)
);

GRANT SELECT ON public.discovery_seeds TO authenticated;
GRANT ALL ON public.discovery_seeds TO service_role;

ALTER TABLE public.discovery_seeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read discovery seeds" ON public.discovery_seeds
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage discovery seeds" ON public.discovery_seeds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS discovery_seeds_pending_idx
  ON public.discovery_seeds(exhausted, last_processed_at NULLS FIRST)
  WHERE exhausted = false;

CREATE TRIGGER update_discovery_seeds_updated_at
  BEFORE UPDATE ON public.discovery_seeds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. discovery_topic_queries — multi-language search seeds.
CREATE TABLE IF NOT EXISTS public.discovery_topic_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language TEXT NOT NULL,
  topic TEXT NOT NULL,
  query TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 50,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (language, query)
);

GRANT SELECT ON public.discovery_topic_queries TO authenticated;
GRANT ALL ON public.discovery_topic_queries TO service_role;

ALTER TABLE public.discovery_topic_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read topic queries" ON public.discovery_topic_queries
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage topic queries" ON public.discovery_topic_queries
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS discovery_topic_queries_pick_idx
  ON public.discovery_topic_queries(enabled, priority DESC, last_run_at NULLS FIRST);

CREATE TRIGGER update_discovery_topic_queries_updated_at
  BEFORE UPDATE ON public.discovery_topic_queries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed the topic queries in 15 languages with high-signal halal/educational queries.
INSERT INTO public.discovery_topic_queries (language, topic, query, priority) VALUES
  ('en','islamic','quran tafsir lectures',95),
  ('en','islamic','islamic history documentary',92),
  ('en','islamic','seerah of the prophet',94),
  ('en','islamic','islamic finance halal',85),
  ('en','education','mit opencourseware',80),
  ('en','science','physics lecture university',78),
  ('en','history','world history documentary',75),
  ('en','technology','programming tutorial computer science',72),
  ('en','language','learn arabic classical',80),
  ('ar','islamic','دروس تفسير القرآن',95),
  ('ar','islamic','السيرة النبوية',94),
  ('ar','islamic','خطب جمعة',90),
  ('ar','education','محاضرات علمية جامعية',80),
  ('ar','history','تاريخ إسلامي',82),
  ('bn','islamic','ইসলামিক লেকচার',94),
  ('bn','islamic','কুরআন তাফসীর',94),
  ('bn','education','শিক্ষামূলক বাংলা',75),
  ('ur','islamic','اسلامی لیکچرز',94),
  ('ur','islamic','قرآن تفسیر',94),
  ('ur','islamic','سیرت النبی',93),
  ('tr','islamic','islami dersler tefsir',94),
  ('tr','islamic','peygamberimizin hayatı',93),
  ('tr','education','üniversite dersleri',75),
  ('id','islamic','ceramah islami tafsir',94),
  ('id','islamic','kajian sunnah',92),
  ('id','education','belajar sains',72),
  ('ms','islamic','kuliah islam tafsir',94),
  ('ms','islamic','sirah nabawiyyah',92),
  ('fa','islamic','سخنرانی اسلامی',92),
  ('fa','islamic','تفسیر قرآن',94),
  ('fr','islamic','conférence islam tafsir',90),
  ('fr','education','cours université sciences',72),
  ('de','islamic','islamische vorträge tafsir',88),
  ('de','education','universitätsvorlesung wissenschaft',70),
  ('es','islamic','conferencias islámicas',86),
  ('es','education','clases universitarias ciencia',70),
  ('pt','islamic','palestras islâmicas',85),
  ('pt','education','aulas ciência universidade',70),
  ('ja','islamic','イスラム 講義',82),
  ('ja','education','大学 講義 科学',68),
  ('ko','islamic','이슬람 강의',82),
  ('ko','education','대학 강의 과학',68),
  ('zh','islamic','伊斯兰 讲座',82),
  ('zh','education','大学 讲座 科学',68)
ON CONFLICT (language, query) DO NOTHING;
