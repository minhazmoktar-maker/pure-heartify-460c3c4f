# Architecture Audit — 2026-08-10

Evidence-based. Every finding below was proven with a query or a file read, not inferred.

## Verdict
The architecture is sound and should **not** be rebuilt. It is a modular monolith (React client + Supabase Postgres + edge functions + pg_cron workers) which is the correct shape for this stage. The real problem was not architecture — it was **broken autonomy**: three critical background loops had no schedule at all, so the corpus silently stopped growing in channel diversity on 19 July 2026.

## P0 / P1 findings

### 1. Channel discovery was dead for 22 days (P1 — fixed today)
- `channel_candidates`: 0 rows created in the previous 7 days; newest row 2026-07-19 22:05.
- `approved_channels`: newest row 2026-07-18.
- `discovery_topic_queries`: 18 of 5,746 queries had ever run (0.3%).
- Root cause: `discover-channels` and `batch-classify-candidates` were **only reachable from admin UI buttons**. No cron job existed for either.
- Consequence: 406k videos concentrated in **310 channels** — this, not the ranker, is why different users see similar feeds.
- Fix: hourly `discover-channels-hourly`, 20-minute `classify-candidates-20min` with `dry_run:false`. Verified live: 48 new candidates within 30 minutes, 9 channels auto-approved in one classification batch.

### 2. 232,439 videos have no channel id (P1 — repair running)
- 228,741 of them sit in `pending_review` forever, invisible to feeds and to per-creator diversity caps.
- Root cause: `_run_channel_id_backfill` matched only on `lower(channel_title)` against the 198 `approved_channels` rows, completed that set, and stopped. The `channel-id-backfill-tick` cron has run every minute since with nothing left to do.
- Fix: new `backfill-video-channels` edge function resolves ids via YouTube `videos.list` (50 ids per call, **1 quota unit per 50 videos** — ~100× cheaper than search), enqueues unknown channels as candidates, then calls `promote_trusted_pending_videos()`. Verified: 244/300 rows resolved for 5 quota units. Scheduled every 30 minutes (~1,500 units/day, leaving headroom for ingestion).

### 3. Review backlog had no drain (P1 — fixed)
New `promote_trusted_pending_videos()` releases pending videos **only** when the channel is an active approved channel and the title/channel name pass `_inappropriate_pattern()` and `blocked_creators`. Confidence is capped at 85, matching the compliance-score policy.

### 4. Silent failure was possible (P2 — fixed)
Nothing alerted when a loop stopped. New `check_pipeline_watchdog()` (every 15 min) raises `production_alerts` for stalled discovery (>12h), stalled ingestion (>3h), candidate backlog (>750) and orphan videos (>50k).

### 5. Truthful reporting (P2 — fixed)
New admin-only `pipeline_health()` returns real corpus, channel, discovery and reliability counts in one call, so "how many videos?" is answered by the database.

## Known remaining risks
- **YouTube quota is the hard ceiling** on the 1,000,000-video and 1,000-channel goals. Two keys are configured; growth rate is quota-bound, not code-bound.
- **Visual moderation is partial**: thumbnail/frame signals exist as columns and heuristics; there is no full frame-sampling classifier. Metadata-only moderation must not be described as video-level proof.
- **228k pending videos** will only clear as their channels pass verification — expect days, not minutes.
- **11 registered users**: all retention/personalisation metrics are currently structural, not statistically meaningful.
- Security linter reports pre-existing warnings (security-definer functions, RLS-without-policy on internal tables) tracked separately in `docs/SECURITY.md`.

## Migration path (unchanged recommendation)
Stay on the modular monolith. Extract a standalone Node worker service only when ingestion exceeds what edge functions + pg_cron can schedule (signal: repeated soft-deadline truncation in `discovery_jobs.stats`). Keep every provider call server-side so the client stays portable.
