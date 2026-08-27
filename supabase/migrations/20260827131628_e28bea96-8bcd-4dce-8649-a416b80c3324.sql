-- =============================================================================
-- Help & Support AI assistant: knowledge base, conversations, quality tracking
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- Knowledge base
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  summary text,
  category text NOT NULL DEFAULT 'general',
  language text NOT NULL DEFAULT 'en',
  authority_level text NOT NULL DEFAULT 'product',
  source_url text,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft',
  keywords text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_kb_documents_status_chk CHECK (status IN ('draft','published','archived')),
  CONSTRAINT support_kb_documents_authority_chk CHECK (authority_level IN ('policy','product','how_to'))
);

CREATE TABLE IF NOT EXISTS public.support_kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.support_kb_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  token_estimate integer,
  embedding vector(1536),
  embedding_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS support_kb_chunks_doc_idx ON public.support_kb_chunks(document_id);
CREATE INDEX IF NOT EXISTS support_kb_chunks_embedding_idx
  ON public.support_kb_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS support_kb_documents_status_idx ON public.support_kb_documents(status, language);

-- ---------------------------------------------------------------------------
-- Conversations & messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  anon_key text,
  locale text NOT NULL DEFAULT 'en',
  topic text,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  escalated boolean NOT NULL DEFAULT false,
  message_count integer NOT NULL DEFAULT 0,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_conversations_status_chk CHECK (status IN ('open','resolved','escalated','abandoned')),
  CONSTRAINT support_conversations_owner_chk CHECK (user_id IS NOT NULL OR anon_key IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  intent text,
  confidence numeric,
  grounded boolean,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_role_chk CHECK (role IN ('user','assistant','system'))
);

CREATE INDEX IF NOT EXISTS support_messages_conv_idx ON public.support_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS support_conversations_user_idx ON public.support_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_conversations_anon_idx ON public.support_conversations(anon_key, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.support_message_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,
  user_id uuid,
  anon_key text,
  helpful boolean NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS support_feedback_user_msg_idx
  ON public.support_message_feedback(message_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS support_feedback_anon_msg_idx
  ON public.support_message_feedback(message_id, anon_key) WHERE user_id IS NULL AND anon_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Knowledge gaps & escalations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_knowledge_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_norm text NOT NULL UNIQUE,
  sample_question text NOT NULL,
  topic text,
  locale text,
  ask_count integer NOT NULL DEFAULT 1,
  best_confidence numeric,
  status text NOT NULL DEFAULT 'open',
  resolved_document_id uuid REFERENCES public.support_kb_documents(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_knowledge_gaps_status_chk CHECK (status IN ('open','writing','resolved','wont_fix'))
);

CREATE TABLE IF NOT EXISTS public.support_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.support_conversations(id) ON DELETE SET NULL,
  user_id uuid,
  anon_key text,
  reason text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  summary text,
  contact_email text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_escalations_priority_chk CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT support_escalations_status_chk CHECK (status IN ('open','in_progress','resolved','closed'))
);

CREATE INDEX IF NOT EXISTS support_escalations_status_idx ON public.support_escalations(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT SELECT ON public.support_kb_documents TO anon, authenticated;
GRANT ALL ON public.support_kb_documents TO service_role;

GRANT SELECT ON public.support_kb_chunks TO authenticated;
GRANT ALL ON public.support_kb_chunks TO service_role;

GRANT SELECT ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;

GRANT SELECT ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

GRANT SELECT, INSERT ON public.support_message_feedback TO authenticated;
GRANT ALL ON public.support_message_feedback TO service_role;

GRANT SELECT ON public.support_knowledge_gaps TO authenticated;
GRANT ALL ON public.support_knowledge_gaps TO service_role;

GRANT SELECT, INSERT ON public.support_escalations TO authenticated;
GRANT ALL ON public.support_escalations TO service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.support_kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published help articles are public"
  ON public.support_kb_documents FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Staff can read every help article"
  ON public.support_kb_documents FOR SELECT
  TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Staff manage help articles"
  ON public.support_kb_documents FOR ALL
  TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read help chunks"
  ON public.support_kb_chunks FOR SELECT
  TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Users read their own support conversations"
  ON public.support_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Users read their own support messages"
  ON public.support_messages FOR SELECT
  TO authenticated
  USING (
    public.has_min_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.support_conversations c
      WHERE c.id = support_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users leave feedback on their own support answers"
  ON public.support_message_feedback FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.support_messages m
      JOIN public.support_conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users read their own support feedback"
  ON public.support_message_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Staff read knowledge gaps"
  ON public.support_knowledge_gaps FOR SELECT
  TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Staff manage knowledge gaps"
  ON public.support_knowledge_gaps FOR UPDATE
  TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Users read their own escalations"
  ON public.support_escalations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_min_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own escalations"
  ON public.support_escalations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND handled_by IS NULL AND handled_at IS NULL);

CREATE POLICY "Staff manage escalations"
  ON public.support_escalations FOR UPDATE
  TO authenticated
  USING (public.has_min_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_min_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.match_support_kb(
  _query_embedding extensions.vector(1536),
  _query_text text DEFAULT NULL,
  _locale text DEFAULT 'en',
  _limit integer DEFAULT 8
)
RETURNS TABLE (
  document_id uuid,
  slug text,
  title text,
  category text,
  authority_level text,
  source_url text,
  chunk_index integer,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH semantic AS (
    SELECT d.id, d.slug, d.title, d.category, d.authority_level, d.source_url,
           c.chunk_index, c.content,
           1 - (c.embedding OPERATOR(extensions.<=>) _query_embedding) AS similarity
    FROM support_kb_chunks c
    JOIN support_kb_documents d ON d.id = c.document_id
    WHERE d.status = 'published'
      AND c.embedding IS NOT NULL
      AND (_locale IS NULL OR d.language IN (_locale, 'en'))
    ORDER BY c.embedding OPERATOR(extensions.<=>) _query_embedding
    LIMIT GREATEST(_limit, 1)
  ),
  lexical AS (
    SELECT d.id, d.slug, d.title, d.category, d.authority_level, d.source_url,
           c.chunk_index, c.content,
           0.35::double precision AS similarity
    FROM support_kb_chunks c
    JOIN support_kb_documents d ON d.id = c.document_id
    WHERE d.status = 'published'
      AND _query_text IS NOT NULL
      AND length(btrim(_query_text)) > 2
      AND (c.content ILIKE '%' || btrim(_query_text) || '%' OR d.title ILIKE '%' || btrim(_query_text) || '%')
    LIMIT GREATEST(_limit, 1)
  ),
  merged AS (
    SELECT * FROM semantic
    UNION ALL
    SELECT * FROM lexical
  )
  SELECT DISTINCT ON (id, chunk_index)
    id AS document_id, slug, title, category, authority_level, source_url,
    chunk_index, content, similarity
  FROM merged
  ORDER BY id, chunk_index, similarity DESC;
$$;

GRANT EXECUTE ON FUNCTION public.match_support_kb(extensions.vector, text, text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.record_support_knowledge_gap(
  _question text,
  _topic text DEFAULT NULL,
  _locale text DEFAULT NULL,
  _confidence numeric DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm text;
  gap_id uuid;
BEGIN
  norm := lower(regexp_replace(btrim(coalesce(_question, '')), '\s+', ' ', 'g'));
  IF norm = '' THEN RETURN NULL; END IF;
  norm := left(norm, 300);

  INSERT INTO support_knowledge_gaps (question_norm, sample_question, topic, locale, best_confidence)
  VALUES (norm, left(btrim(_question), 500), _topic, _locale, _confidence)
  ON CONFLICT (question_norm) DO UPDATE
    SET ask_count = support_knowledge_gaps.ask_count + 1,
        last_seen_at = now(),
        topic = COALESCE(support_knowledge_gaps.topic, EXCLUDED.topic),
        best_confidence = GREATEST(COALESCE(support_knowledge_gaps.best_confidence, 0), COALESCE(EXCLUDED.best_confidence, 0))
  RETURNING id INTO gap_id;

  RETURN gap_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_support_knowledge_gap(text, text, text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_support_quality(_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => GREATEST(coalesce(_days, 7), 1));
  result jsonb;
BEGIN
  IF NOT public.has_min_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'since', since,
    'conversations', (SELECT count(*) FROM support_conversations WHERE created_at >= since),
    'messages', (SELECT count(*) FROM support_messages WHERE created_at >= since AND role = 'assistant'),
    'grounded_rate', (
      SELECT round(avg(CASE WHEN grounded THEN 1 ELSE 0 END)::numeric, 4)
      FROM support_messages WHERE created_at >= since AND role = 'assistant'
    ),
    'avg_confidence', (
      SELECT round(avg(confidence)::numeric, 4)
      FROM support_messages WHERE created_at >= since AND role = 'assistant' AND confidence IS NOT NULL
    ),
    'p95_latency_ms', (
      SELECT percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms)
      FROM support_messages WHERE created_at >= since AND latency_ms IS NOT NULL
    ),
    'escalation_rate', (
      SELECT round(avg(CASE WHEN escalated THEN 1 ELSE 0 END)::numeric, 4)
      FROM support_conversations WHERE created_at >= since
    ),
    'satisfaction', (
      SELECT round(avg(CASE WHEN helpful THEN 1 ELSE 0 END)::numeric, 4)
      FROM support_message_feedback WHERE created_at >= since
    ),
    'feedback_count', (SELECT count(*) FROM support_message_feedback WHERE created_at >= since),
    'open_gaps', (SELECT count(*) FROM support_knowledge_gaps WHERE status = 'open'),
    'open_escalations', (SELECT count(*) FROM support_escalations WHERE status IN ('open','in_progress')),
    'top_topics', (
      SELECT coalesce(jsonb_agg(t), '[]'::jsonb) FROM (
        SELECT coalesce(topic, 'unknown') AS topic, count(*) AS n
        FROM support_conversations WHERE created_at >= since
        GROUP BY 1 ORDER BY n DESC LIMIT 10
      ) t
    ),
    'top_gaps', (
      SELECT coalesce(jsonb_agg(g), '[]'::jsonb) FROM (
        SELECT id, sample_question, topic, ask_count, last_seen_at
        FROM support_knowledge_gaps WHERE status = 'open'
        ORDER BY ask_count DESC, last_seen_at DESC LIMIT 20
      ) g
    ),
    'kb_published', (SELECT count(*) FROM support_kb_documents WHERE status = 'published'),
    'kb_unindexed', (
      SELECT count(*) FROM support_kb_documents d
      WHERE d.status = 'published'
        AND NOT EXISTS (SELECT 1 FROM support_kb_chunks c WHERE c.document_id = d.id AND c.embedding IS NOT NULL)
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_support_quality(integer) TO authenticated, service_role;

DROP TRIGGER IF EXISTS support_kb_documents_touch ON public.support_kb_documents;
CREATE TRIGGER support_kb_documents_touch
  BEFORE UPDATE ON public.support_kb_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS support_conversations_touch ON public.support_conversations;
CREATE TRIGGER support_conversations_touch
  BEFORE UPDATE ON public.support_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();