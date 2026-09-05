CREATE TABLE IF NOT EXISTS public.edge_response_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.edge_response_cache TO service_role;

ALTER TABLE public.edge_response_cache ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_edge_response_cache_expires ON public.edge_response_cache (expires_at);