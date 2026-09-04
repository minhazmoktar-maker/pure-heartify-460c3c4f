CREATE OR REPLACE FUNCTION public.search_autocomplete(_prefix text, _limit integer DEFAULT 8)
RETURNS TABLE(suggestion text, kind text, score numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH p AS (
    SELECT
      lower(btrim(coalesce(_prefix, ''))) AS q,
      lower(btrim(coalesce(_prefix, ''))) || '%' AS q_prefix,
      '%' || lower(btrim(coalesce(_prefix, ''))) || '%' AS q_infix,
      regexp_replace(lower(btrim(coalesce(_prefix, ''))), '[^a-z0-9 ]', '', 'g') AS q_safe,
      GREATEST(1, LEAST(coalesce(_limit, 8), 20)) AS lim
  ),
  stop AS (
    SELECT ARRAY['the','and','of','a','an','in','for','with','to','is','are','my','by','on','at','or','that','this','from','it','as','be','was','were','you','your','we','he','she','they','not','but','so','if','then','than','into','about','all','can','will','how','what','when','who','why','do','does','did','has','have','had','its','his','her','our','their','there','here','one','two','new','best','full','part','ep','episode','vs','ka','ki','ke','na','se','hai','ko','kya','mein'] AS words
  ),
  approved_ch AS (
    SELECT lower(ac.title) AS suggestion, 'channel'::text AS kind,
           25::numeric AS videos,
           (CASE WHEN lower(ac.title) LIKE p.q_prefix THEN 1.10 ELSE 0.86 END)::numeric AS source_weight
    FROM public.approved_channels ac, p
    WHERE p.q <> ''
      AND ac.title IS NOT NULL
      AND (
        lower(ac.title) LIKE p.q_prefix
        OR (length(p.q_safe) >= 3 AND lower(ac.title) ~ ('(^|[^a-z0-9])' || p.q_safe))
      )
      AND NOT public._suggestion_is_blocked(ac.title)
    ORDER BY (lower(ac.title) LIKE p.q_prefix) DESC, lower(ac.title)
    LIMIT 40
  ),
  categories AS (
    SELECT c.suggestion, 'category'::text AS kind, 20::numeric AS videos,
           (CASE WHEN c.suggestion LIKE p.q_prefix THEN 0.94 ELSE 0.80 END)::numeric AS source_weight
    FROM (
      VALUES
        ('quran'), ('quran recitation'), ('quran tafsir'), ('tafsir'), ('seerah'),
        ('hadith'), ('dua'), ('adhkar'), ('fiqh'), ('aqeedah'), ('salah'),
        ('prayer'), ('ramadan'), ('fasting'), ('hajj'), ('umrah'), ('zakat'),
        ('islamic history'), ('islamic finance'), ('halal investing'), ('arabic'),
        ('arabic for beginners'), ('education'), ('science'), ('history'),
        ('productivity'), ('family'), ('parenting'), ('kids'), ('business'),
        ('lectures'), ('spirituality'), ('dawah'), ('lifestyle'), ('food'),
        ('memorize quran'), ('learn tajweed'), ('tajweed'), ('names of allah'),
        ('stories of the prophets'), ('marriage in islam'), ('patience'),
        ('repentance'), ('charity'), ('character'), ('knowledge')
    ) AS c(suggestion), p
    WHERE p.q <> ''
      AND c.suggestion LIKE p.q_infix
  ),
  popular AS (
    SELECT lower(sq.normalized_query) AS suggestion, 'popular'::text AS kind,
           COUNT(*)::numeric AS videos, 0.78::numeric AS source_weight
    FROM public.search_queries sq, p
    WHERE p.q <> ''
      AND sq.normalized_query IS NOT NULL
      AND sq.normalized_query <> ''
      AND COALESCE(sq.result_count, 0) > 0
      AND lower(sq.normalized_query) LIKE p.q_infix
      AND sq.created_at > now() - interval '90 days'
      AND NOT public._suggestion_is_blocked(sq.normalized_query)
    GROUP BY lower(sq.normalized_query)
    ORDER BY COUNT(*) DESC, lower(sq.normalized_query)
    LIMIT 30
  ),
  titles AS (
    SELECT lower(cv.title) AS t
    FROM public.curated_videos cv, p
    WHERE p.q <> ''
      AND length(p.q_safe) >= 3
      AND cv.search_tsv @@ plainto_tsquery('simple', p.q_safe)
      AND cv.moderation_state IN ('approved', 'auto_approved')
      AND COALESCE(cv.is_hidden, false) = false
      AND COALESCE(cv.is_archived, false) = false
      AND COALESCE(cv.is_premium_only, false) = false
      AND COALESCE(cv.visual_state, 'clean') = 'clean'
      AND COALESCE(cv.halal_score, 0) >= 70
      AND cv.title IS NOT NULL
    LIMIT 400
  ),
  -- Word-array phrase mining: take the matched word plus the next one or two
  -- WHOLE words, so a suggestion can never cut a word in half.
  tokenized AS (
    SELECT a.arr, x.idx, array_length(string_to_array(p.q_safe, ' '), 1) AS qwords
    FROM titles, p,
      LATERAL (
        SELECT regexp_split_to_array(btrim(regexp_replace(titles.t, '[^a-z0-9]+', ' ', 'g')), ' ') AS arr
      ) a,
      LATERAL (
        SELECT MIN(i) AS idx
        FROM generate_subscripts(a.arr, 1) i
        WHERE a.arr[i] LIKE (split_part(p.q_safe, ' ', 1) || '%')
      ) x
    WHERE x.idx IS NOT NULL
  ),
  raw_phrases AS (
    SELECT btrim(array_to_string(tk.arr[tk.idx : tk.idx + tk.qwords - 1 + extra.n], ' ')) AS suggestion
    FROM tokenized tk, (VALUES (1), (2)) AS extra(n)
    WHERE array_length(tk.arr, 1) >= tk.idx + tk.qwords - 1 + extra.n
  ),
  phrases AS (
    SELECT x.suggestion, COUNT(*)::numeric AS videos
    FROM raw_phrases x, stop, p
    WHERE x.suggestion IS NOT NULL
      AND length(x.suggestion) BETWEEN 4 AND 60
      AND x.suggestion LIKE (split_part(p.q_safe, ' ', 1) || '%')
      AND NOT (
        SELECT bool_and(w = ANY (stop.words) OR length(w) < 3)
        FROM unnest(string_to_array(x.suggestion, ' ')) WITH ORDINALITY AS u(w, ord)
        WHERE ord > array_length(string_to_array(p.q_safe, ' '), 1)
      )
      AND NOT (split_part(x.suggestion, ' ', array_length(string_to_array(x.suggestion, ' '), 1)) = ANY (stop.words))
      AND NOT public._suggestion_is_blocked(x.suggestion)
    GROUP BY x.suggestion
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC, x.suggestion
    LIMIT 14
  ),
  related AS (
    SELECT suggestion, 'title'::text AS kind, videos, 1.04::numeric AS source_weight
    FROM phrases
  ),
  merged AS (
    SELECT * FROM approved_ch
    UNION ALL SELECT * FROM categories
    UNION ALL SELECT * FROM popular
    UNION ALL SELECT * FROM related
  ),
  scored AS (
    SELECT suggestion, kind,
      (
        source_weight +
        CASE kind
          WHEN 'title'    THEN 0.30
          WHEN 'channel'  THEN 0.20
          WHEN 'category' THEN 0.18
          WHEN 'popular'  THEN 0.14
          ELSE 0.04
        END +
        LEAST(ln(1 + videos) / 10.0, 0.24)
      )::numeric AS score
    FROM merged
    WHERE length(suggestion) BETWEEN 2 AND 90
      AND NOT public._suggestion_is_blocked(suggestion)
  ),
  ranked AS (
    SELECT suggestion, kind, score,
      ROW_NUMBER() OVER (PARTITION BY suggestion ORDER BY score DESC) AS rn
    FROM scored
  )
  SELECT suggestion, kind, score
  FROM ranked, p
  WHERE rn = 1
  ORDER BY score DESC, suggestion ASC
  LIMIT (SELECT lim FROM p);
$function$;

GRANT EXECUTE ON FUNCTION public.search_autocomplete(text, integer) TO anon, authenticated, service_role;