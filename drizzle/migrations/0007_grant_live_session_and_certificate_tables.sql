-- Data API grants were missing on the live-session and certificate tables, so
-- every direct PostgREST read/insert from the app (session room, chat) failed
-- with a permission error even though RLS policies were correct.
GRANT SELECT ON public.live_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT ALL ON public.live_sessions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_session_participants TO authenticated;
GRANT ALL ON public.live_session_participants TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_session_messages TO authenticated;
GRANT ALL ON public.live_session_messages TO service_role;

GRANT SELECT ON public.learning_certificates TO authenticated;
GRANT ALL ON public.learning_certificates TO service_role;