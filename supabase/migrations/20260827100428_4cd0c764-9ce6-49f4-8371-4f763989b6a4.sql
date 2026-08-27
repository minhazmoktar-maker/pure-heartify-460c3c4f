REVOKE EXECUTE ON FUNCTION public.snapshot_worker_health() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_worker_health_sla() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at_generic() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_serve_throughput(numeric, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_worker_health(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_replay_quality_checks(integer) FROM anon;