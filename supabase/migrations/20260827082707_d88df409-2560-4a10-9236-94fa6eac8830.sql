SELECT cron.schedule(
  'recompute-duplicate-groups',
  '* * * * *',
  $$SELECT public.recompute_duplicate_groups(20000);$$
);