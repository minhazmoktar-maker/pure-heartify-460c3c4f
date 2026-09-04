CREATE OR REPLACE FUNCTION public._suggestion_phrase_is_noisy(_suggestion text, _qhead text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  WITH w AS (
    SELECT u.word, u.ord, COUNT(*) OVER () AS n
    FROM unnest(string_to_array(_suggestion, ' ')) WITH ORDINALITY AS u(word, ord)
  )
  SELECT
    -- repeated word anywhere ("hadith hadith")
    EXISTS (SELECT 1 FROM w GROUP BY word HAVING COUNT(*) > 1)
    -- a later word swallows the query head ("quran quranrecitation")
    OR EXISTS (
      SELECT 1 FROM w
      WHERE ord > 1 AND _qhead <> '' AND word <> _qhead AND word LIKE ('%' || _qhead || '%')
    )
    -- dangling connector / initial as the final word ("salah assim al", "ram asks dr")
    OR EXISTS (
      SELECT 1 FROM w
      WHERE ord = n AND (
        length(word) < 3
        OR word = ANY (ARRAY['al','ak','as','ash','abu','ibn','bin','dr','sh','ur','ul','wa','fi','min','ala','ke','ki','ka','se','di','da','no','mr','mrs','st'])
      )
    );
$function$;

GRANT EXECUTE ON FUNCTION public._suggestion_phrase_is_noisy(text, text) TO anon, authenticated, service_role;