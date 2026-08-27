-- =========================================================================
-- Heartify Support Agent hardening
--   1. document lifecycle: checksum, effective_until, supersession
--   2. deterministic FAQ matching on normalised questions (zero inference)
--   3. suggested-FAQ drafts that require human approval
--   4. richer resolution telemetry (categories, flows, blocked injections)
-- =========================================================================

-- ---------- 1. document lifecycle ---------------------------------------
ALTER TABLE public.support_kb_documents
  ADD COLUMN IF NOT EXISTS effective_until date,
  ADD COLUMN IF NOT EXISTS checksum text,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.support_kb_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS support_kb_documents_slug_key ON public.support_kb_documents (slug);

CREATE OR REPLACE FUNCTION public.support_kb_document_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.checksum := md5(
    coalesce(NEW.title, '') || '|' || coalesce(NEW.body, '') || '|' ||
    coalesce(NEW.faq_question, '') || '|' || coalesce(NEW.faq_answer, '') || '|' ||
    coalesce(NEW.authority_level, '') || '|' || coalesce(NEW.status, '')
  );
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.checksum IS DISTINCT FROM NEW.checksum) THEN
    NEW.last_reviewed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS support_kb_documents_stamp ON public.support_kb_documents;
CREATE TRIGGER support_kb_documents_stamp
BEFORE INSERT OR UPDATE ON public.support_kb_documents
FOR EACH ROW EXECUTE FUNCTION public.support_kb_document_stamp();

CREATE OR REPLACE FUNCTION public.support_kb_supersede_older()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' THEN
    UPDATE public.support_kb_documents d
       SET status = 'superseded',
           superseded_by = NEW.id,
           effective_until = COALESCE(d.effective_until, current_date)
     WHERE d.slug = NEW.slug
       AND d.language = NEW.language
       AND d.id <> NEW.id
       AND d.version < NEW.version
       AND d.status = 'published';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS support_kb_documents_supersede ON public.support_kb_documents;
CREATE TRIGGER support_kb_documents_supersede
AFTER INSERT OR UPDATE OF status, version ON public.support_kb_documents
FOR EACH ROW EXECUTE FUNCTION public.support_kb_supersede_older();

UPDATE public.support_kb_documents SET updated_at = updated_at WHERE checksum IS NULL;

-- ---------- 2. normalised deterministic FAQ matching --------------------
CREATE OR REPLACE FUNCTION public.support_normalize_question(_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  s text;
  stopwords text[] := ARRAY['a','an','the','please','kindly','hey','hi','hello','salam',
    'assalamualaikum','can','could','would','you','your','me','my','i','do','does','did',
    'is','are','am','to','of','for','on','in','at','and','so','just','tell','help'];
  toks text[];
BEGIN
  s := lower(coalesce(_input, ''));
  s := regexp_replace(s, '[^a-z0-9\s]', ' ', 'g');
  s := regexp_replace(s, '\macct\M|\macount\M', 'account', 'g');
  s := regexp_replace(s, '\mpassowrd\M|\mpasword\M|\mpwd\M', 'password', 'g');
  s := regexp_replace(s, '\mcancle\M', 'cancel', 'g');
  s := regexp_replace(s, '\msubscribtion\M|\msubcription\M', 'subscription', 'g');
  s := regexp_replace(s, '\mpremiun\M', 'premium', 'g');
  s := regexp_replace(s, '\mfavourites\M', 'favorites', 'g');
  s := regexp_replace(s, '\mfavourite\M', 'favorite', 'g');
  s := regexp_replace(s, '\mhowto\M', 'how to', 'g');
  s := regexp_replace(s, '\mu\M', 'you', 'g');
  s := regexp_replace(s, '\mur\M', 'your', 'g');
  s := regexp_replace(s, '\mpls\M|\mplz\M', 'please', 'g');
  s := btrim(regexp_replace(s, '\s+', ' ', 'g'));
  IF s = '' THEN RETURN ''; END IF;
  SELECT array_agg(t ORDER BY t) INTO toks
    FROM unnest(string_to_array(s, ' ')) AS t
   WHERE t <> '' AND NOT (t = ANY(stopwords));
  IF toks IS NULL THEN RETURN left(s, 200); END IF;
  RETURN left(array_to_string(toks, ' '), 300);
END;
$$;

DROP FUNCTION IF EXISTS public.support_faq_lookup(text, text, integer);

CREATE FUNCTION public.support_faq_lookup(_query text, _locale text DEFAULT 'en', _limit integer DEFAULT 1)
RETURNS TABLE (
  slug text,
  title text,
  category text,
  answer text,
  source_url text,
  requires_personalization boolean,
  matched_on text,
  score real
)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH qt AS (
    SELECT lower(btrim(coalesce(_query, ''))) AS raw,
           public.support_normalize_question(_query) AS norm,
           NULLIF(string_to_array(public.support_normalize_question(_query), ' '), ARRAY[]::text[]) AS toks
  ),
  scored AS (
    SELECT d.slug,
           d.title,
           d.category,
           coalesce(d.faq_answer, d.summary, left(d.body, 1200)) AS answer,
           d.source_url,
           d.requires_personalization,
           CASE
             WHEN d.faq_question IS NOT NULL
              AND public.support_normalize_question(d.faq_question) = (SELECT norm FROM qt) THEN 'exact_norm'
             WHEN EXISTS (
               SELECT 1 FROM unnest(coalesce(d.intents, ARRAY[]::text[])) i
                WHERE length(i) > 2 AND (SELECT raw FROM qt) LIKE '%' || lower(i) || '%'
             ) THEN 'intent'
             WHEN EXISTS (
               SELECT 1 FROM unnest(coalesce(d.keywords, ARRAY[]::text[])) k
                WHERE length(k) > 2 AND (SELECT raw FROM qt) LIKE '%' || lower(k) || '%'
             ) THEN 'keyword'
             ELSE 'fuzzy'
           END AS matched_on,
           (
             CASE WHEN d.faq_question IS NOT NULL
                   AND public.support_normalize_question(d.faq_question) = (SELECT norm FROM qt)
                  THEN 1.0 ELSE 0 END
             + CASE WHEN d.faq_question IS NOT NULL AND (SELECT toks FROM qt) IS NOT NULL THEN
                 0.6 * (
                   SELECT count(*)::real
                     FROM unnest((SELECT toks FROM qt)) t
                    WHERE t = ANY(string_to_array(public.support_normalize_question(d.faq_question), ' '))
                 ) / greatest(array_length((SELECT toks FROM qt), 1), 1)
               ELSE 0 END
             + CASE WHEN EXISTS (
                 SELECT 1 FROM unnest(coalesce(d.intents, ARRAY[]::text[])) i
                  WHERE length(i) > 2 AND (SELECT raw FROM qt) LIKE '%' || lower(i) || '%'
               ) THEN 0.45 ELSE 0 END
             + CASE WHEN EXISTS (
                 SELECT 1 FROM unnest(coalesce(d.keywords, ARRAY[]::text[])) k
                  WHERE length(k) > 2 AND (SELECT raw FROM qt) LIKE '%' || lower(k) || '%'
               ) THEN 0.35 ELSE 0 END
             + CASE WHEN d.faq_question IS NOT NULL
                     AND extensions.similarity((SELECT raw FROM qt), lower(d.faq_question)) > 0.45
                    THEN 0.3 ELSE 0 END
             + CASE WHEN extensions.similarity((SELECT raw FROM qt), lower(d.title)) > 0.45 THEN 0.2 ELSE 0 END
           )::real AS score
      FROM public.support_kb_documents d
     WHERE d.status = 'published'
       AND d.cacheable
       AND NOT d.requires_personalization
       AND coalesce(d.faq_answer, d.summary) IS NOT NULL
       AND d.effective_date <= current_date
       AND (d.effective_until IS NULL OR d.effective_until >= current_date)
       AND (d.language = coalesce(left(_locale, 2), 'en') OR d.language = 'en')
  )
  SELECT * FROM scored
   WHERE score > 0
   ORDER BY score DESC, length(answer) ASC
   LIMIT greatest(1, least(coalesce(_limit, 1), 10));
$$;

REVOKE ALL ON FUNCTION public.support_faq_lookup(text, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.support_faq_lookup(text, text, integer) TO anon, authenticated, service_role;

-- ---------- 3. suggested FAQ drafts (never auto-published) --------------
CREATE TABLE IF NOT EXISTS public.support_faq_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_id uuid REFERENCES public.support_knowledge_gaps(id) ON DELETE SET NULL,
  question text NOT NULL,
  question_norm text NOT NULL,
  suggested_answer text,
  category text NOT NULL DEFAULT 'general',
  locale text NOT NULL DEFAULT 'en',
  ask_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'needs_approval',
  origin text NOT NULL DEFAULT 'gap_detector',
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_document_id uuid REFERENCES public.support_kb_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_faq_drafts_norm_locale_idx
  ON public.support_faq_drafts (question_norm, locale);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_faq_drafts TO authenticated;
GRANT ALL ON public.support_faq_drafts TO service_role;

ALTER TABLE public.support_faq_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage faq drafts" ON public.support_faq_drafts;
CREATE POLICY "admins manage faq drafts"
ON public.support_faq_drafts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS support_faq_drafts_touch ON public.support_faq_drafts;
CREATE TRIGGER support_faq_drafts_touch
BEFORE UPDATE ON public.support_faq_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.support_propose_faq_draft(
  _question text,
  _topic text DEFAULT NULL,
  _locale text DEFAULT 'en',
  _min_asks integer DEFAULT 3
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text := public.support_normalize_question(_question);
  v_gap public.support_knowledge_gaps;
  v_id uuid;
BEGIN
  IF v_norm = '' THEN RETURN NULL; END IF;

  SELECT * INTO v_gap
    FROM public.support_knowledge_gaps
   WHERE question_norm = v_norm
   ORDER BY ask_count DESC
   LIMIT 1;

  IF v_gap.id IS NULL OR coalesce(v_gap.ask_count, 0) < greatest(_min_asks, 2) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.support_faq_drafts (gap_id, question, question_norm, category, locale, ask_count, origin)
  VALUES (v_gap.id, left(coalesce(v_gap.sample_question, _question), 500), v_norm,
          coalesce(_topic, v_gap.topic, 'general'), coalesce(left(_locale, 5), 'en'),
          coalesce(v_gap.ask_count, 1), 'gap_detector')
  ON CONFLICT (question_norm, locale) DO UPDATE
    SET ask_count = GREATEST(public.support_faq_drafts.ask_count, EXCLUDED.ask_count),
        updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.support_propose_faq_draft(text, text, text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.support_propose_faq_draft(text, text, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_review_faq_draft(
  _draft_id uuid,
  _approve boolean,
  _question text DEFAULT NULL,
  _answer text DEFAULT NULL,
  _category text DEFAULT NULL,
  _slug text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft public.support_faq_drafts;
  v_slug text;
  v_doc_id uuid;
  v_answer text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_draft FROM public.support_faq_drafts WHERE id = _draft_id;
  IF v_draft.id IS NULL THEN RAISE EXCEPTION 'draft not found'; END IF;

  IF NOT _approve THEN
    UPDATE public.support_faq_drafts
       SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
     WHERE id = _draft_id;
    RETURN jsonb_build_object('status', 'rejected', 'draft_id', _draft_id);
  END IF;

  v_answer := btrim(coalesce(_answer, v_draft.suggested_answer, ''));
  IF v_answer = '' THEN
    RAISE EXCEPTION 'an approved FAQ needs a human-written answer';
  END IF;

  v_slug := coalesce(
    nullif(btrim(_slug), ''),
    'faq-' || left(regexp_replace(lower(coalesce(_question, v_draft.question)), '[^a-z0-9]+', '-', 'g'), 48)
  );
  v_slug := btrim(v_slug, '-');

  INSERT INTO public.support_kb_documents (
    slug, title, body, summary, category, language, authority_level, status,
    version, effective_date, faq_question, faq_answer, cacheable, keywords, intents, created_by
  ) VALUES (
    v_slug,
    left(coalesce(_question, v_draft.question), 200),
    v_answer,
    left(v_answer, 400),
    coalesce(nullif(btrim(_category), ''), v_draft.category, 'general'),
    coalesce(left(v_draft.locale, 2), 'en'),
    'faq',
    'published',
    1,
    current_date,
    coalesce(_question, v_draft.question),
    v_answer,
    true,
    ARRAY[]::text[],
    ARRAY[]::text[],
    auth.uid()
  )
  ON CONFLICT (slug) DO UPDATE
    SET title = EXCLUDED.title,
        body = EXCLUDED.body,
        summary = EXCLUDED.summary,
        faq_question = EXCLUDED.faq_question,
        faq_answer = EXCLUDED.faq_answer,
        status = 'published',
        version = public.support_kb_documents.version + 1,
        effective_date = current_date
  RETURNING id INTO v_doc_id;

  UPDATE public.support_faq_drafts
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
         suggested_answer = v_answer, published_document_id = v_doc_id
   WHERE id = _draft_id;

  UPDATE public.support_knowledge_gaps
     SET status = 'resolved', resolved_document_id = v_doc_id
   WHERE id = v_draft.gap_id;

  RETURN jsonb_build_object('status', 'approved', 'document_id', v_doc_id, 'slug', v_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_faq_draft(uuid, boolean, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_faq_draft(uuid, boolean, text, text, text, text) TO authenticated;

-- ---------- 4. richer resolution telemetry -----------------------------
ALTER TABLE public.support_ai_usage
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS flow text,
  ADD COLUMN IF NOT EXISTS injection_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_failed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS support_ai_usage_created_layer_idx
  ON public.support_ai_usage (created_at DESC, layer);