# Heartify Production Audit — Living Bottleneck Log

**Goal:** the user says *“Heartify feels incredibly fast, highly personalized, always fresh, and I discover valuable new content every time I open it.”*

We only mark a bottleneck **RESOLVED** when a measurement proves the user-visible change.

---

## Current top bottlenecks (ranked by user-visible impact)

| # | Bottleneck | Status | Owner metric | Target |
|---|---|---|---|---|
| 1 | Feed cold-start (~2.1 s p50) | 🟡 in progress | `feed` cold-start latency | ≤ 700 ms |
| 2 | Cache MISS every request (in-proc only) | 🟡 open | `X-Cache: HIT` ratio | ≥ 70 % anon |
| 3 | Rate-limit DB round-trip on every hit | 🟡 open | rate-limit avg latency | ≤ 20 ms |
| 4 | `content_language = NULL` on 100 % of pool | 🟡 open | non-null share | ≥ 60 % |
| 5 | 158 channels stale > 7 d | 🟡 open | stale > 7 d channels | ≤ 40 |
| 6 | Freshness pool < 24 h very thin | 🟡 open | ingested last 24 h | ≥ 5 000 videos/day |
| 7 | 461 k rows / 404 MB `moderation_log` bloat | ✅ pruned to 30 d | table row count | ≤ 100 k |

---

## Iteration 2026-07-19 — Feed latency

### Findings

- `feed` end-to-end p50 for anon = **~3.05 s** (5 sections × 5 runs).
- `curated_videos?select=*` pulled the 1 536-dim `embedding` vector, `search_tsv`, `moderation_reasoning`, and `moderation_signals` on **every** row of a 400-row overfetch.
- `getCallerUserId` executed a remote `auth.getClaims` round-trip **on every anon request** because it treated the anon publishable key as a possibly-valid session.
- `moderation_log` had grown to **1 307 267 rows / 404 MB**, adding write amplification to ingest.

### Changes shipped

1. `supabase/functions/feed/index.ts` — replaced `select=*` with an explicit 14-column projection (`FEED_COLS`) on both the primary query and the empty-section cascade.
2. `supabase/functions/_shared/entitlements.ts` — added a local base64 JWT decode fast-path; `role in ('anon','service_role')` short-circuits to `null` with **zero network calls**.
3. Pruned `moderation_log` rows older than 30 days (461 220 rows deleted).
4. Added stage timing (`[feed.produce] fetch=… json=…`) to unblock future measurement.

### Measured before / after

| Metric | Before | After | Δ |
|---|---|---|---|
| Feed warm p50 (anon) | **~3.05 s** | **~0.83 s** | **−73 %** |
| Feed cold p50 (anon) | 3.14 s | 2.13 s | −32 % |
| DB fetch time (in-function) | not observable | **272–755 ms** | now measurable |
| `moderation_log` rows | 1 307 267 | 846 047 | −35 % |
| Anon auth round-trips | 1 per request | 0 | −100 % |

### Left on the table (next iteration)

- **Persistent read-through cache.** In-process `Map` cache is per-isolate. Deno Deploy rotates isolates, so cache hit rate on the CDN is ≈ 0 %. Options: (a) Postgres `edge_cache` table with 30-60 s TTL keyed on the feed hash, (b) rely on `Cache-Control: public, max-age=30` + `Vary` for the anon path and disable auth entirely on that path. Expect **200-400 ms** saved.
- **Rate-limit fast-path.** For anon, sample 1-in-10 to Postgres and use in-process token buckets in between. Expect **~50 ms** saved.
- **Ingestion breadth.** 158 channels haven’t been pulled in 7 d despite the 15-min cron. Rework scheduler so priority-tier 1 channels can’t get starved. Target: `stale_7d ≤ 40`, `fresh_24h ≥ 5 000 videos`.
- **Language backfill.** `content_language` is 100 % NULL — locale personalization is inert. Backfill from YouTube `defaultAudioLanguage` + heuristics.

---

## Method

Every iteration on this doc must include:

1. A measured baseline (SQL query, edge-function log, or curl timing).
2. Exactly what changed (files + lines).
3. A post-change measurement using the *same* method.
4. Δ vs baseline.
5. The next bottleneck.

If the user can’t perceive it, the work isn’t done.
