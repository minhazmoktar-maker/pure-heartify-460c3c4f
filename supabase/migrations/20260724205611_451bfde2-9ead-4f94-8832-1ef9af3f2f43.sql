
-- 1. Expand trusted_institutions with public-facing metadata
ALTER TABLE public.trusted_institutions
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS homepage_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS trusted_institutions_domain_idx
  ON public.trusted_institutions (domain) WHERE is_public = true;

-- 2. Public directory RPC (SECURITY DEFINER; read-only projection)
CREATE OR REPLACE FUNCTION public.get_beneficial_sources_directory(
  _domain text DEFAULT NULL,
  _limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  name text,
  domain text,
  organization_type text,
  homepage_url text,
  logo_url text,
  description text,
  language text,
  country text,
  verified_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, domain, organization_type, homepage_url, logo_url,
         description, language, country, verified_at
  FROM public.trusted_institutions
  WHERE is_public = true
    AND (_domain IS NULL OR domain = _domain)
  ORDER BY domain NULLS LAST, name
  LIMIT COALESCE(_limit, 200);
$$;

REVOKE ALL ON FUNCTION public.get_beneficial_sources_directory(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_beneficial_sources_directory(text, integer) TO anon, authenticated;

-- 3. Seed catalog (idempotent upserts by name)
INSERT INTO public.trusted_institutions
  (name, organization_type, domain, match_pattern, language, country,
   homepage_url, description, verified_at, weight, min_subs)
VALUES
  -- Islamic scholarship & research
  ('Yaqeen Institute', 'research', 'Islamic', 'yaqeen', 'en', 'US', 'https://yaqeeninstitute.org', 'Peer-reviewed Islamic research and short films.', now(), 1.5, 10000),
  ('Bayyinah Institute', 'institute', 'Islamic', 'bayyinah', 'en', 'US', 'https://bayyinah.com', 'Arabic & Qur''an study by Nouman Ali Khan and team.', now(), 1.4, 10000),
  ('AlMaghrib Institute', 'institute', 'Islamic', 'almaghrib', 'en', 'US', 'https://almaghrib.org', 'Weekend Islamic seminars taught by qualified scholars.', now(), 1.4, 5000),
  ('Zaytuna College', 'college', 'Islamic', 'zaytuna', 'en', 'US', 'https://zaytuna.edu', 'First accredited Muslim liberal arts college in the US.', now(), 1.4, 5000),
  ('Cambridge Muslim College', 'college', 'Islamic', 'cambridge muslim', 'en', 'UK', 'https://cambridgemuslimcollege.ac.uk', 'Higher education for British Muslim scholars.', now(), 1.3, 3000),
  ('Islamic Online University (IOU)', 'university', 'Islamic', 'islamic online university', 'en', 'INT', 'https://iou.edu.gm', 'Bilal Philips'' tuition-free Islamic university.', now(), 1.3, 10000),
  ('Al-Azhar University', 'university', 'Islamic', 'al-azhar|al azhar', 'ar', 'EG', 'https://www.azhar.edu.eg', 'Historic Sunni seat of learning in Cairo.', now(), 1.5, 10000),
  ('Darul Uloom Deoband', 'seminary', 'Islamic', 'darul uloom deoband|deoband', 'ur', 'IN', 'https://darululoom-deoband.com', 'Historic Islamic seminary in India.', now(), 1.4, 5000),
  ('Nadwatul Ulama Lucknow', 'seminary', 'Islamic', 'nadwatul ulama|nadwa', 'ur', 'IN', NULL, 'Islamic seminary emphasising Arabic and classical sciences.', now(), 1.3, 3000),
  ('Islamic University of Madinah', 'university', 'Islamic', 'islamic university of madinah|madinah university', 'ar', 'SA', 'https://iu.edu.sa', 'Government Islamic university in Madinah.', now(), 1.5, 5000),
  ('Umm Al-Qura University', 'university', 'Islamic', 'umm al-qura|umm al qura', 'ar', 'SA', 'https://uqu.edu.sa', 'Public Islamic university in Makkah.', now(), 1.4, 3000),
  ('Qalam Institute', 'institute', 'Islamic', 'qalam institute|qalaminstitute', 'en', 'US', 'https://www.qalaminstitute.org', 'Traditional Islamic education by Sh. Abdul Nasir Jangda.', now(), 1.3, 5000),
  ('Muslim Central', 'media', 'Islamic', 'muslim central', 'en', 'INT', 'https://muslimcentral.com', 'Aggregator of lectures from mainstream scholars.', now(), 1.2, 10000),
  ('One Islam Productions', 'media', 'Islamic', 'one islam productions|oneislam', 'en', 'AU', NULL, 'High-quality Islamic short films and lectures.', now(), 1.2, 20000),
  ('Digital Mimbar', 'media', 'Islamic', 'digital mimbar', 'en', 'INT', NULL, 'Curated dawah lectures from mainstream scholars.', now(), 1.2, 20000),
  ('Guidance Films', 'media', 'Islamic', 'guidance films', 'en', 'INT', NULL, 'Cinematic Islamic reminders.', now(), 1.2, 10000),
  ('EMAAN Library', 'media', 'Islamic', 'emaan library', 'en', 'INT', NULL, 'Archive of scholarly lectures.', now(), 1.1, 5000),
  ('One4Kids / Zaky', 'media', 'Islamic', 'one4kids|zaky', 'en', 'AU', 'https://one4kids.co', 'Children''s Islamic educational content.', now(), 1.1, 100000),
  ('Muslim Kids TV', 'media', 'Islamic', 'muslim kids tv', 'en', 'CA', 'https://muslimkidstv.ca', 'Kid-safe Islamic programming.', now(), 1.1, 20000),
  ('Islam Channel', 'media', 'Islamic', 'islam channel', 'en', 'UK', 'https://islamchannel.tv', 'UK Islamic satellite broadcaster.', now(), 1.1, 50000),
  ('Huda TV', 'media', 'Islamic', 'huda tv', 'en', 'EG', 'https://www.hudatv.com', 'English Islamic television.', now(), 1.1, 20000),
  ('Peace TV', 'media', 'Islamic', 'peace tv', 'en', 'INT', NULL, 'Global Islamic broadcaster (English).', now(), 1.0, 50000),
  ('Al-Hakam', 'media', 'Islamic', 'al-hakam|al hakam', 'en', 'UK', 'https://www.alhakam.org', 'Weekly Muslim newspaper.', now(), 1.0, 3000),
  ('Islamic Relief Worldwide', 'international', 'Islamic', 'islamic relief', 'en', 'INT', 'https://islamic-relief.org', 'Global Muslim humanitarian NGO.', now(), 1.1, 10000),
  ('Muslim Aid', 'international', 'Islamic', 'muslim aid', 'en', 'INT', 'https://www.muslimaid.org', 'Faith-based humanitarian relief.', now(), 1.0, 3000),
  ('Penny Appeal', 'international', 'Islamic', 'penny appeal', 'en', 'UK', 'https://pennyappeal.org', 'Muslim-led charity for orphans and clean water.', now(), 1.0, 10000),

  -- Science & knowledge
  ('Veritasium', 'media', 'Science', 'veritasium', 'en', 'US', 'https://www.veritasium.com', 'Deep-dive science explainers by Derek Muller.', now(), 1.2, 100000),
  ('Kurzgesagt', 'media', 'Science', 'kurzgesagt', 'en', 'DE', 'https://kurzgesagt.org', 'Animated big-idea science explainers.', now(), 1.2, 100000),
  ('SmarterEveryDay', 'media', 'Science', 'smartereveryday|smarter every day', 'en', 'US', NULL, 'Curiosity-driven science and engineering.', now(), 1.2, 100000),
  ('MinutePhysics', 'media', 'Science', 'minutephysics', 'en', 'US', NULL, 'Physics explainers in minutes.', now(), 1.1, 50000),
  ('MinuteEarth', 'media', 'Science', 'minuteearth', 'en', 'US', NULL, 'Earth science explainers.', now(), 1.1, 50000),
  ('TED-Ed', 'media', 'Science', 'ted-ed|ted ed', 'en', 'US', 'https://ed.ted.com', 'Animated lessons from teachers worldwide.', now(), 1.1, 100000),
  ('PBS Space Time', 'media', 'Science', 'pbs space time', 'en', 'US', NULL, 'Advanced physics and cosmology explainers.', now(), 1.1, 50000),
  ('Numberphile', 'media', 'Science', 'numberphile', 'en', 'UK', 'https://www.numberphile.com', 'Mathematics stories with world-class mathematicians.', now(), 1.1, 100000),
  ('3Blue1Brown', 'media', 'Science', '3blue1brown', 'en', 'US', 'https://www.3blue1brown.com', 'Mathematical intuition via visual essays.', now(), 1.2, 100000),
  ('SciShow', 'media', 'Science', 'scishow', 'en', 'US', NULL, 'Daily general-science explainers.', now(), 1.0, 100000),
  ('Real Engineering', 'media', 'Science', 'real engineering', 'en', 'IE', NULL, 'Engineering documentaries.', now(), 1.1, 50000),
  ('National Geographic Education', 'media', 'Science', 'national geographic education|nat geo education', 'en', 'US', 'https://education.nationalgeographic.org', 'Nature and geography education.', now(), 1.0, 20000),

  -- General education
  ('Khan Academy', 'education', 'Education', 'khan academy', 'en', 'US', 'https://www.khanacademy.org', 'Free world-class education across subjects.', now(), 1.3, 100000),
  ('MIT OpenCourseWare', 'university', 'Education', 'mit opencourseware|mit ocw', 'en', 'US', 'https://ocw.mit.edu', 'Full MIT courses online.', now(), 1.3, 50000),
  ('Harvard University', 'university', 'Education', 'harvard university', 'en', 'US', 'https://harvard.edu', 'Public lectures and courses from Harvard.', now(), 1.2, 100000),
  ('Stanford University', 'university', 'Education', 'stanford', 'en', 'US', 'https://stanford.edu', 'Public lectures and courses from Stanford.', now(), 1.2, 100000),
  ('Yale Courses', 'university', 'Education', 'yale courses|yaleuniversity', 'en', 'US', 'https://oyc.yale.edu', 'Open Yale Courses.', now(), 1.2, 50000),
  ('CrashCourse', 'media', 'Education', 'crashcourse', 'en', 'US', NULL, 'Fast-paced educational courses.', now(), 1.1, 100000),
  ('Coursera', 'education', 'Education', 'coursera', 'en', 'US', 'https://coursera.org', 'University-partnered online courses.', now(), 1.0, 50000),
  ('edX', 'education', 'Education', 'edx', 'en', 'US', 'https://edx.org', 'Open online courses from top universities.', now(), 1.0, 50000),
  ('Big Think', 'media', 'Education', 'big think', 'en', 'US', NULL, 'Interviews with leading thinkers.', now(), 1.0, 50000),
  ('University of Oxford', 'university', 'Education', 'university of oxford|oxford university', 'en', 'UK', 'https://www.ox.ac.uk', 'Public lectures from Oxford.', now(), 1.1, 20000),
  ('University of Cambridge', 'university', 'Education', 'university of cambridge|cambridge university', 'en', 'UK', 'https://cam.ac.uk', 'Public lectures from Cambridge.', now(), 1.1, 20000),

  -- History (channel-safe; per-video moderation still applies)
  ('Fall of Civilizations', 'media', 'History', 'fall of civilizations', 'en', 'UK', NULL, 'Long-form documentaries on how civilisations end.', now(), 1.2, 50000),
  ('Kings and Generals', 'media', 'History', 'kings and generals', 'en', 'INT', NULL, 'Animated military and political history.', now(), 1.1, 100000),
  ('Extra History', 'media', 'History', 'extra history|extra credits', 'en', 'US', NULL, 'Animated world-history series.', now(), 1.0, 50000),
  ('HistoryMarche', 'media', 'History', 'historymarche', 'en', 'INT', NULL, 'Animated history documentaries.', now(), 1.0, 50000),
  ('Timeline - World History Documentaries', 'media', 'History', 'timeline - world history|timeline world history', 'en', 'UK', NULL, 'Full-length history documentaries.', now(), 1.0, 100000),
  ('History Time', 'media', 'History', 'history time', 'en', 'UK', NULL, 'Ancient and medieval history documentaries.', now(), 1.0, 20000),

  -- Productivity & self-development
  ('Ali Abdaal', 'media', 'Productivity', 'ali abdaal', 'en', 'UK', 'https://aliabdaal.com', 'Evidence-based productivity essays.', now(), 1.0, 100000),
  ('Thomas Frank Explains', 'media', 'Productivity', 'thomas frank', 'en', 'US', NULL, 'Study skills and productivity systems.', now(), 1.0, 50000),
  ('Matt D''Avella', 'media', 'Productivity', 'matt d''avella|matt davella', 'en', 'US', NULL, 'Minimalism and habit design.', now(), 1.0, 50000),
  ('Cal Newport (talks)', 'media', 'Productivity', 'cal newport', 'en', 'US', 'https://calnewport.com', 'Deep work and focused productivity.', now(), 1.1, 20000),

  -- Business & entrepreneurship
  ('Y Combinator', 'media', 'Business', 'y combinator', 'en', 'US', 'https://ycombinator.com', 'Startup school and founder interviews.', now(), 1.1, 50000),
  ('Harvard Business Review', 'media', 'Business', 'harvard business review', 'en', 'US', 'https://hbr.org', 'Management research and insights.', now(), 1.0, 20000),
  ('Stanford Graduate School of Business', 'university', 'Business', 'stanford graduate school of business|stanford gsb', 'en', 'US', 'https://gsb.stanford.edu', 'Business talks from Stanford GSB.', now(), 1.1, 50000),
  ('a16z (Andreessen Horowitz)', 'media', 'Business', 'a16z|andreessen horowitz', 'en', 'US', 'https://a16z.com', 'Venture capital analysis and founder interviews.', now(), 1.0, 20000),

  -- Language
  ('Arabic101', 'media', 'Language', 'arabic101', 'en', 'INT', NULL, 'Learn Qur''anic and Modern Standard Arabic.', now(), 1.1, 20000),
  ('Learn Arabic with Maha', 'media', 'Language', 'learn arabic with maha', 'en', 'INT', NULL, 'Beginner Arabic lessons.', now(), 1.0, 20000),
  ('Bayyinah TV', 'media', 'Language', 'bayyinah tv', 'en', 'US', 'https://bayyinahtv.com', 'Arabic and Qur''an study library.', now(), 1.2, 10000),

  -- Nature
  ('BBC Earth', 'media', 'Nature', 'bbc earth', 'en', 'UK', 'https://www.bbcearth.com', 'Natural history documentaries.', now(), 1.0, 100000),
  ('Nat Geo WILD', 'media', 'Nature', 'nat geo wild|national geographic wild', 'en', 'US', NULL, 'Wildlife documentaries.', now(), 0.9, 100000)
ON CONFLICT DO NOTHING;

-- Backfill domain from organization_type + name for any existing rows missing it
UPDATE public.trusted_institutions
SET domain = COALESCE(domain,
  CASE
    WHEN organization_type IN ('seminary','waqf') THEN 'Islamic'
    WHEN organization_type IN ('university','college','academy','institute','education','research') THEN 'Education'
    WHEN organization_type = 'international' THEN 'Islamic'
    WHEN organization_type = 'government' THEN 'Islamic'
    WHEN organization_type = 'community' THEN 'Islamic'
    ELSE 'Islamic'
  END)
WHERE domain IS NULL;

UPDATE public.trusted_institutions
SET verified_at = COALESCE(verified_at, created_at)
WHERE verified_at IS NULL;
