SELECT cron.schedule('benefit-autoramp-daily', '20 3 * * *', $$select public.benefit_ranker_autoramp();$$);
SELECT cron.schedule('transcript-requeue-stale', '5,35 * * * *', $$select public.requeue_stale_transcript_jobs(20);$$);
SELECT public.requeue_stale_transcript_jobs(0);
SELECT public.enqueue_transcript_backlog(40);