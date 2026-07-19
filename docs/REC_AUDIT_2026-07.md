# Recommendation System Audit — 2026-07

Living audit doc. Measurements taken against production DB; re-runnable via
`SELECT * FROM rec_retriever_health();` and `SELECT * FROM rec_feed_health(24);`
or via the owner dashboard at **`/admin/rec-health`**.

---

## Root-cause findings (2026-07-19)

### 🔴 P0 — `recommendation_events` table has 0 rows

Every trending retriever (`get_trending_video_ids`, `get_heartify_trending_ids`)
reads from this table. It was empty for the entire lifetime of the app.

- Cause: `admin.from("recommendation_events").insert(...).then().catch()`
  in the `/recommendations` edge function silently swallowed writes. No log,
  no row.
- Impact: two of four retrievers (`trending_14d`, `heartify_trending_72h`)
  return **0 candidates**. All popularity signal is dead. The system was
  effectively running on freshness + hidden_gems only.
- Fix shipped: new `log_recommendation_event(...)` SECURITY DEFINER RPC.
  Edge function now calls the RPC for both single-event and batched impression
  writes. Writes cannot silently drop.

### 🔴 P0 — `content_language` is 100% NULL

31,380/31,380 approved videos have `content_language = NULL`. Every
"language-aware" personalization path (`useLocalePreferences`, MMR language
diversity boost, regional Daily Dose) is a no-op.

- Fix required (not shipped this turn): language-detection backfill from
  title + channel_title + description. Recommend `franc-min` in an edge
  function, batched 500/run, target ~2h to complete backfill.

### 🟠 P1 — Hidden Gems retriever concentrated on 8 channels

`get_hidden_gem_ids(120, 300)`:

| metric | value |
|---|---:|
| pool_size | 120 |
| distinct_channels | **8** |
| top_channel_pct | **31.67%** |
| entropy | 2.386 bits |

Root cause: the "gem" definition (high halal_score, low impressions) matches
only a handful of channels because impressions are almost entirely absent
(see P0 above). Once event logging comes back online, re-measure before
tuning the SQL.

### 🟠 P1 — Freshness pool is 17.6% fresh, universe is 0.3% fresh (7d)

After ingestion fixes the top-900 window contains ~42 fresh-7d videos.
The universe itself only has **95/31,380 videos published in the last 7
days** — ingestion is not keeping pace with upstream uploads.

### 🟠 P2 — Age gate + cookie banner + location prompt stack on first load

Confirmed via Playwright (see `/tmp/browser/rec/shots/s1.png`): a brand-new
user sees the age-verification modal, cookie banner, and "Get location"
strip all rendered on the same initial paint. Feed loads behind the modal
but is unreachable. Recommend sequential presentation (age → consent →
location) with a single call-to-action per step.

---

## Per-retriever health snapshot (2026-07-19 18:48 UTC)

Source: `SELECT * FROM rec_retriever_health();`

| retriever | pool | ch | cats | langs | top_ch% | entropy | fresh_7d% | trusted% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| universe | 31380 | 149 | 15 | **1** | 12.24 | 4.401 | 0.30 | 99.92 |
| freshness | 239 | 67 | 10 | 1 | **2.51** | **5.772** | 17.57 | 100.00 |
| trending_14d | — | — | — | — | — | — | — | — |
| heartify_trending_72h | — | — | — | — | — | — | — | — |
| hidden_gems | 120 | **8** | 6 | 1 | **31.67** | 2.386 | 0.00 | 100.00 |

Rows for `trending_*` are absent because their underlying RPCs return
zero rows (dead event pipeline, see P0).

## Assembled-feed snapshot (720h impressions)

Only 2 impressions total in the last 30 days — the entire personalization
loop was starved. Once the RPC logger backfills real traffic, this table
becomes meaningful.

---

## Shipped this turn

- `log_recommendation_event(...)` SECURITY DEFINER RPC (guaranteed writes)
- `/recommendations` edge function switched to the RPC for both event
  endpoint and impression batch
- `rec_retriever_health()` + `rec_feed_health(hours)` RPCs
- `/admin/rec-health` owner dashboard with color-coded thresholds and a
  rubric explaining each metric

## Not shipped — explicit follow-up backlog

The original ask covered a much larger scope. I was not willing to
fabricate measurements for items I couldn't credibly execute in one turn.
These are the real remaining pieces:

1. **`content_language` backfill** — language detection worker + one-shot
   backfill migration.
2. **Per-source pool tagging in `candidates.ts`** — attach a `Set<string>`
   of source retrievers to each candidate, then log per-source contribution
   + overlap ratios into `rec_feed_health`.
3. **11 user-simulation harness** — replay against a fixture user
   (Quran-focused, Programming-focused, Arabic learner, ...) and diff
   sequential feeds. Requires the RPC logger to have run for ≥24h so
   personalization has signal to react to.
4. **Novelty / long-tail / new-channel metrics** on the dashboard — need
   `seen_channel` history per user to compute.
5. **Latency + cache-hit-ratio panel** — plumb from existing `readThrough`
   cache stats + edge function duration histograms.
6. **UX friction fix**: sequence age gate → cookie consent → location
   prompt instead of stacking them on first paint.

Every item above is scoped so it can be picked up individually without
re-doing the diagnostic work.
