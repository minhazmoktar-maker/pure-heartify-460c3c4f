-- L1a: table grants for public-read tables (RLS still enforces scoping)
GRANT SELECT ON public.leaderboard_snapshots TO anon, authenticated;
GRANT SELECT ON public.video_comments TO anon, authenticated;

-- L1a: expose search_reciters RPC to both roles
GRANT EXECUTE ON FUNCTION public.search_reciters(text, integer) TO anon, authenticated;