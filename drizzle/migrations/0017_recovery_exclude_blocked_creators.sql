CREATE OR REPLACE VIEW public.evidence_free_rejections AS
  SELECT v.video_id,
         v.channel_id,
         v.channel_title,
         v.content_language,
         v.moderation_reasoning,
         v.moderation_risk
  FROM public.curated_videos v
  WHERE v.moderation_state = 'rejected'
    AND v.visual_state <> 'flagged'
    AND COALESCE(v.moderation_risk, 0) < 50
    AND COALESCE(jsonb_array_length(v.moderation_signals -> 'rule_hits'), 0) = 0
    AND COALESCE(v.moderation_reasoning, '') !~* '(female|music|singing|song|woman|women|girl|microphone|dance|nudity|inappropriate|celebrity|purge)'
    AND v.moderation_reasoning ~* '(unsafe channel|channel blocked|blocked channel)'
    -- never resurface a creator that is on the block list (the halal-floor
    -- trigger would abort the whole batch anyway)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocked_creators b
      WHERE (b.match_mode = 'substring'
             AND lower(coalesce(v.channel_title,'') || ' ' || coalesce(v.title,'')) LIKE '%' || lower(b.pattern) || '%')
         OR (b.match_mode = 'channel_exact'
             AND lower(trim(coalesce(v.channel_title,''))) = lower(trim(b.pattern)))
    );