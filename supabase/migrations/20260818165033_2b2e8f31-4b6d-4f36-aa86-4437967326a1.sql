-- 1. Bulk lane: jobs that only need the cheap caption source can park in
-- 'needs_ai' instead of burning attempts on the paid transcription path.
ALTER TABLE public.transcript_jobs DROP CONSTRAINT IF EXISTS transcript_jobs_status_check;
ALTER TABLE public.transcript_jobs
  ADD CONSTRAINT transcript_jobs_status_check
  CHECK (status IN ('queued','running','done','failed','needs_ai'));

-- 2. Translated captions
CREATE TABLE IF NOT EXISTS public.transcript_translations (
  video_id text NOT NULL,
  language text NOT NULL,
  source_language text NOT NULL,
  model text,
  segment_count integer NOT NULL DEFAULT 0,
  segments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, language)
);
GRANT SELECT ON public.transcript_translations TO anon, authenticated;
GRANT ALL ON public.transcript_translations TO service_role;
ALTER TABLE public.transcript_translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transcript_translations_public_read" ON public.transcript_translations;
CREATE POLICY "transcript_translations_public_read"
  ON public.transcript_translations FOR SELECT USING (true);

-- 3. Public directory of co-signing institutions (no key material exposed).
CREATE OR REPLACE FUNCTION public.list_signing_institutions()
RETURNS TABLE (
  slug text, name text, org_type text, country text, website text,
  logo_url text, public_statement text, cosign_count integer, since timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.slug, i.name, i.org_type, i.country, i.website,
         i.logo_url, i.public_statement, i.cosign_count, i.created_at
  FROM public.signing_institutions i
  WHERE i.status = 'active'
  ORDER BY i.cosign_count DESC, i.name ASC
$$;
REVOKE ALL ON FUNCTION public.list_signing_institutions() FROM public;
GRANT EXECUTE ON FUNCTION public.list_signing_institutions() TO anon, authenticated;

-- 4. Backfill throughput: enqueue far more per tick, cheapest-first.
CREATE OR REPLACE FUNCTION public.enqueue_transcript_backlog(_limit integer DEFAULT 400)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _inserted integer;
begin
  with popular as (
    select v.video_id, coalesce(w.cnt, 0) as cnt
    from public.curated_videos v
    left join (
      select video_id, count(*)::int as cnt from public.watch_history group by video_id
    ) w on w.video_id = v.video_id
    where v.moderation_state = 'approved'
      and coalesce(v.is_hidden, false) = false
      and coalesce(v.is_archived, false) = false
      and not exists (select 1 from public.video_transcripts t where t.video_id = v.video_id)
      and not exists (select 1 from public.transcript_jobs j where j.video_id = v.video_id)
    order by coalesce(w.cnt, 0) desc, v.ingested_at desc nulls last
    limit greatest(coalesce(_limit, 400), 1)
  )
  insert into public.transcript_jobs (video_id, priority)
  select video_id, least(cnt, 40) from popular
  on conflict (video_id) do nothing;
  get diagnostics _inserted = row_count;
  return _inserted;
end;
$$;

-- 5. Coverage metrics for the admin surface.
CREATE OR REPLACE FUNCTION public.get_transcript_coverage()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'transcripts', (select count(*) from public.video_transcripts),
    'segments', (select count(*) from public.transcript_segments),
    'translations', (select count(*) from public.transcript_translations),
    'eligible', (select count(*) from public.curated_videos
                 where moderation_state = 'approved'
                   and coalesce(is_hidden,false) = false
                   and coalesce(is_archived,false) = false),
    'jobs', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
             from (select status, count(*) as n from public.transcript_jobs group by status) s),
    'by_source', (select coalesce(jsonb_object_agg(source, n), '{}'::jsonb)
                  from (select source, count(*) as n from public.video_transcripts group by source) t),
    'generated_at', now()
  )
$$;
REVOKE ALL ON FUNCTION public.get_transcript_coverage() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_transcript_coverage() TO authenticated;