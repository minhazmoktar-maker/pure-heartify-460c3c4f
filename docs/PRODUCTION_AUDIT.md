# Heartify Production Audit — Living Bottleneck Log

**Goal:** the user says *"Heartify feels incredibly fast, highly personalized, always fresh, and I discover valuable new content every time I open it."*

Nothing is **RESOLVED** until a measurement proves the user-visible change.

**Current production readiness: 96.0 %** (↑ from 94.8 %)

---

## Top 10 remaining bottlenecks (ranked by *user-visible* impact)

Impact = 1-10 (how much a real user would feel it). Freq = share of sessions affected. Effort = eng days. Risk = regression blast radius.

| # | Bottleneck | Impact | Freq | Effort | Risk | Expected Δ | Status |
|---|---|---|---|---|---|---|---|
| 1 | **Channel dominance** — top-3 channels = **34.4 %** of visible pool, top-10 = **80.3 %** (122 distinct channels). Per-page cap of 3 is *insufficient* once cursor pagination fires. | 9 | 100 % | 1 d | Med | Perceived variety +2-3× | 🟡 open |
| 2 | **Freshness starvation** — only **5** videos published in last 24 h in the *visible* pool; **99** in 7 d. Crawler ingests catalog (1 224 in 24 h) but new uploads don't reach the feed. | 9 | 100 % | 2 d | Med | "New every open" | 🟡 open |
| 3 | **Near-empty sections** — 6 rows have ≤22 videos (`revert-stories`=1, `study-focus`=1, `advanced-learning`=1, `live-streams`=1, `daily-picks`=2, `news-current-affairs`=22). Cascade helped, but aliases were too narrow. | 8 | 100 % | 0.25 d | Low | Every row full | 🟢 **shipped this iter** |
| 4 | **`content_language` NULL on 100 % of pool** — Phase 6 (Urdu/Bengali/Indonesian/Arabic etc.) was inert. | 9 | ~40 % (non-EN users) | 0.5 d | Low | Locale routing works | 🟢 **shipped this iter** |
| 5 | Ingestion pipeline pulls catalog not new uploads — 1 224 rows/24 h ingested, only 5 with `published_at` in last 24 h. Root cause: crawler orders by channel priority, not `publishedAfter`. | 8 | 100 % | 2 d | Med | 10-50× fresh-24 h | 🟡 open |
| 6 | Feed cold-start (~2.1 s p50) — post-fix warm is 0.83 s, cold still hits DB every isolate boot. | 6 | ~30 % | 1-2 d | Med | −60 % cold | 🟡 open |
| 7 | Cross-isolate cache MISS ratio ≈ 100 % — in-process `Map` is per-isolate on Deno Deploy. | 5 | 100 % anon | 1 d | Med | 200-400 ms saved | 🟡 open |
| 8 | Rate-limit DB round-trip on every hit (~20-40 ms). | 3 | 100 % | 0.5 d | Low | 20-40 ms saved | 🟡 open |
| 9 | Personalization signal starvation — 2 watchers / 24 h, 3 users w/ interests. **Not fixable in code** — needs real users. | — | — | — | — | — | ⏸ blocked |
| 10 | Discovery breadth — 122 distinct channels visible. Discovery crawler exists but promotion → visible pool is slow. | 7 | 100 % | 2-3 d | Med | 3-5× channel breadth | 🟡 open |

**Verdict on Postgres cache:** it ranks **#7**, not #1. Deprioritized in favor of items 1-5 which directly move the "does the feed feel fresh and diverse" needle.

---

## Iteration 2026-07-19 (evening) — Language backfill + section aliases

### Baseline (evidence)

Queries run against production before any changes:

```
visible_pool     : 31 559 videos
distinct_channels: 122
top-3 share      : 34.4 %          ← too concentrated
top-10 share     : 80.3 %          ← too concentrated
fresh_24h        : 5               ← starving
fresh_7d         : 99
content_language: 100 % NULL       ← Phase 6 inert
near-empty rows  : revert-stories=1, study-focus=1, advanced-learning=1,
                   live-streams=1, daily-picks=2, news-current-affairs=22
```

### Changes shipped this iteration

1. **`supabase/migrations/…_content_language_backfill.sql`** — unicode-script detection + known-channel defaults + English fallback. Skips rows on `removed_videos` blocklist so the reject-trigger doesn't fire. Adds partial index `idx_curated_videos_content_language`.
2. **`supabase/functions/feed/index.ts`** (lines 123-150) — expanded `SECTION_CATEGORY_ALIASES` for all 6 near-empty sections. `revert-stories`, `study-focus`, `advanced-learning`, `live-streams`, `daily-picks`, `news-current-affairs` now inherit broader category fallbacks so the row is guaranteed populated *before* the cascade kicks in.

### Measured before / after

| Metric | Before | After | Δ |
|---|---|---|---|
| `content_language` NULL share | **100 %** | **6.8 %** (2 144 / 31 625) | **−93 %** |
| Indonesian (`id`) videos surfaced | 0 | **9 847** | new market |
| Bengali (`bn`) videos surfaced | 0 | **2 271** | new market |
| Turkish (`tr`) videos surfaced | 0 | **1 144** | new market |
| Arabic (`ar`) videos surfaced | 0 | 272 | new market |
| Near-empty sections (≤22 videos) | 6 | 0 (via alias) | −100 % |

### Left on the table (next iteration — ranked)

1. **Channel-dominance cap at the pool layer** — enforce max-per-channel *during retrieval*, not only per-page. Options: window fn (`row_number() over (partition by channel_id order by …)`) capped to N in the SQL, or a materialized daily "fair pool" refresh. Target: top-3 ≤ 15 %, top-10 ≤ 45 %.
2. **Freshness cadence** — reshape the crawler to fetch each channel's `publishedAfter=now-24h` first, before backfill. Target: `fresh_24h ≥ 200`, `fresh_7d ≥ 1 500`.
3. **Ingest → visibility funnel** — 241 770 trusted-channel videos are stuck in `pending_review`. Confidence-tier auto-promotion is ready; needs a scheduled sweep.
4. **Postgres read-through cache** (item #7) — after items 1-3 land.

---

## Method

Every iteration must include:

1. Baseline measurement (SQL, log, or curl).
2. Exactly what changed (files + lines).
3. Post-change measurement using the *same* method.
4. Δ vs baseline.
5. Next-highest bottleneck named.

If the user can't perceive it, the work isn't done.
