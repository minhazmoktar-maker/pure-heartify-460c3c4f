-- Keyword/intent matching should survive typos and shorthand, so match against
-- a spelling-corrected form of the question rather than the literal input.
CREATE OR REPLACE FUNCTION public.support_correct_text(_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE s text;
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
  s := regexp_replace(s, '\mwont\M|\mwon t\M', 'will not', 'g');
  s := regexp_replace(s, '\mcant\M|\mcan t\M', 'cannot', 'g');
  s := regexp_replace(s, '\mdoesnt\M|\mdoesn t\M', 'does not', 'g');
  RETURN btrim(regexp_replace(s, '\s+', ' ', 'g'));
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
    SELECT public.support_correct_text(_query) AS raw,
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
                WHERE length(i) > 2 AND (SELECT raw FROM qt) LIKE '%' || public.support_correct_text(i) || '%'
             ) THEN 'intent'
             WHEN EXISTS (
               SELECT 1 FROM unnest(coalesce(d.keywords, ARRAY[]::text[])) k
                WHERE length(k) > 2 AND (SELECT raw FROM qt) LIKE '%' || public.support_correct_text(k) || '%'
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
                  WHERE length(i) > 2 AND (SELECT raw FROM qt) LIKE '%' || public.support_correct_text(i) || '%'
               ) THEN 0.45 ELSE 0 END
             + CASE WHEN EXISTS (
                 SELECT 1 FROM unnest(coalesce(d.keywords, ARRAY[]::text[])) k
                  WHERE length(k) > 4 AND (SELECT raw FROM qt) LIKE '%' || public.support_correct_text(k) || '%'
               ) THEN 0.35 ELSE 0 END
             + CASE WHEN d.faq_question IS NOT NULL
                     AND extensions.similarity((SELECT raw FROM qt), public.support_correct_text(d.faq_question)) > 0.45
                    THEN 0.3 ELSE 0 END
             + CASE WHEN extensions.similarity((SELECT raw FROM qt), public.support_correct_text(d.title)) > 0.45 THEN 0.2 ELSE 0 END
             -- explicit FAQ pairs outrank long-form articles at equal evidence
             + CASE WHEN d.authority_level = 'faq' THEN 0.05 ELSE 0 END
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

-- Broaden phrasings for the highest-traffic FAQs.
UPDATE public.support_kb_documents SET keywords = keywords || ARRAY['forgot my password','password reset','reset my password','cannot remember password']
 WHERE slug = 'faq-reset-password';
UPDATE public.support_kb_documents SET keywords = keywords || ARRAY['cancel my subscription','cancel my membership','end subscription','turn off renewal']
 WHERE slug = 'faq-cancel-subscription';
UPDATE public.support_kb_documents SET keywords = keywords || ARRAY['will not play','not playing','cannot watch','video error','stuck loading']
 WHERE slug = 'faq-video-not-playing';
UPDATE public.support_kb_documents SET keywords = keywords || ARRAY['what data','which data','data about me','store my data']
 WHERE slug = 'faq-data-collected';
UPDATE public.support_kb_documents SET keywords = keywords || ARRAY['membership include','premium plan','plus plan','what is premium','paid plan']
 WHERE slug = 'faq-membership-what';