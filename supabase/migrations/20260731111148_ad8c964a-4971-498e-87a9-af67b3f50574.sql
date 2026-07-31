GRANT SELECT ON public.concepts TO anon, authenticated;
GRANT SELECT ON public.concept_prerequisites TO anon, authenticated;
GRANT SELECT ON public.concept_video_segments TO anon, authenticated;
GRANT ALL ON public.concepts TO service_role;
GRANT ALL ON public.concept_prerequisites TO service_role;
GRANT ALL ON public.concept_video_segments TO service_role;