-- ============================================================
-- Heartify Support AI: provider-independent, cost-optimised layer
-- ============================================================

-- 1. Knowledge versioning + deterministic FAQ fields on the KB
ALTER TABLE public.support_kb_documents
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS effective_date date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS requires_auth boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_personalization boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intents text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS faq_question text,
  ADD COLUMN IF NOT EXISTS faq_answer text,
  ADD COLUMN IF NOT EXISTS cacheable boolean NOT NULL DEFAULT true;

-- 2. Global knowledge version (bumped whenever published knowledge changes)
CREATE TABLE IF NOT EXISTS public.support_knowledge_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  knowledge_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.support_knowledge_state TO authenticated, anon;
GRANT ALL ON public.support_knowledge_state TO service_role;
ALTER TABLE public.support_knowledge_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "knowledge version is public read" ON public.support_knowledge_state;
CREATE POLICY "knowledge version is public read"
  ON public.support_knowledge_state FOR SELECT USING (true);
INSERT INTO public.support_knowledge_state (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 3. Verified answer cache (exact + semantic). Generic answers only.
CREATE TABLE IF NOT EXISTS public.support_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_norm text NOT NULL,
  question_sample text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  intent text,
  answer text NOT NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric NOT NULL DEFAULT 0,
  provider text,
  model text,
  knowledge_version integer NOT NULL DEFAULT 1,
  embedding extensions.vector(1536),
  hits integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE UNIQUE INDEX IF NOT EXISTS support_response_cache_key
  ON public.support_response_cache (question_norm, locale);
CREATE INDEX IF NOT EXISTS support_response_cache_expiry
  ON public.support_response_cache (expires_at);
CREATE INDEX IF NOT EXISTS support_response_cache_embedding
  ON public.support_response_cache USING hnsw (embedding extensions.vector_cosine_ops);
GRANT ALL ON public.support_response_cache TO service_role;
ALTER TABLE public.support_response_cache ENABLE ROW LEVEL SECURITY;

-- 4. Per-request AI/router telemetry (no PII: layer + cost only)
CREATE TABLE IF NOT EXISTS public.support_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  conversation_id uuid,
  layer text NOT NULL,
  provider text,
  model text,
  tier text,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  llm_called boolean NOT NULL DEFAULT false,
  resolved boolean NOT NULL DEFAULT true,
  escalated boolean NOT NULL DEFAULT false,
  degraded boolean NOT NULL DEFAULT false,
  topic text,
  locale text,
  question_norm text
);
CREATE INDEX IF NOT EXISTS support_ai_usage_created ON public.support_ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS support_ai_usage_layer ON public.support_ai_usage (layer, created_at DESC);
GRANT ALL ON public.support_ai_usage TO service_role;
ALTER TABLE public.support_ai_usage ENABLE ROW LEVEL SECURITY;

-- 5. Provider health for failover visibility
CREATE TABLE IF NOT EXISTS public.support_provider_health (
  provider text PRIMARY KEY,
  status text NOT NULL DEFAULT 'unknown',
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_ok_at timestamptz,
  last_error_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.support_provider_health TO service_role;
ALTER TABLE public.support_provider_health ENABLE ROW LEVEL SECURITY;

-- 6. Bump knowledge version + expire affected cache when knowledge changes
CREATE OR REPLACE FUNCTION public.support_bump_knowledge_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v integer;
BEGIN
  UPDATE public.support_knowledge_state
     SET knowledge_version = knowledge_version + 1, updated_at = now()
   WHERE id
  RETURNING knowledge_version INTO v;

  -- Any cached answer produced against older knowledge is no longer trustworthy.
  UPDATE public.support_response_cache
     SET expires_at = now()
   WHERE knowledge_version < COALESCE(v, knowledge_version)
     AND expires_at > now();

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS support_kb_documents_version_bump ON public.support_kb_documents;
CREATE TRIGGER support_kb_documents_version_bump
AFTER INSERT OR UPDATE OF body, status, faq_answer, faq_question, keywords, intents, title
  OR DELETE ON public.support_kb_documents
FOR EACH STATEMENT EXECUTE FUNCTION public.support_bump_knowledge_version();

-- 7. Deterministic FAQ lookup (no LLM): keyword/intent/title/faq_question match
CREATE OR REPLACE FUNCTION public.support_faq_lookup(
  _query text,
  _locale text DEFAULT 'en',
  _limit integer DEFAULT 3
)
RETURNS TABLE (
  slug text,
  title text,
  category text,
  answer text,
  source_url text,
  requires_personalization boolean,
  score real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH q AS (SELECT lower(btrim(coalesce(_query, ''))) AS text)
  SELECT d.slug,
         d.title,
         d.category,
         coalesce(d.faq_answer, d.summary, left(d.body, 1200)) AS answer,
         d.source_url,
         d.requires_personalization,
         (
           CASE WHEN d.faq_question IS NOT NULL
                     AND lower(btrim(d.faq_question)) = (SELECT text FROM q) THEN 1.0
                WHEN d.faq_question IS NOT NULL
                     AND (SELECT text FROM q) % lower(d.faq_question) THEN 0.8
                ELSE 0 END
           + CASE WHEN EXISTS (
               SELECT 1 FROM unnest(d.keywords) k
                WHERE length(k) > 2 AND (SELECT text FROM q) LIKE '%' || lower(k) || '%'
             ) THEN 0.5 ELSE 0 END
           + CASE WHEN (SELECT text FROM q) % lower(d.title) THEN 0.3 ELSE 0 END
         )::real AS score
    FROM public.support_kb_documents d
   WHERE d.status = 'published'
     AND d.cacheable
     AND coalesce(d.faq_answer, d.summary) IS NOT NULL
     AND NOT d.requires_personalization
     AND d.effective_date <= current_date
  ORDER BY score DESC, d.updated_at DESC
  LIMIT greatest(1, least(_limit, 10));
$$;

-- 8. Semantic answer-cache lookup
CREATE OR REPLACE FUNCTION public.support_cache_match(
  _query_embedding extensions.vector(1536),
  _locale text DEFAULT 'en',
  _min_similarity real DEFAULT 0.93
)
RETURNS TABLE (
  id uuid,
  answer text,
  intent text,
  sources jsonb,
  actions jsonb,
  confidence numeric,
  similarity real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT c.id, c.answer, c.intent, c.sources, c.actions, c.confidence,
         (1 - (c.embedding <=> _query_embedding))::real AS similarity
    FROM public.support_response_cache c
   WHERE c.embedding IS NOT NULL
     AND c.expires_at > now()
     AND c.locale = coalesce(_locale, 'en')
     AND c.knowledge_version = (SELECT knowledge_version FROM public.support_knowledge_state WHERE id)
     AND (1 - (c.embedding <=> _query_embedding)) >= _min_similarity
  ORDER BY c.embedding <=> _query_embedding
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.support_cache_touch(_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.support_response_cache
     SET hits = hits + 1, last_hit_at = now()
   WHERE id = _id;
$$;

-- 9. Cost + cache telemetry for the admin dashboard
CREATE OR REPLACE FUNCTION public.admin_support_ai_cost(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(_days, 7), 90)));
  result jsonb;
BEGIN
  IF NOT public.has_min_role(auth.uid(), 'moderator'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'since', since,
    'total_requests', count(*),
    'llm_requests', count(*) FILTER (WHERE llm_called),
    'no_llm_requests', count(*) FILTER (WHERE NOT llm_called),
    'no_llm_rate', CASE WHEN count(*) = 0 THEN NULL
                        ELSE round((count(*) FILTER (WHERE NOT llm_called))::numeric / count(*), 4) END,
    'exact_cache_hits', count(*) FILTER (WHERE layer = 'exact_cache'),
    'semantic_cache_hits', count(*) FILTER (WHERE layer = 'semantic_cache'),
    'faq_hits', count(*) FILTER (WHERE layer = 'faq'),
    'degraded', count(*) FILTER (WHERE degraded),
    'escalated', count(*) FILTER (WHERE escalated),
    'prompt_tokens', coalesce(sum(prompt_tokens), 0),
    'completion_tokens', coalesce(sum(completion_tokens), 0),
    'cost_usd', coalesce(round(sum(cost_usd), 4), 0),
    'avg_cost_usd', CASE WHEN count(*) = 0 THEN 0 ELSE round(sum(cost_usd) / count(*), 6) END,
    'avg_latency_ms', coalesce(round(avg(latency_ms)), 0),
    'projected_monthly_usd', CASE WHEN count(*) = 0 THEN 0
      ELSE round(sum(cost_usd) / greatest(1, least(coalesce(_days, 7), 90)) * 30, 4) END,
    'by_layer', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT layer, count(*) AS n, coalesce(round(sum(cost_usd), 4), 0) AS cost_usd
          FROM public.support_ai_usage WHERE created_at >= since
         GROUP BY layer ORDER BY count(*) DESC
      ) x), '[]'::jsonb),
    'by_provider', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT coalesce(provider, 'none') AS provider, coalesce(model, '-') AS model,
               count(*) AS n, coalesce(round(sum(cost_usd), 4), 0) AS cost_usd
          FROM public.support_ai_usage WHERE created_at >= since AND llm_called
         GROUP BY 1, 2 ORDER BY count(*) DESC LIMIT 10
      ) x), '[]'::jsonb),
    'top_questions', coalesce((
      SELECT jsonb_agg(x) FROM (
        SELECT question_norm, count(*) AS n,
               count(*) FILTER (WHERE llm_called) AS llm_n
          FROM public.support_ai_usage
         WHERE created_at >= since AND question_norm IS NOT NULL
         GROUP BY question_norm ORDER BY count(*) DESC LIMIT 15
      ) x), '[]'::jsonb),
    'cache_entries', (SELECT count(*) FROM public.support_response_cache WHERE expires_at > now()),
    'knowledge_version', (SELECT knowledge_version FROM public.support_knowledge_state WHERE id),
    'providers', coalesce((
      SELECT jsonb_agg(to_jsonb(h)) FROM public.support_provider_health h), '[]'::jsonb)
  )
    INTO result
    FROM public.support_ai_usage
   WHERE created_at >= since;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_support_ai_cost(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_support_ai_cost(integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.support_faq_lookup(text, text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.support_faq_lookup(text, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.support_cache_match(extensions.vector, text, real) FROM public;
GRANT EXECUTE ON FUNCTION public.support_cache_match(extensions.vector, text, real) TO service_role;
REVOKE ALL ON FUNCTION public.support_cache_touch(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.support_cache_touch(uuid) TO service_role;