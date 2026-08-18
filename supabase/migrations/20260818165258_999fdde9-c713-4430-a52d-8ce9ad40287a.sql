-- Member requests jump to the AI lane, including videos parked as needs_ai.
CREATE OR REPLACE FUNCTION public.enqueue_transcript_job(_video_id text, _language_hint text default null)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _uid uuid := auth.uid();
  _status text;
begin
  if _uid is null then
    raise exception 'authentication required';
  end if;
  if _video_id is null or length(trim(_video_id)) = 0 or length(_video_id) > 32 then
    raise exception 'invalid video id';
  end if;
  if exists (select 1 from public.video_transcripts where video_id = _video_id) then
    return 'done';
  end if;
  insert into public.transcript_jobs as j (video_id, priority, language_hint, requested_by)
  values (_video_id, 90, nullif(left(coalesce(_language_hint, ''), 8), ''), _uid)
  on conflict (video_id) do update
    set priority = greatest(j.priority, 90),
        status = case
                   when j.status in ('needs_ai') then 'queued'
                   when j.status = 'failed' and j.attempts < 5 then 'queued'
                   else j.status
                 end,
        attempts = case when j.status = 'needs_ai' then 0 else j.attempts end,
        next_attempt_at = least(j.next_attempt_at, now()),
        updated_at = now()
  returning status into _status;
  return _status;
end;
$$;
REVOKE ALL ON FUNCTION public.enqueue_transcript_job(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_transcript_job(text, text) TO authenticated;

-- Throughput: a wide free-captions lane every 2 minutes, plus the existing
-- AI lane once an hour for member-requested videos with no public captions.
SELECT cron.unschedule('ingest-captions-10min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-captions-10min');
SELECT cron.unschedule('ingest-captions-bulk-2min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-captions-bulk-2min');
SELECT cron.unschedule('ingest-captions-ai-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-captions-ai-hourly');

SELECT cron.schedule('ingest-captions-bulk-2min', '*/2 * * * *', $$
  SELECT net.http_post(
    url := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/ingest-captions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', current_setting('app.ingest_cron_token', true)
    ),
    body := jsonb_build_object('limit', 60, 'concurrency', 10, 'allow_ai', false),
    timeout_milliseconds := 15000
  );
$$);

SELECT cron.schedule('ingest-captions-ai-hourly', '25 * * * *', $$
  SELECT net.http_post(
    url := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/ingest-captions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', current_setting('app.ingest_cron_token', true)
    ),
    body := jsonb_build_object('limit', 4, 'allow_ai', true),
    timeout_milliseconds := 15000
  );
$$);

-- Keep the backlog queue topped up ahead of the faster worker.
SELECT cron.unschedule('transcript-backlog-hourly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'transcript-backlog-hourly');
SELECT cron.schedule('transcript-backlog-10min', '*/10 * * * *', $$select public.enqueue_transcript_backlog(1200);$$);