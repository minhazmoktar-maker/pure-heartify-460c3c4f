
DROP VIEW IF EXISTS public.transparency_report;
DROP VIEW IF EXISTS public.transparency_appeals;

CREATE VIEW public.transparency_report
WITH (security_invoker = true) AS
SELECT
  date_trunc('month', created_at)::date AS period,
  stage::text AS stage,
  state::text AS state,
  count(*)::bigint AS decisions
FROM public.moderation_decisions
WHERE created_at > now() - interval '18 months'
GROUP BY 1, 2, 3;

CREATE VIEW public.transparency_appeals
WITH (security_invoker = true) AS
SELECT
  date_trunc('month', created_at)::date AS period,
  status,
  count(*)::bigint AS appeals
FROM public.appeals
WHERE created_at > now() - interval '18 months'
GROUP BY 1, 2;

GRANT SELECT ON public.transparency_report TO anon, authenticated;
GRANT SELECT ON public.transparency_appeals TO anon, authenticated;

-- Allow public transparency aggregation by adding read policies (aggregated only via view).
-- moderation_decisions RLS restricts direct row reads; but views with security_invoker
-- run with caller privileges — so we need a permissive SELECT policy just for aggregation.
-- Safer alternative: mark the views SECURITY INVOKER and query via SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.get_transparency_report()
RETURNS TABLE(period date, stage text, state text, decisions bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    date_trunc('month', created_at)::date,
    stage::text,
    state::text,
    count(*)::bigint
  FROM public.moderation_decisions
  WHERE created_at > now() - interval '18 months'
  GROUP BY 1,2,3
  ORDER BY 1 DESC, 2, 3;
$$;

CREATE OR REPLACE FUNCTION public.get_transparency_appeals()
RETURNS TABLE(period date, status text, appeals bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    date_trunc('month', created_at)::date,
    status,
    count(*)::bigint
  FROM public.appeals
  WHERE created_at > now() - interval '18 months'
  GROUP BY 1,2
  ORDER BY 1 DESC, 2;
$$;

REVOKE ALL ON FUNCTION public.get_transparency_report() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_transparency_appeals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_transparency_report() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_transparency_appeals() TO anon, authenticated;
