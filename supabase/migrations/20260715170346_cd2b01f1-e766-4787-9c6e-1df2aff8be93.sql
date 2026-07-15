-- Restrict search_queries INSERT to authenticated users only.
-- Anonymous users may still search; we simply do not log their queries,
-- preventing pollution of the analytics table with unauthenticated rows.
DROP POLICY IF EXISTS "Anyone can log a search" ON public.search_queries;

CREATE POLICY "Authenticated users log their own searches"
ON public.search_queries
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);