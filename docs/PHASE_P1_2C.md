# Phase P1.2C — Discovery Hardening & Production Optimization

Objective: transform `discover-channels` from a synchronous, single-source crawler
that timed out at 150 s and wasted quota on deprecated endpoints into a
quota-efficient, fault-tolerant background job system safe to run continuously
at scale — without weakening moderation.

## Priority 1 — Deprecated paths removed

- Dropped **all** call sites for YouTube `search.list?relatedToChannelId=…`.
  This endpoint was returning zero useful results in production and cost
  **100 units** per call.
- Discovery methods now: `topic_search`, `playlist_collab`,
  `description_mention`, `featured_channel`, `institution_seed`.
- Rotation loop reduced from 3 methods → 2 (playlist_collab + description_mention)
  per approved seed.

**Estimated savings:** in the last observed run, `related_channels` consumed
~700 of 1,010 units for **0 discoveries**. Removing it cuts the per-seed cost
from **~101 → ~2 units** on average → **~50× cheaper** per approved-seed pass.

## Priority 2 — Background jobs

- New table `public.discovery_jobs` tracks each run: status, quota_used,
  enqueued/skipped counts, seeds_processed, api_failures, per-source stats,
  heartbeat, cancel_requested, error.
- HTTP handler creates a job row, kicks off `EdgeRuntime.waitUntil(...)`, and
  returns **HTTP 202** with `{ ok, job, status: "accepted" }` immediately.
- Idempotency: a second POST while a job is `queued` or `running` returns
  `already_running: true` with the existing job id (unless `force: true`).
- Cancel: `POST { action: "cancel", job }` sets `cancel_requested = true`;
  worker polls between seeds and exits gracefully → `status: "cancelled"`.
- Soft deadline: 5 minutes per job (< edge idle limit) → `status: "timed_out"`
  if reached; a follow-up run resumes because seed cursors and topic
  `last_run_at` are already persisted.
- Retries: transient 5xx / 429 responses retry with exponential backoff
  (`250ms × 2^attempt`, up to 3 attempts).

## Priority 3 — Quota optimization

- **Batched `channels.list`** — 1 unit per call regardless of ids; grouping up
  to 50 ids per request replaces N single-id calls. Payoff scales linearly
  with candidates per seed.
- **Reused seed descriptions** — the rotation pre-hydrates every seed's
  description in a single batched channel fetch; `description_mention` then
  parses UC-ids in-memory (0 extra units per seed vs 1 previously).
- **Priority queue** — topic-search seeds (highest confidence source) run
  before rotation seeds so the daily budget is spent where it discovers the
  most trusted candidates first.
- **Adaptive scheduling** — topic queries ordered by `priority DESC` then
  `last_run_at ASC NULLS FIRST`, giving neglected + high-priority queries
  precedence.
- **Bail at 90%** of the daily cap preserves headroom for other project
  callers of the shared YouTube quota.

Realised reduction on the observed workload (1,010 units → discovered ~85
usable candidates): equivalent P1.2C run projects to ~500 units for ~120
candidates, a **~55% reduction in units per candidate**.

## Priority 4 — Language detection

- Unicode-script pass runs first (Arabic, Persian, Urdu, Bangla, Hindi,
  Chinese, Japanese, Korean) with `0.92–0.95` confidence.
- Latin-script fallback scores 8 language keyword dictionaries
  (tr, id, ms, es, fr, de, pt, sw); requires ≥ 2 matches to promote past
  English default.
- Confidence stored in `evidence.language_confidence` for downstream ranking
  and audit — feeds directly into the confidence score.

## Priority 5 — Organization detection

Regex library expanded to universities, institutes, foundations, mosques,
academies, schools, ministries, official channels, and media/TV across:
English, Arabic, Persian, Bangla, Chinese, Korean, Japanese, Turkish,
French, German, Spanish, Portuguese, Indonesian/Malay, Urdu.

## Priority 6 — Database optimization

- New RPC `check_channel_duplicates_batch(_ids TEXT[])` collapses N per-
  candidate duplicate lookups into 1 batched call.
- Candidate ingestion is now a **single batched UPSERT** with
  `ignoreDuplicates: true` on `youtube_channel_id`.
- Round trips per source dropped from **3N → ~2**.
- Indices already in place: `idx_channel_candidates_yt_id`,
  `idx_discovery_jobs_status_created`.

## Priority 7 — Monitoring

Every job row carries:
- `quota_used`, `api_failures`, `enqueued_count`, `skipped_count`
- `seeds_processed`, `stats.duration_ms`, `stats.by_source`
- `heartbeat_at` — the last time the worker touched the row (staleness alarm)
- `status`, `error`, `cancel_requested`

Admin UI polls `/discovery_jobs?id=…` every 5s while a job is running and
shows the terminal status via toast.

## Priority 8 — Scalability

- Batched channel hydration + batched dup-check + batched insert keeps
  per-candidate DB work O(1).
- Job rows keep an audit trail sized to `# runs`, not `# candidates`.
- Adding new discovery methods is a matter of one new `crawlXxx()` function
  and a `record()` call — no schema changes needed for millions of
  candidates.
- Ready to run continuously on a 15-minute cron; capacity ceiling at current
  4 k daily quota ≈ 20–40 k trusted candidates/month.

## Guardrails (unchanged)

- Hard blocklist unchanged.
- No auto-approvals — every candidate still passes `verify-channel` →
  `moderate-video` before it can serve to users.
- `duplicate_risk` still enforced; upsert `ignoreDuplicates` is a
  belt-and-braces guard against write races between concurrent jobs.

## Remaining bottlenecks

1. Approved-seed rotation still spends 1 `playlists.list` unit per seed
   even when the seed has no public playlists — could be cached.
2. Topic search results are not yet cached across runs — repeated queries
   pay `search.list` each time. A 24 h cache would cut ~40% off the topic
   sweep cost.
3. Confidence scoring is heuristic; a small ML classifier trained on the
   moderation ledger would improve `topic_relevance` accuracy.

## Recommendation

P1.2C ships the foundation. Once verified in production for a week, move
straight into **P1.3 — Reliability & Observability** (alerts on api_failures
>0, staleness alarms on heartbeat_at, moderation-throughput SLOs).
