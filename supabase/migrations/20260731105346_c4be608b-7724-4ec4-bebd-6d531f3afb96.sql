CREATE OR REPLACE FUNCTION public.get_trust_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'approved_channels', (SELECT COUNT(*) FROM public.approved_channels),
    'reviewed_videos',   (SELECT COUNT(*) FROM public.curated_videos),
    'removed_videos',    (SELECT COUNT(*) FROM public.removed_videos),
    'languages_covered', (
      SELECT COUNT(DISTINCT lower(content_language))
      FROM public.curated_videos
      WHERE content_language IS NOT NULL AND content_language <> ''
    ),
    'surfaced_videos', (
      SELECT COUNT(*) FROM public.curated_videos
      WHERE moderation_state IN ('approved', 'auto_approved')
    ),
    'attested_videos', (
      SELECT COUNT(*) FROM public.curated_videos v
      JOIN public.attestations a
        ON a.video_id = v.video_id AND a.superseded_at IS NULL AND a.revoked_at IS NULL
      WHERE v.moderation_state IN ('approved', 'auto_approved')
    ),
    'ledger_records', (SELECT COUNT(*) FROM public.attestations),
    'ledger_chain_head', (SELECT chain_digest FROM public.attestations ORDER BY seq DESC LIMIT 1),
    'generated_at',      to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  )
$function$;