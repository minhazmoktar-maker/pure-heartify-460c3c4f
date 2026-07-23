-- Restore anon EXECUTE on log_feed_impressions (public analytics logger, security definer, safe: only accepts video ids)
GRANT EXECUTE ON FUNCTION public.log_feed_impressions(text[]) TO anon;

-- Allow anonymous visitors to upsert their session attribution row (session-scoped, no user_id)
CREATE POLICY "attribution anon session upsert"
ON public.attributions
FOR UPDATE
TO anon
USING (user_id IS NULL)
WITH CHECK (user_id IS NULL);