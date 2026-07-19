# Personalization v2 — Continuous Taste Learning

## Signals ingested (with weights & decay)

| Source table | Signal | Weight | Half-life |
| --- | --- | --- | --- |
| `watch_history` (`completed=true`) | full watch | +1.0 | 7 d |
| `watch_history` (>60% progress) | strong watch | +0.7 | 7 d |
| `watch_history` (any) | weak watch | +0.3 | 7 d |
| `favorites` | like / bookmark | +1.5 | 14 d |
| `feed_impressions.last_action='hide'` | hide | −1.2 | 10 d |
| `feed_impressions.last_action='not_interested'` | dismiss | −1.0 | 10 d |
| `feed_impressions.last_action='skip'` | skip | −0.4 | 10 d |
| (any positive signal) | hour-of-day | histogram | 7 d |

`refresh_user_taste_profile(uid)` aggregates the above into per-user
`creator_affinity`, `topic_affinity`, `language_affinity`, `hour_histogram`,
`avg_completion`, and `interest_drift` (change in top-3 categories between
last 7 d and prior weeks).

Runs continuously for every recently-active user via the
`refresh-taste-profiles-15m` pg_cron job, and inline on every For You visit
so the next request already reflects the last one.

## Ranking

`pool_for_you_v2(uid)` scores every approved video against the profile:

```
score = 2.0·topic_affinity[category]
      + 1.5·creator_affinity[channel_id]
      + 0.8·language_affinity[content_language]
      + 0.4 / (age_days + 2)      -- freshness bonus
```

Watched videos are excluded. The retriever adds a small exploration slot
from `pool_recently_added` so drift is always possible.

## Divergence evidence (2026-07-19)

Two real users; 12 completed watches each in the last 3 days.

| User | Diet | Top topic weights |
| --- | --- | --- |
| A `721abd06…` | Quran + Lectures | Quran 8.48, Lectures 1.78 |
| B `26a771cc…` | Business + Spirituality | Business 7.70, Spirituality 2.55 |

Top-40 For You pool for each user:

| Metric | Value |
| --- | --- |
| Shared videos | **0 / 40** |
| Union videos | 80 |
| **Jaccard similarity** | **0.000** |
| User A dominant category | Quran (40/40) |
| User B dominant category | Business (40/40) |

After 12 sessions the two feeds share **zero overlap** — personalization is
producing materially different worlds per user, not the same feed with a
shuffle.
