
-- ============================================================
-- 1. Idempotent seed helpers (usable from any future migration)
-- ============================================================

CREATE OR REPLACE FUNCTION public.upsert_reciter(
  _name_en          text,
  _name_ar          text DEFAULT NULL,
  _country          text DEFAULT NULL,
  _primary_riwayah  text DEFAULT NULL,
  _era              text DEFAULT NULL,
  _voice_style      text DEFAULT NULL,
  _is_living        boolean DEFAULT NULL,
  _image_url        text DEFAULT NULL,
  _biography        text DEFAULT NULL,
  _popularity_score integer DEFAULT NULL,
  _active_years     text DEFAULT NULL,
  _social_links     jsonb DEFAULT NULL,
  _category         text DEFAULT 'quran_reciter'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  INSERT INTO public.reciters (
    canonical_name_en, canonical_name_ar, country, primary_riwayah, era,
    voice_style, is_living, image_url, biography, popularity_score,
    active_years, social_links, category
  ) VALUES (
    _name_en, _name_ar, _country, _primary_riwayah, _era,
    _voice_style, _is_living, _image_url, _biography,
    COALESCE(_popularity_score, 0), _active_years,
    COALESCE(_social_links, '{}'::jsonb), _category
  )
  ON CONFLICT (canonical_name_en) DO UPDATE SET
    canonical_name_ar = COALESCE(EXCLUDED.canonical_name_ar, reciters.canonical_name_ar),
    country           = COALESCE(EXCLUDED.country,           reciters.country),
    primary_riwayah   = COALESCE(EXCLUDED.primary_riwayah,   reciters.primary_riwayah),
    era               = COALESCE(EXCLUDED.era,               reciters.era),
    voice_style       = COALESCE(EXCLUDED.voice_style,       reciters.voice_style),
    is_living         = COALESCE(EXCLUDED.is_living,         reciters.is_living),
    image_url         = COALESCE(EXCLUDED.image_url,         reciters.image_url),
    biography         = COALESCE(EXCLUDED.biography,         reciters.biography),
    popularity_score  = GREATEST(EXCLUDED.popularity_score,  reciters.popularity_score),
    active_years      = COALESCE(EXCLUDED.active_years,      reciters.active_years),
    social_links      = reciters.social_links || COALESCE(EXCLUDED.social_links, '{}'::jsonb),
    updated_at        = now()
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_reciter_alias(
  _reciter_id uuid,
  _alias      text,
  _alias_type text DEFAULT 'transliteration'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _alias IS NULL OR btrim(_alias) = '' THEN
    RETURN false;
  END IF;
  INSERT INTO public.reciter_aliases (reciter_id, alias, alias_type)
  VALUES (_reciter_id, btrim(_alias), _alias_type)
  ON CONFLICT (alias_norm) DO NOTHING;
  RETURN FOUND;
END;
$$;

-- ============================================================
-- 2. Programmatic alias variant generator
-- ============================================================
-- Given a canonical English name, return a set of plausible alternate
-- spellings (Al-/El-/As-/Ash- prefixes, sh/ch swaps, ee/i, oo/u, dropped
-- hyphens, etc.). This is intentionally over-generative: alias_norm's
-- unique constraint and the SELECT filter on lookup mean stray variants
-- are cheap.

CREATE OR REPLACE FUNCTION public.generate_alias_variants(_name text)
RETURNS SETOF text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  base   text := btrim(_name);
  seen   text[] := ARRAY[]::text[];
  push   text;
  variants text[];
  v      text;
BEGIN
  IF base IS NULL OR base = '' THEN RETURN; END IF;

  variants := ARRAY[base];

  -- Prefix swaps: Al- ↔ El- ↔ As- ↔ Ash- ↔ (stripped)
  IF base ~* '^(al|el|as|ash|ar|az|an|ad|at)[-\s]' THEN
    variants := variants || regexp_replace(base, '^(al|el|as|ash|ar|az|an|ad|at)[-\s]', '', 'i');
    variants := variants || regexp_replace(base, '^(al|el|as|ash|ar|az|an|ad|at)[-\s]', 'Al-', 'i');
    variants := variants || regexp_replace(base, '^(al|el|as|ash|ar|az|an|ad|at)[-\s]', 'El-', 'i');
    variants := variants || regexp_replace(base, '^(al|el|as|ash|ar|az|an|ad|at)[-\s]', 'Al ', 'i');
  ELSE
    variants := variants || ('Al-' || base);
    variants := variants || ('El-' || base);
  END IF;

  -- Common phoneme swaps applied over every current candidate.
  FOR v IN SELECT unnest(variants) LOOP
    variants := variants
      || replace(v, 'sh', 'ch')
      || replace(v, 'ee', 'i')
      || replace(v, 'oo', 'u')
      || replace(v, 'ou', 'u')
      || replace(v, 'aa', 'a')
      || replace(v, 'y',  'i')
      || replace(v, 'i',  'y')
      || replace(v, '-', ' ')
      || replace(v, '-', '')
      || replace(replace(v, 'dh', 'z'), 'gh', 'g');
  END LOOP;

  -- De-duplicate on normalised form (matches the alias_norm generator).
  FOR v IN SELECT DISTINCT unnest(variants) LOOP
    push := btrim(v);
    IF push = '' THEN CONTINUE; END IF;
    IF lower(regexp_replace(push, '[^a-zA-Z0-9]+', '', 'g'))
       = ANY (SELECT lower(regexp_replace(x, '[^a-zA-Z0-9]+', '', 'g')) FROM unnest(seen) x) THEN
      CONTINUE;
    END IF;
    seen := seen || push;
    RETURN NEXT push;
  END LOOP;
END;
$$;

-- Backfill: apply the generator to every existing reciter.
CREATE OR REPLACE FUNCTION public.backfill_reciter_alias_variants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v text;
  added integer := 0;
BEGIN
  FOR r IN SELECT id, canonical_name_en FROM public.reciters LOOP
    FOR v IN SELECT public.generate_alias_variants(r.canonical_name_en) LOOP
      IF public.add_reciter_alias(r.id, v, 'auto_transliteration') THEN
        added := added + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN added;
END;
$$;

-- Run once now. Safe to re-run anytime — ON CONFLICT DO NOTHING protects it.
SELECT public.backfill_reciter_alias_variants();
