## Redesign — Independent Surface Assembly Pipeline

### The problem (evidence)

Today all 34 curated rails, Recently Added, and Hidden-Gems/Trending signals read from **one function (`feed`) → one RPC (`get_feed_candidates_diversified`) → one table (`curated_videos`)**. Section aliasing collapses many rails onto identical category sets (`feed/index.ts:133-160`); cross-section dedup is a client-side first-come-first-served hack (`CuratedSectionRow.tsx:71-100`). Of the 11 target surfaces, only Recently Added exists; For You, Listen, Trending, Continue Watching, Hidden Gems, New Channels, Because You Watched, Popular This Week are absent or backend-only.

### What we're building

One dedicated **retriever** per surface. Each retriever owns its candidate query, its ranker, and its diversity contract. No shared candidate pool. Shared components are only utility (impression penalty, blocklist, MMR helper).

### Surface contracts

| Surface | Pool source | Ranker | Freshness window | Guarantees |
|---|---|---|---|---|
| For You | Personalization pool: user interests × affinity channels × language | Impression-penalized affinity + semantic KNN | 90d, mixed with all-time | ≥12 videos, ≤2/channel, ≤35% top language, ≥4 categories, ≥30% <14d |
| Browse | Category-diverse spread across all approved categories | Round-robin categories × trust weight | any | ≥16 videos, ≤1/channel, ≥8 categories, ≥3 languages |
| Listen | Audio-first: `category ∈ {Quran, Adhan, Nasheed, Lectures}` + audio_sources join | Reciter/lecturer diversity | any | ≥12 videos, ≤1/reciter, ≥4 reciters, ≥3 languages |
| Recently Added | `ingested_at ≥ now()-24h`, then rolling 7d fallback | Time DESC + trust weight | 24h → 7d | ≥8 videos, ≤1/channel, ≥5 channels |
| Trending | 7-day window ranked by view velocity × recommendation clicks | z-scored velocity | 7d | ≥12 videos, ≤2/channel, ≥6 channels, ≥3 categories |
| Continue Watching | `watch_history` where `progress ∈ (0.05, 0.9)` in last 30d | Recency DESC | 30d | Signed-in only; ≥1 to render, cap 12 |
| Hidden Gems | `view_count < P25 AND halal_score ≥ 90 AND published_at ≥ 180d` | Trust × freshness | 180d | ≥8 videos, ≤1/channel, ≥6 channels, ≥4 categories |
| New Channels | Channels with first approved video in last 30d | Channel novelty × video trust | 30d | ≥6 channels, 1 video per channel |
| New Videos | `published_at ≥ 7d` (distinct from ingested_at) | Publish-date DESC | 7d | ≥10 videos, ≤2/channel, ≥5 channels |
| Because You Watched | Semantic KNN off last 3 completed videos, filter out already-seen | Cosine similarity × trust | any | Signed-in only; ≥8, ≤1/channel, exclude source channels |
| Popular This Week | Top view-count deltas in 7d, min view floor | View-delta rank | 7d | ≥12 videos, ≤2/channel, ≥6 channels |

Every retriever runs its own SQL. No retriever calls another. `feed_impressions` penalty and blocklist apply universally as a post-filter.

### Architecture

```text
Client rail ──► useSurface("<name>")
                    │
                    ▼
   supabase.functions.invoke("surface-<name>")
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  supabase/functions/surface-<name>/     │
  │  1. Fetch candidates (own SQL/RPC)      │
  │  2. Apply universal filters             │
  │     (blocklist, impressions, blocks)    │
  │  3. Rank (own scorer)                   │
  │  4. Diversify (MMR + caps per contract) │
  │  5. Validate guarantees, fallback tier  │
  │  6. Log impressions + return            │
  └─────────────────────────────────────────┘
```

`supabase/functions/_shared/surfaces/` holds:
- `filters.ts` — blocklist, impression penalty, block-list, kids-mode
- `diversity.ts` — creator/language/topic/institution cap helpers + MMR
- `guarantees.ts` — validator that returns `{ok, missing[]}` per contract
- `logging.ts` — impression + retrieval telemetry

### Database work

New RPCs (independent pools):
- `pool_trending_7d(_limit, _lang, _exclude_ids)` — velocity ranking
- `pool_hidden_gems(_limit, _min_score, _exclude_ids)` — low-view + high-trust
- `pool_new_channels(_limit, _window_days)` — channels first-approved in window
- `pool_new_videos(_limit, _window_days)` — published_at not ingested_at
- `pool_because_you_watched(_user_id, _limit)` — pgvector KNN off completed embeddings
- `pool_popular_week(_limit, _lang)` — view-count delta ranking
- `pool_continue_watching(_user_id, _limit)` — from `watch_history`
- `pool_recently_added(_limit, _window_hours)` — dedicated, no aliasing

`get_feed_candidates_diversified` stays for Browse-style category rails. Add `institution_id` join through `approved_channels` where available for institution-diversity guarantee.

### Client work

- New hook `useSurface(name, opts)` per surface with React Query keys namespaced `["surface", name, session]`.
- Replace `Index.tsx` home rails with the 11 surface components: `<ForYouRail/>`, `<BrowseRail/>`, `<ListenRail/>`, `<RecentlyAddedRow/>` (refactor), `<TrendingRail/>`, `<ContinueWatchingRail/>`, `<HiddenGemsRail/>`, `<NewChannelsRail/>`, `<NewVideosRail/>`, `<BecauseYouWatchedRail/>`, `<PopularThisWeekRail/>`.
- Remove `FeedDiversityContext` cross-section seen set — diversity now guaranteed server-side per surface.
- Order on signed-in home: Continue Watching → For You → Recently Added → Because You Watched → Trending → Listen → New Videos → Popular This Week → Hidden Gems → New Channels → Browse.
- Signed-out home: Trending → Recently Added → Listen → New Videos → Hidden Gems → Popular This Week → Browse.

### Validation (evidence, not vibes)

Add `docs/SURFACE_VALIDATION_2026-07.md` and a `/admin/surface-health` panel. For every surface, run and record:

1. **Minimum videos** — `SELECT surface, min(item_count) FROM last_100_responses GROUP BY surface;` — must equal contract minimum.
2. **Creator diversity** — `SELECT surface, avg(distinct_channels::float/items::float) FROM ...` — must be ≥ target per contract.
3. **Topic diversity** — distinct-category ratio per response.
4. **Language diversity** — distinct-language ratio; top-language share ≤ cap.
5. **Institution diversity** — distinct `approved_channels.institution_id` per response.
6. **Freshness** — % rows with `published_at ≥ contract_window` and % <14d for time-sensitive surfaces.
7. **Novelty vs prior session** — pairwise Jaccard between consecutive responses for same user; target < 0.35 for For You / Trending / Because You Watched.
8. **Pool independence** — pairwise Jaccard *between surfaces* in a single home load; target < 0.15 (proves independent pools, not just re-sliced overlap).

Every metric is queried live from `recommendation_events` + response snapshots; results committed with before/after numbers. Surface fails to ship if any guarantee misses.

### Rollout

- Phase A: build `_shared/surfaces/*`, `pool_*` RPCs, and 4 highest-value surfaces (For You, Trending, Continue Watching, Because You Watched). Ship behind `feature_flags.surfaces_v2`.
- Phase B: remaining 7 surfaces + client refactor of `Index.tsx`; retire the 34-rail curated grid on home (keep as `/browse` explorer).
- Phase C: enable flag for 10% → 100%; delete legacy `SECTION_CATEGORY_ALIASES` and `refresh-sections` pruning once traffic is off.

### Technical details

- Retriever contract: `type Retriever = (ctx: SurfaceCtx) => Promise<{items: Video[], meta: {source, took_ms, guarantees}}>`.
- Universal filters run *after* candidate fetch, *before* rank: `applyBlocklist → applyImpressionPenalty → applyUserBlocks → applyKidsMode`.
- Diversity contract enforced via `enforceContract(items, contract)`: greedy MMR that drops items violating channel/language/topic/institution caps until guarantee met or pool exhausted; then triggers tier-2 fallback (broaden window) then tier-3 (drop language filter). Never returns fewer than `minimum` unless pool is truly empty — in which case the surface is hidden, not shown empty.
- Cache keys per surface include `user_id` (or `session_id` for anon) so novelty differs per user; anon TTL 60s, signed-in 30s.
- All new RPCs `SECURITY DEFINER` with `search_path=public`, granted to `authenticated, anon` where surface allows anon.
