SELECT cron.schedule(
  'edge-response-cache-cleanup',
  '7 * * * *',
  $$DELETE FROM public.edge_response_cache WHERE expires_at < now() - interval '10 minutes'$$
);