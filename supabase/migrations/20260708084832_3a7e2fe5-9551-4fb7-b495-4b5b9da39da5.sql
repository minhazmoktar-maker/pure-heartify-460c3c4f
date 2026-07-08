
CREATE TABLE IF NOT EXISTS public.search_synonyms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  alternates text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (term)
);

GRANT SELECT ON public.search_synonyms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.search_synonyms TO authenticated;
GRANT ALL ON public.search_synonyms TO service_role;

ALTER TABLE public.search_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Synonyms readable by everyone"
  ON public.search_synonyms FOR SELECT USING (true);
CREATE POLICY "Admins manage synonyms"
  ON public.search_synonyms FOR ALL
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

CREATE TRIGGER search_synonyms_updated_at
  BEFORE UPDATE ON public.search_synonyms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.search_synonyms (term, alternates) VALUES
  ('quran',   ARRAY['quraan','koran','kuran','qur''an','qurʼan','qurān']),
  ('ramadan', ARRAY['ramadhan','ramzan','ramazan','ramadaan','ramzaan']),
  ('muhammad',ARRAY['mohammed','muhammed','mohamad','mohammad','muhamad']),
  ('salah',   ARRAY['salaah','salat','namaz','namaaz','prayer']),
  ('dua',     ARRAY['duaa','supplication','duas']),
  ('hadith',  ARRAY['hadeeth','ahadith','sunnah','narration']),
  ('seerah',  ARRAY['seera','biography of the prophet']),
  ('iman',    ARRAY['imaan','eeman','faith','belief']),
  ('shariah', ARRAY['sharia','shareeah','islamic law','fiqh']),
  ('tafsir',  ARRAY['tafseer','exegesis','commentary']),
  ('nasheed', ARRAY['nasheeds','anasheed','islamic song']),
  ('zakat',   ARRAY['zakah','charity','sadaqah'])
ON CONFLICT (term) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  normalized_query text NOT NULL,
  result_count integer NOT NULL DEFAULT 0,
  clicked_video_id text,
  intent jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.search_queries TO authenticated;
GRANT INSERT ON public.search_queries TO anon;
GRANT ALL ON public.search_queries TO service_role;

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own search history"
  ON public.search_queries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins read all search history"
  ON public.search_queries FOR SELECT USING (public.has_min_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can log a search"
  ON public.search_queries FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS search_queries_norm_idx
  ON public.search_queries (normalized_query, created_at DESC);
CREATE INDEX IF NOT EXISTS search_queries_user_idx
  ON public.search_queries (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_queries_recent_idx
  ON public.search_queries (created_at DESC);
