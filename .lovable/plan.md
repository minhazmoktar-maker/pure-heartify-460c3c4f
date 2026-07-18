# Recommendation Engine v3

Complete redesign of Heartify's recommendation system. Preserves all halal-first moderation, RLS, and existing APIs. Ships in verifiable phases against the current `feed` and `recommendations` edge functions and Home UI.

## Goals (measurable)

- Two users with different interests share <20% of top-50 feed items.
- Repeat-impression rate over 7 days <15%.
- Newly approved videos reach eligible users within 5 minutes.
- p95 personalized feed latency <200ms after warm cache.
- Zero regression to halal-first filters and RLS.

## Architecture

### 1. Multi-pool candidate generator (edge: `feed`)

Independent pools scored separately, then merged with configurable weights (read from `_internal_config` key `reco_pool_mix`):

```text
recently_added   20%   approved_at within last 30d, freshness decay
deep_personal    35%   long-term affinity × short-term intent
trending         15%   watch/save velocity over 24h/7d, per-topic
hidden_gems      10%   high completion rate, subs < 50k
continue         10%   next episode/part in a started series/playlist
rediscovery       5%   items watched >30d ago with high affinity
exploration       5%   epsilon-greedy on adjacent topics, unseen creators
```

Owner UI (`/admin/ops`) gets a mix slider that writes to `_internal_config`. Default lives in code; DB override wins.

### 2. Impression memory & decay (new table `feed_impressions`)

```text
user_id, video_id, first_seen_at, seen_count, last_action, last_action_at
```

- Every served video logs an impression (batched via `beforeunload` + on-scroll debounce).
- Penalty curve: seen 1→−0.05, 2→−0.15, 3→−0.35, 5→−0.65, ≥8→hard hide 48h.
- Positive interaction (watch ≥30s, save, share, follow, complete) resets `seen_count` to 0 and boosts creator/topic affinity.

Retention: 30 days rolling; nightly purge job.

### 3. Interest graph (new tables `user_topic_affinity`, `topic_taxonomy`)

Micro-topics replace broad categories. Seeded taxonomy (~200 topics across Islamic + secular educational verticals). Affinity update on every event:

```text
watch_full   +1.0
watch_50%    +0.4
save         +0.8
share        +0.6
follow       +1.2
skip <5s     −0.5
not_interested −2.0
hide creator  −3.0
```

Exponential decay with 21-day half-life. Short-term (session) affinity kept in-memory per request, blended 30/70 with long-term.

### 4. Diversity & MMR reranker

After scoring, apply Maximal Marginal Relevance:
- No two consecutive items from same creator.
- Max 2 per topic in any window of 10.
- Language rotation matches user's declared locales + one exploration slot.
- Format rotation (short/long, video/audio) every 5 items.

### 5. Freshness signal

`freshness_score = exp(-hours_since_approval / 72)` added to every candidate. Recently Added pool boosts this to `exp(-hours / 12)`. Newly approved videos are pushed into a Redis-like `hot_pool` via a DB trigger on `approved_channels` → `video_candidates.status='approved'`.

### 6. Per-user salt & jitter

Deterministic hash `(user_id, day_bucket)` mixed into score with amplitude 0.08. Guarantees unique ordering across users and daily rotation without random shuffle.

### 7. Learning continuity

Detect series via title regex (`Part \d+`, `Episode \d+`, `Lesson \d+`) + same-creator + upload order. Store in `video_series` view. When user completes item N, promote N+1 into `continue` pool with high priority.

### 8. Explainability

Every ranked item carries `reasons: { pool, freshness, affinity, diversity_bonus, exploration, confidence }` returned in the feed payload (unused by UI initially, consumed by owner analytics).

### 9. Owner analytics dashboard

New tab in `/admin/ops`:
- Feed uniqueness (Jaccard across sampled user pairs)
- Repeat impression rate
- Personalization score
- Diversity (creator/topic/language Gini)
- New content exposure rate
- p50/p95 latency
- Cold-start quality

Backed by SQL views over `feed_impressions` + `analytics_events`.

## Files

**New**
- `supabase/migrations/…_reco_v3.sql` — `feed_impressions`, `user_topic_affinity`, `topic_taxonomy`, `video_series`, `_internal_config` seed for `reco_pool_mix`, RLS + GRANTs, purge function, trigger for hot pool.
- `supabase/functions/_shared/reco/pools.ts` — pool generators.
- `supabase/functions/_shared/reco/rerank.ts` — MMR + diversity + jitter.
- `supabase/functions/_shared/reco/affinity.ts` — event → affinity updater.
- `supabase/functions/log-impressions/index.ts` — batched impression writes (auth: user JWT).
- `src/hooks/useImpressionTracker.ts` — IntersectionObserver + beforeunload flush.
- `src/pages/admin/RecoMetrics.tsx` — owner analytics view.

**Modified**
- `supabase/functions/feed/index.ts` — swap monolithic ranker for multi-pool merge, add impression penalty join.
- `supabase/functions/recommendations/index.ts` — align with new pipeline.
- `src/pages/Index.tsx`, `src/components/FeedGrid.tsx` — wire impression tracker.
- `src/pages/admin/Ops.tsx` — add pool-mix sliders + link to RecoMetrics.

## Rollout & verification

1. Migration + shared helpers.
2. Feed edge function switched behind `reco_v3` feature flag (default on for authenticated, sample 10% anon).
3. Impression tracker + logging.
4. Owner dashboard + sliders.
5. Verification pass:
   - Script two synthetic users with different interests, compare Jaccard on `feed` output.
   - Simulate 10 refreshes for one user, count unique items.
   - Approve a new video, poll `feed` until it appears (target <5 min).
   - Benchmark p95 latency via `curl_edge_functions` × 50.

## Non-goals for this phase

- No new mobile UI sections beyond wiring the impression tracker (existing rails already cover "Recently Added", "Continue", "Trending").
- No changes to moderation, RLS predicates, or halal filters.
- No Redis/external cache — Postgres materialized views + short-TTL in-memory cache in edge functions.

## Risk & mitigation

- **Latency**: keep hot candidate set to ≤500 rows per pool via indexed queries; precompute affinity aggregates nightly.
- **Impression write volume**: batch client-side, upsert with `ON CONFLICT` incrementing `seen_count`.
- **Cold start**: onboarding interests seed `user_topic_affinity`; unauthenticated users get country/language + trending + recently added only.
- **Regression**: keep old ranker path behind flag for 1 release; kill after metrics confirm.
