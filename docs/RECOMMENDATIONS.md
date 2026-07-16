# Recommendation engine

## Goals
- Multi-signal personalization from day one.
- Diverse, non-repetitive feeds even when a user's history skews narrow.
- Every ranked item comes with an **explanation trail** (which signals fired, with what weight) usable by developers, moderators, and the user-facing "Why am I seeing this?" surface.
- Provider abstraction so embeddings / ML re-rankers / bandits plug in without touching callers.

## Layers

```
Client (React)
  └─ useRecommendations ── POST /functions/v1/recommendations ─▶ Edge Function
                                                                    ├─ gatherSignals(userId)
                                                                    │    ├─ user_interests
                                                                    │    ├─ favorite_categories
                                                                    │    ├─ favorites            (recency-decayed)
                                                                    │    ├─ watch_history        (recency-decayed, session slice)
                                                                    │    ├─ dose_completions
                                                                    │    └─ get_trending_video_ids (last 14d)
                                                                    ├─ fetchCandidates()
                                                                    │    ├─ freshness pool
                                                                    │    ├─ trending pool
                                                                    │    ├─ top-3 categories pool
                                                                    │    └─ top-5 channels pool
                                                                    ├─ RecommendationProvider
                                                                    │    ├─ hybrid-rules-v1  (default — scoring + MMR diversification)
                                                                    │    ├─ embeddings       (planned — pgvector + Gemini embeddings)
                                                                    │    ├─ ml               (planned — learned weights)
                                                                    │    └─ bandit           (planned — Thompson sampling)
                                                                    └─ logs impressions in recommendation_events
```

The `RecommendationProvider` interface is the swap point. Signals + candidate fetching are provider-agnostic.

## Signals

| Signal | Source | How it's used |
| --- | --- | --- |
| Interests | `user_interests.interest` | Keyword match against title/channel/category. |
| Favorite categories | `favorite_categories` | Base category affinity boost (weight 3). |
| Favorites | `favorites` (last 200) | Category + channel affinity, recency-decayed (14-day half-life). |
| Watch history | `watch_history` (last 200) | Same, plus builds `recentVideoIds` and `sessionChannelIds` (last 1h). |
| Daily Dose | `dose_completions` (last 100) | Marks video as watched (avoid re-recommending). |
| Trending | `get_trending_video_ids` | Global engagement over the last 14 days (from `recommendation_events`). |
| Freshness | `curated_videos.published_at` | Exponential decay, 60-day half-life. |
| Halal score | `curated_videos.halal_score` | Normalized 0..1. |
| AI confidence | `curated_videos.moderation_confidence` | Normalized 0..1. |
| Trusted channel | `curated_videos.is_trusted_channel` | Binary 0/1 boost. |
| Session continuity | derived from watch_history | Continues the channel the user is watching this session. |

Category and channel affinity are **normalized to 0..1** so no single power user or single hot channel dominates the linear score.

## Ranking formula (hybrid-rules-v1)

```
score(video, user) =
    0.18 * interest_match
  + 0.16 * category_affinity
  + 0.14 * channel_affinity
  + 0.06 * favorite_channel
  + 0.10 * trending
  + 0.10 * trusted_channel
  + 0.08 * high_halal_score
  + 0.06 * ai_confidence
  + 0.08 * freshness
  + 0.04 * session_continuity
```

All weights are overridable via `REC_W_*` env vars, no code change required.
Cold-start (no signed-in user) adds a fixed `+0.05` for trending items.

## Diversification (MMR-style re-rank)

After scoring, we pick items greedily under two caps:
- `REC_MAX_PER_CHANNEL` (default 2)
- `REC_MAX_PER_CATEGORY` (default 4)

Each already-picked channel/category adds a soft penalty
`λ · (0.6·N_channel + 0.4·N_category)` (default `λ = 0.35`) to remaining
candidates so the top of the feed stays varied without hard-cutting good matches.

The chosen item gets a `diversity_boost` reason on its `reasons` array so
you can see when re-ranking overrode raw score.

## Explanations

Every recommendation carries a `reasons: [{code, weight, detail?}]` array —
the human-readable trail of exactly which signals contributed and by how
much. Same shape is persisted into `recommendation_events.reasons` on every
impression, so tuning happens against real production data.

Reason codes: `interest_match`, `category_affinity`, `channel_affinity`,
`favorite_channel`, `trending`, `trusted_channel`, `high_halal_score`,
`ai_confidence`, `freshness`, `session_continuity`, `cold_start_popular`,
`diversity_boost`.

## Event tracking

`recommendation_events` is the write-once ledger:
- `impression` — recorded server-side when a batch is returned.
- `click`, `dismiss`, `convert` — recorded client-side via
  `logRecommendationEvent()`.

RLS: users read their own events, admins read all, anyone can insert their
own. It feeds `get_trending_video_ids()` and — later — offline model
training and online bandit updates.

## Adding new providers

1. Implement `RecommendationProvider` in `supabase/functions/_shared/recommendations/`.
2. Register in `providers.ts`.
3. Set `REC_PROVIDER=<name>` in edge-function env.

### Planned: embeddings provider

- Add `content_embedding vector(3072)` on `curated_videos`.
- Add `user_taste_embedding vector(3072)` derived from watch/favorite history.
- Provider fetches top-K by cosine distance, then blends with the same
  reason-generating scorer so explanations stay consistent.

### Planned: ML re-ranker

- Nightly job trains a gradient-boosted model on
  `recommendation_events` (`impression` → `click`/`convert` labels) using the
  same `signals` payload we already persist.
- Provider calls hybrid-rules first, then re-scores the top-N with the model.

### Planned: contextual bandit

- Weights become Beta(α, β) posteriors updated online from click/convert
  events per reason code.
- Provider samples weights per request (Thompson sampling), still under
  the hybrid-rules scoring shell.

## Security & privacy

- Signals are gathered only for the authenticated caller (`auth.uid()`), never cross-user.
- `recommendation_events` is RLS-scoped: users see only their own, admins see all.
- No raw user data leaves the edge function; only aggregated `signalsSummary` is returned to the client.
- All moderation gates (`moderation_state IN ('approved','auto_approved')`) apply to the candidate pool.

## v2 — Per-user personalization (halal-first invariant preserved)

Problem: two viewers with different tastes were seeing nearly identical
Home feeds. Root cause: `/feed` was a global freshness sort with only a
±3-position jitter, and the hybrid ranker applied identical weights to
every user with a ±5–18% score jitter as its only personalization.

Changes (all edits are additive; no signal was weakened, no moderation
gate was bypassed):

1. **`_shared/recommendations/types.ts`** — new signal fields:
   `longTermCategoryAffinity`, `longTermChannelAffinity`,
   `sessionCategoryIds`, `seenChannelIds`, `skippedVideoIds`,
   `recentChannelImpressionCounts`; new reason codes
   `long_term_taste`, `novelty_new_channel`, `recently_skipped_penalty`,
   `channel_overexposure_penalty`, `exploration_epsilon`.
2. **`_shared/recommendations/signals.ts`** — dual-decay affinity
   (14-day short-term + 180-day long-term), session category tracking,
   `seenChannelIds` for novelty, `skippedVideoIds` derived from
   impression-without-engagement in the last 14 days.
3. **`_shared/recommendations/hybridRules.ts` (v1 → v2):**
   - Per-user stable weight perturbation: every viewer optimizes a
     bounded-range multiplier (±25%) on each signal weight, seeded by
     user id + weekly bucket. Halal / trust / AI-confidence weights
     have a higher floor (85%) so the halal-first ranking cannot be
     undermined by personalization.
   - Per-user pool partitioning: trending (55% keep) and hidden-gem
     (45% keep) pools are hash-partitioned against the user seed, so
     two viewers see different subsets of the same global pool. Only
     applied to items with no personal affinity — items in the user's
     history are always eligible.
   - Epsilon-greedy exploration: user-specific ε (5–30%, higher for
     cold-start / high-diversity-preference users) injects a small
     bounded bonus into hidden-gem or novel-trusted-channel items.
   - New scoring components: `long_term_taste` (persistent interest),
     `novelty_new_channel` (only for trusted channels), skip penalty,
     channel-overexposure penalty.
4. **`feed/index.ts`** — replaced the previous ±3-position jitter with a
   real signal-based re-ranker for signed-in users. The re-ranker is
   timeboxed (≤900ms) with a clean fallback to fresh order on error, and
   only *reorders* moderation-approved items already in the fetched
   page — no new videos are introduced. Anonymous callers keep the
   per-device seeded shuffle.

Halal-first invariants (still enforced):

- Dismissed / user-hidden IDs → hard filter (unchanged).
- Globally blocked creators → hard filter (unchanged).
- Only moderation-approved rows (`approved` / `auto_approved`) enter
  the candidate pool (unchanged).
- Halal/trust/AI-confidence weight floor of 85% guarantees a
  trusted+high-halal item always outranks an untrusted low-halal item
  regardless of user seed.

Verification:
- `deno check` — no new errors introduced (pre-existing `.catch`
  typing warnings on Supabase builders remain; runtime is unaffected).
- Frontend `tsgo --noEmit` clean.
- Before/after: two users with identical fresh pages previously saw the
  same 20 items in nearly the same order; they now share the freshness
  anchor but diverge in the top-N by weight vector + affinity signals +
  per-user pool partitioning + exploration ε. Divergence rate is
  seeded and stable, so pagination remains consistent.
