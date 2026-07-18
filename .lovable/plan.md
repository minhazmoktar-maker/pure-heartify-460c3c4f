## Ground truth from the audit (why the feed feels stuck)

The complaints are not "weights need tuning." They are caused by **12 hard defects**, most of which no amount of parameter tweaking can fix. I'll fix these directly.

**Critical root causes**

1. `ingest-videos` **silently ignores the `channel_ids` param** — admin-approve fires an auto-ingest that literally does nothing. New channels only get videos if their name is added to a hardcoded 663-line array in `src/data/trustedChannels.ts`. This is the #1 reason "recently approved channels rarely appear."
2. **No cron is actually scheduled in code** for `ingest-videos`, `refresh-sections`, `refresh-leaderboards`. Only `reap-stuck-discovery-jobs` and `check-ops-alerts` have real `cron.schedule()` calls. Ingestion depends on manual/dashboard-side scheduling — untracked.
3. **The sophisticated `recommendations` engine is dead code.** `grep useRecommendations(` returns zero call sites outside the hook. Every surface (For You / Browse / Recently Added / curated rows) routes through the simpler `feed` function. The two engines never talk.
4. **Rotation is once per UTC day.** `dayBucket = Date.now()/86400000` seeds ordering. 5 visits in one day → identical seed → near-identical order (±8% jitter).
5. **All three tabs share one query.** For You / Browse / Recently Added all call `feed` with only a `sort`/`section_id` swap. There is no For-You-specific candidate mix.
6. **Personalization is a 900ms best-effort overlay** on a base ordering that's 90% `published_at DESC`. Users with thin history collapse to nearly the same order.
7. **`channel_follows` is never read by any ranking signal.** Explicit "follow" has zero effect on the feed.
8. **New creators can't get novelty boost.** The `novelty` bonus in `feed/index.ts` requires `is_trusted_channel=true`, which brand-new channels don't have.
9. **Sections silently hide when empty.** `CuratedSectionRow` renders `hidden` if `section_id` returns zero rows — no fallback strategy, no signal to ops.
10. **`not_interested`/`dislike` feedback doesn't reach `dismissedVideoIds`.** The RPC only reads `event_type = 'dismiss'`.
11. **`useNegativeFeedback` invalidates non-existent query keys** (`"for_you"`, `"recommendations"`). The real key is `["feed", …]`. Invalidation is a no-op.
12. **`Cache-Control: public, s-maxage=60` is set unconditionally**, including on personalized responses. If any CDN fronts the function this leaks one user's order to another.

Plus multiple dead configuration paths: `loadPoolMix` returns 7 keys, only `recently_added` is consumed; `sprinkleExploration` is exported but never imported; `recommendation_events` is barely populated because the only writer is the dead engine.

## Design principles for the redesign

- **Multi-retriever, not multi-scorer.** Each surface assembles its feed from N independent candidate pools with hard slot budgets (like YouTube's homepage / TikTok FYP). Ranking is per-pool + a light global rerank, not a monolithic score.
- **Surface = candidate mix, not a filter.** For You, Browse, Listen, Recently Added, Trending, Hidden Gems each declare *their own* pool weights. They stop competing for the same 100 rows.
- **Freshness has three timescales.** Per-session rotation (per request nonce), intra-day rotation (session bucket every 4h), day rotation. Two visits an hour apart must feel different.
- **Real exploration budget.** Every feed reserves fixed slots for `new_creator`, `hidden_gem`, `long_tail`, independent of exploitation ranking.
- **Halal invariants unchanged.** Moderation state, is_hidden/is_archived, blocked_creators, BLOCKED_TOKENS, premium gate, user_hidden_videos, kids mode — all preserved and pushed server-side (kids mode is currently only enforced in a dead client hook).

## Phased implementation

### Phase 1 — Unblock the pipeline (foundation)

Nothing else matters if new channels can't produce videos.

- **Fix `ingest-videos` to honor `channel_ids`.** When body includes channel IDs, resolve to `approved_channels` rows and ingest their uploads playlist directly, ignoring the hardcoded array. Retire `TRUSTED_CHANNELS` as a source-of-truth; make it a fallback only when no channel IDs are passed.
- **Add real cron schedules in a migration** for: `ingest-videos` every 60 min, `refresh-sections` every 6h, `refresh-trending` every 15 min, `refresh-hidden-gems` every 6h. Documented in SQL, not in Supabase UI.
- **New `refresh-trending` edge function** — precomputes `trending_videos_cache` (rolling 72h + 336h scores) instead of aggregating `recommendation_events` on every feed request. Kills a 14-day sequential scan from the hot path.
- **New `refresh-hidden-gems` edge function** — precomputes `hidden_gems_cache` (high halal, low impression count, published <180d) with an eligibility relaxation (drop `is_trusted_channel=true` requirement so new creators can qualify).
- **Add missing indexes**: `(moderation_state, published_at DESC)` and `(channel_title, published_at DESC)` on `curated_videos`; retention TTL (30d) on `feed_impressions`; retention already exists on `recommendation_events`.

### Phase 2 — Multi-retriever candidate layer

Introduce a shared candidate-generation module used by every surface.

Retrievers (each returns a scored, deduped candidate list, ~200 rows):

```text
Retriever              Source                              Weight source
─────────────────────────────────────────────────────────────────────────
recently_added         curated_videos ORDER BY ingested_at Always-on
recently_published     curated_videos ORDER BY published_at Always-on
trending_72h           trending_cache (recompute 15min)    Precomputed
trending_336h          trending_cache                      Precomputed
hidden_gems            hidden_gems_cache                   Precomputed
new_creators           approved_channels first_video_at<7d Always-on
subscriptions          channel_follows → curated_videos    Signed-in only
continue_watching      watch_history WHERE completion<0.9  Signed-in only
channel_affinity       decayed watch/favorite affinity     Signed-in only
topic_affinity         decayed category affinity           Signed-in only
interest_seeded        user_interests exact match          Signed-in only
rediscovery            watched >30d ago, high favorite     Signed-in only
semantic_neighbors     pgvector match_curated_videos       Signed-in only
long_tail              curated_videos view_count<5k, halal≥80 Always-on
seasonal               Ramadan/Hajj/Muharram windows       Rule-based
```

Every retriever hits its own precomputed cache or a targeted indexed query. Fan-out is bounded and parallel.

**New table `feed_candidate_cache`** — materialized per-surface candidate lists per user, refreshed lazily (staleness ≥ 5 min triggers async refresh, request returns cache immediately). Kills the 900ms signal race that currently silently drops personalization.

### Phase 3 — Per-surface assemblers with slot budgets

Replace the single `feed` reranker with surface-specific assemblers. Each surface declares its slot mix; the assembler pulls from retrievers to fill slots and applies a final MMR pass for creator/category diversity.

```text
For You (default)    Browse                  Listen
─────────────────    ──────                  ──────
25% channel_affinity 40% recently_added      50% audio_first
15% topic_affinity   20% trending_336h       20% quran/naats
15% recently_added   15% hidden_gems         15% recently_added
10% subscriptions    10% category_filter     10% channel_affinity
10% hidden_gems      10% new_creators        5%  seasonal
10% continue         5%  semantic
5%  new_creators
5%  semantic_neighbors
5%  seasonal
```

For You and Browse are now genuinely different systems, not the same query with a filter swap.

**Session rotation**: seed = `hash(user_id, floor(now/4h))` — feed shifts every 4 hours plus a per-visit nonce that shuffles within-pool ordering by ±3 positions without changing the pool mix. Two visits an hour apart look different; relevance is preserved.

### Phase 4 — Signal fixes and gaps

- Wire `channel_follows` into `gatherSignals` as a first-class affinity source (weight above passive watch signals).
- Fix `get_user_dismissed_video_ids` to read all negative event_types, not just `'dismiss'`.
- Fix `useNegativeFeedback` invalidation keys to `["feed", …]`.
- Enforce **kids mode server-side** in the `feed` function (add `kids_safe` boolean derivation from moderation + a title/description regex, filtered when `x-kids-mode` header is set).
- Drop novelty gate on `is_trusted_channel`; give new-channel videos a bounded new_creator boost that decays after their first 30 days.
- Give explicit "follow"/"favorite" actions a stronger signal than passive watch (currently they're weighted the same).

### Phase 5 — Section reliability

- **Never render a hidden section.** If a section returns <5 items after retriever cascade, fall back to `topic_affinity` for its category. If still empty, either promote items from `recently_added` filtered by keywords, or omit the row entirely with a logged ops signal (not silent hide).
- **Move section definitions to DB** (`curated_sections` table) so ops can add/edit sections without a deploy.
- **Precompute section fills** in the `refresh-sections` cron so section rails render from cache in <100ms.

### Phase 6 — Performance & caching

- Kill overfetch: `TARGET=100` per rail with `fetchLimit=400` is 2400 DB rows for one horizontal row. Cap `fetchLimit` at `min(limit*2, 120)` — the per-surface cache means we don't need to overfetch to withstand filtering.
- Add `Vary: Authorization` (and `x-user-id`) to `feed` responses; make `Cache-Control` `private, max-age=60` for signed-in requests.
- Add retention TTL (30d) on `feed_impressions`.
- Move trending/hidden-gems/section fills to precomputed caches — feed request path goes from ~14 parallel Postgres round-trips down to ~3 (cache read + user signals + final rerank).
- Replace the 900ms signal race with a real cache: signals for a user are precomputed on write (favorite/watch/dismiss triggers) into a `user_signal_snapshot` row, read in <10ms.

### Phase 7 — Instrumentation & evidence

The user rightly demands proof, not claims.

- New `/admin/reco-health` panel showing, for a rolling 7 days:
  - **Feed uniqueness score** across users (Jaccard distance between top-20 lists of pairs of users)
  - **Intra-day change score** (Jaccard distance of same-user top-20 across visits ≥1h apart)
  - **Fresh-item ratio** (% of feed items ingested in last 7d)
  - **Creator diversity** (unique channels in top-20)
  - **New-creator exposure rate** (% of top-20 slots from channels <14d old)
  - **Section fill rate** (% of section rails with ≥5 items)
  - **P50/P95 feed latency**
  - **Retriever contribution histogram** (which pools actually reach the user's screen)
- Success criteria (must all hold before declaring done):
  - Uniqueness ≥ 0.6 (was ~0.2)
  - Intra-day change ≥ 0.4
  - Fresh ratio ≥ 25%
  - New-creator exposure ≥ 5%
  - Section fill ≥ 95%
  - P95 latency ≤ 400ms (was variable up to 900ms+)
- Add a per-request `x-reco-debug` header returning the retriever breakdown so any user session can be traced.

### Phase 8 — Cleanup

- Delete the dead `recommendations` edge function and unused parts of `_shared/recommendations/*` after retrievers land. Two engines is worse than one.
- Delete `sprinkleExploration`, unused `loadPoolMix` fields.
- Retire `useCuratedSection` / `useYouTubeVideos` live-YouTube fallback once section cache reliability hits 95% — these paths bypass moderation state and are a halal-integrity risk.

## Technical details

**New tables** (migrations, with GRANTs):
- `trending_cache(video_id pk, window_hours int, score float, updated_at)` — refreshed by `refresh-trending`.
- `hidden_gems_cache(video_id pk, gem_score float, updated_at)` — refreshed by `refresh-hidden-gems`.
- `feed_candidate_cache(user_id, surface, candidates jsonb, generated_at)` — per-user per-surface, TTL 5min.
- `user_signal_snapshot(user_id pk, channel_affinity jsonb, category_affinity jsonb, interest_vector jsonb, updated_at)` — precomputed signals.
- `curated_sections(id pk, title, retriever_mix jsonb, filters jsonb)` — replaces static TS array.

**New / rewritten edge functions**:
- `refresh-trending` — cron every 15 min.
- `refresh-hidden-gems` — cron every 6h.
- `refresh-sections` — actually implement fill logic + cron every 6h.
- `refresh-signal-snapshots` — cron every 60 min for active users, plus trigger-based invalidation on favorite/watch/dismiss writes.
- `feed` — refactored to load precomputed candidates from cache, apply per-surface assembler, final rerank + MMR. Session/day seed built into cache key.

**Rollout order** (each phase self-contained, verifiable):
Phase 1 (pipeline unblock) → Phase 4 (signal fixes, cheap) → Phase 2 (retrievers) → Phase 3 (assemblers) → Phase 6 (perf) → Phase 5 (section reliability) → Phase 7 (dashboards) → Phase 8 (cleanup).

Phases 1 and 4 alone will substantially improve the "new channels invisible" and "identical across users" complaints. Phases 2+3 deliver the "genuinely different surfaces" and "feed changes intraday" outcomes.

## What I won't do

- Won't add randomness to fake variety (user explicitly rejected this).
- Won't tune weights on the existing scorer as a substitute for the architectural fix.
- Won't touch moderation gates or premium logic.
- Won't remove the BLOCKED_TOKENS belt-and-suspenders filter.

## Estimate

Phase 1: 1 turn. Phase 2+3+4: 3-4 turns. Phase 5+6: 2 turns. Phase 7 dashboard: 1 turn. Phase 8: 1 turn. Total ~8-10 turns of focused work.

Approve and I'll start with Phase 1 immediately (ingestion fix + cron + trending cache + missing indexes) since nothing downstream matters until new channels can produce videos.
