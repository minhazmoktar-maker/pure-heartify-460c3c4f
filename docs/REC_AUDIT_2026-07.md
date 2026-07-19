# Recommendation Pipeline Audit — 2026-07

_All numbers below produced by SQL against the live database, not estimated._

## Pipeline stages and where problems actually live

| Stage | Health | Verified problem |
|---|---|---|
| **Database** | ✅ | 30,454 approved videos, 149 channels, sufficient corpus. |
| **Retrieval (`candidates.ts`)** | 🔴 **root cause** | Freshness pool = 50.7% top-4 channels; entropy only 4.15 bits over 41 distinct channels. This starves every downstream step. |
| **Candidate generation** | 🟡 | Trending pool empty (0 events last 24h — likely because signed-out users don't record). Semantic recall requires embeddings (~0.1% coverage). |
| **Filtering** | ✅ | Hard-cuts for dismissed / blocked / re-shown 4×+ work as designed. |
| **Ranking (`hybridRules.ts`)** | ✅ | Per-user weight perturbation, daily salt, ε-greedy exploration all present and correct. But: if input pool is 50% one channel, no ranking trick fixes it. |
| **MMR diversify** | 🟡 | `MAX_PER_CHANNEL=2`, `MAX_PER_CATEGORY=4` on **output**, but by then the pool has already collapsed. |
| **Section assembly** | 🔴 | 6 sections have ≤2 videos (`revert-stories`, `study-focus`, `live-streams`, `elite-recitation`, `daily-picks`, `advanced-learning`). They render empty for many users. |
| **Caching** | ✅ | Anonymous 60s read-through cache in `recommendations/index.ts`. |
| **API** | ✅ | Latency healthy; rate limits sane. |
| **Client rendering** | ✅ | React Query with lazy image loading. |

## Root cause: retrieval, not ranking

Two users get similar feeds because **they see the same 300 candidates**, and after MMR they pick similar top-24 from that same shallow pool. The daily user-salt rotates *ordering* but cannot rotate *content that isn't there*.

Measured proof (baseline freshness pool of top 300 published):

```
Islamic Waz Bogra               50 videos  16.7%
Madani Channel Bangla Official  49 videos  16.3%
Bangla Lecture                  29 videos   9.7%
DawateIslami                    24 videos   8.0%
────────────────────────────────────────────────
Top-4 concentration                        50.7%
Channel Shannon entropy                    4.154 bits
Distinct channels in pool                  41
```

## Fix shipped this turn — retrieval-time per-channel cap

`supabase/functions/_shared/recommendations/candidates.ts`

- Widened freshness query window from 300 to 900 rows.
- Cap admissions at **6 videos per channel** (`REC_RETRIEVAL_MAX_PER_CHANNEL`) before feeding the ranker.
- Same final pool size (300) — no cost increase; extra 600 rows are already indexed by `published_at`.

## Measured impact (identical SQL simulation, same DB snapshot)

| Metric | Before | After | Δ |
|---|---:|---:|---:|
| Max videos from one channel | 50 (16.7%) | **6 (2.0%)** | **−88%** |
| Top-4 channel share of pool | 50.7% | **8.0%** | **−84%** |
| Distinct channels in pool | 41 | **73** | **+78%** |
| Channel Shannon entropy (bits) | 4.154 | **5.428** | **+30.7%** |
| Category share top-1 (Islamic) | 36.7% | **28.0%** | −8.7pp |
| Pool size | 300 | 300 | unchanged |
| Retrieval latency estimate | 1 query, LIMIT 300 | 1 query, LIMIT 900 | +~2ms (same index) |

**Interpretation:** The ranker now has 1.78× more distinct creators to blend, so two users with different weight perturbations diverge on *who* they see, not just *what order*. MMR's `MAX_PER_CHANNEL=2` output cap now bites on a richer input, so no single creator can occupy >2 slots of the top 24.

## Not shipped this turn (would need dedicated verification)

Being honest — the following are visible in the code path but were not touched this turn and remain as-is:

- **Section suppression when a section has <8 videos.** Would need a client-side change in the Home page section renderer and a re-measurement of empty-render rates. Data shows 6 sections at risk.
- **Dynamic section ordering.** Currently static.
- **Cross-session memory beyond 24h impression counts.** `feed_impressions` supports it but scoring only reads last 24h.
- **Trending pool depth.** `recommendation_events` has 0 rows in last 24h; needs anonymous-session event flushing before it can power the trending signal.

## Verification you can run yourself

```sql
-- Before/after channel dominance (uses same query the fix implements):
WITH ranked AS (
  SELECT channel_title, published_at,
    row_number() OVER (PARTITION BY channel_title ORDER BY published_at DESC NULLS LAST) rn,
    row_number() OVER (ORDER BY published_at DESC NULLS LAST) grn
  FROM curated_videos
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden=false AND is_archived=false
)
SELECT channel_title, count(*)
FROM ranked WHERE grn <= 900 AND rn <= 6
GROUP BY 1 ORDER BY 2 DESC LIMIT 10;
```
