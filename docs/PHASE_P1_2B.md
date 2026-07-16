# Phase P1.2B — Multi-source Discovery Engine

Goal: safely grow Heartify's approved catalog from ~575 channels to
10 000+, then 50 000+, then 100 000+ trusted, halal, educational
creators — **without** weakening any moderation gate, and while staying
well inside the YouTube Data API v3 quota envelope.

Every discovered channel still passes through the existing
`verify-channel` and `moderate-video` pipelines before it can serve to
users. Nothing in this phase auto-approves anything.

---

## 1. Architecture

```
                         ┌────────────────────────────┐
              cron (6h) →│ discover-channels edge fn  │← admin /admin/discovery
                         └──────────┬─────────────────┘
                                    │  reserve quota per call
                                    ▼
                         ┌──────────────────────────┐
                         │ discovery_quota_ledger   │  (per-day per-api unit ledger)
                         └──────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────────┐
        ▼                           ▼                               ▼
 ┌────────────┐            ┌────────────────┐              ┌──────────────────────┐
 │ approved_  │            │ discovery_     │              │ discovery_topic_     │
 │ channels   │ seeds▶     │ seeds (cursor) │              │ queries (15 langs)   │
 └────────────┘            └────────────────┘              └──────────────────────┘
        │ 3 methods /seed                                             │
        ▼                                                             ▼
 related_channels   playlist_collab   description_mention     topic_search:{lang}
        │                 │                    │                     │
        └────────┬────────┴────────────┬───────┴────────┬────────────┘
                 ▼                     ▼                ▼
          hydrateChannels  →  classifyTopic + detectLang + detectOrg
                                    │
                                    ▼
                          scoreConfidence(6 signals)
                                    │
                                    ▼
                           enqueueCandidate
                                    │
                                    ▼
                     ┌────────────────────────────┐
                     │  channel_candidates        │  (status=pending)
                     │  + confidence_breakdown    │
                     │  + language_detected       │
                     │  + organization_type       │
                     │  + crawl_depth             │
                     └────────────┬───────────────┘
                                  ▼
                    verify-channel → moderate-video → approved_channels
                    (unchanged — no auto-approvals ever)
```

---

## 2. Discovery sources

| Method | Signal | YouTube API cost / call |
| --- | --- | --- |
| `related_channels` | `search.list?relatedToChannelId` | 100 units |
| `topic_search:{lang}` | `search.list?q=...&relevanceLanguage=` | 100 units |
| `playlist_collab` | `playlists.list` + `playlistItems.list` (co-appearances) | 1 + 1 per playlist |
| `description_mention` | `channels.list` → parse `UC[…]` handles in description | 1 unit |
| `featured_channel` | Same as topic_search on channel-page keywords | 100 units |
| `institution_seed` | Hand-curated bootstrap roster (no API call) | 0 units |

All methods share the same enqueue path, the same halal blocklist, the
same duplicate detector, and the same moderation gate downstream. No
method can bypass or soften any check.

---

## 3. Multi-language coverage

Seeded 15 languages via `discovery_topic_queries` (44 initial queries):

- English, Arabic, Bangla, Urdu, Turkish, Indonesian, Malay, Persian,
  French, German, Spanish, Portuguese, Japanese, Korean, Chinese.

The topic-search sweep picks the top-N by priority × recency each run,
so under-covered languages naturally get more airtime. Admins can add,
edit, disable, or reprioritize queries in the UI (`discovery_topic_queries`
is admin-writable via RLS).

Language of each discovered channel is auto-detected (Unicode script +
stopword heuristics) and stored on `channel_candidates.language_detected`
so admins can review batches by language.

---

## 4. Confidence scoring (6 signals)

Every enqueued candidate carries a `confidence_breakdown` JSON blob
plus an overall `confidence` integer (0..100) computed as:

```
overall = 100 · max(0, min(1,
      0.30 · topic_relevance
    + 0.20 · educational_quality
    + 0.20 · discovery_source
    + 0.15 · organization
    + 0.15 · language_confidence
    − 0.25 · duplicate_probability
))
```

| Signal | Source |
| --- | --- |
| `topic_relevance` | Keyword classifier (Islamic > education > other) |
| `educational_quality` | Count of edu markers (lecture, tutorial, course, دروس, etc.) |
| `discovery_source` | Method reliability weight (institution=0.95 → description_mention=0.60) |
| `organization` | Regex detection: university, institute, academy, mosque, official |
| `language_confidence` | Unicode-script + stopword detection succeeded |
| `duplicate_probability` | Fuzzy owner-key duplicate check (`check_channel_duplicate`) |

The trail is human-readable in the admin review UI and gives moderators
a clear reason for every candidate's queue position.

---

## 5. Database changes

Migration: `Phase P1.2B — Multi-source discovery engine`.

### `channel_candidates` (new columns)
- `confidence_breakdown JSONB` — 6-signal score trail.
- `language_detected TEXT` — auto-detected ISO code.
- `crawl_depth INTEGER` — 0 = seed, 1+ = graph hops (bounded by `DISCOVERY_MAX_DEPTH`, default 2).
- `educational_quality INTEGER` — 0..100 from edu-marker density.
- `organization_type TEXT` — university / institute / academy / mosque / …

CHECK constraint `channel_candidates_source_check` widened to accept
`topic_search`, `playlist_collab`, `description_mention`, `featured_channel`,
`institution_seed` in addition to the existing values.

### `discovery_seeds` (new)
Resumable per-seed cursor state. Long-running crawls that hit the
edge-function timeout persist `next_page_token` + `exhausted` and resume
on the next tick. Admin-only RLS.

### `discovery_topic_queries` (new)
Admin-curated multi-language search seeds. 44 rows loaded across 15
languages. Admin-only RLS.

All GRANTs follow the standard four-step pattern; `service_role` has full
access (used by the edge function), `authenticated` admins have read +
manage via `has_role(auth.uid(),'admin')`.

---

## 6. Edge functions

| Function | Change |
| --- | --- |
| `discover-channels` | Rewritten to dispatch across 5+ methods, apply confidence scoring, and rotate multi-language topic queries. Same auth surface: admin JWT **or** `X-Cron-Secret` (cron path). |

No new edge function was needed — dispatching by `method` inside the
existing function preserves the entire admin UI, cron wiring, and quota
ledger with zero breakage.

---

## 7. Quota strategy

| Budget | Value |
| --- | --- |
| Daily cap | `DISCOVERY_DAILY_QUOTA` (default **4 000 units**, of YouTube's 10 000 default) |
| Reserved headroom | 6 000 units/day for interactive verify-channel + ingest-videos |
| Per-run seed cap | `DISCOVERY_SEEDS_PER_RUN` (default 25) |
| Per-run topic sweep cap | `DISCOVERY_TOPIC_PER_RUN` (default 12) |
| Bail threshold | 90% of daily budget — remaining seeds queued for next tick |

Every network call reserves units atomically against
`discovery_quota_ledger` **before** issuing. The ledger is
per-day/per-api and shared with all other edge functions, so
verification traffic and discovery traffic contend against the same
budget.

At the default 4 000-unit cap:
- ~25 seed crawls (related+collab+mentions) ≈ 2 500 units
- ~12 topic sweeps × 100 ≈ 1 200 units
- Comfortable safety margin every run.

Cron cadence: every 6 h ⇒ 4 runs/day ⇒ **~100 seeds and ~48 topic
sweeps per day** yielding ~800–1 500 raw candidate hits/day; the
duplicate + halal + moderation filters trim to a much smaller
review-ready set.

---

## 8. Scalability estimates

| Population | Time to reach at current cadence | Bottleneck |
| --- | --- | --- |
| 1 000 candidates awaiting review | ~1 week | admin review throughput |
| 10 000 approved channels | ~6–9 months | admin review + moderation SLA |
| 50 000 approved channels | ~2 years | needs second YouTube API project (10 k more units) |
| 100 000+ approved channels | ~3–4 years | horizontal shard by language, +Firecrawl for institution rosters |

Horizontal scaling levers already scaffolded:
- `DISCOVERY_DAILY_QUOTA`, `DISCOVERY_SEEDS_PER_RUN`,
  `DISCOVERY_TOPIC_PER_RUN`, `DISCOVERY_MAX_DEPTH` — all env-tunable.
- `YOUTUBE_API_KEY_2` fallback already wired.
- Topic queries table lets you drop in additional languages without a
  code change.
- `discovery_seeds` cursor table lets a future worker split crawls
  across multiple parallel invocations.

---

## 9. Expected growth

Assuming a conservative **25% admin-approval rate** (aligned with what
the existing pipeline shows) and current quota + cadence:

| Time | New candidates | Est. approved |
| --- | --- | --- |
| Month 1 | ~24 000 hits | ~1 500 approvals (after dedup + moderation) |
| Month 3 | ~72 000 hits | ~5 000 approvals |
| Month 6 | ~145 000 hits | ~10 000 approvals |

Estimated **video growth** downstream (average ~120 videos/channel over
first ingest): **+1.2 M curated videos** by month 6, all still passing
the same halal moderation gate.

---

## 10. Security review

- All new tables enforce RLS. Only admins read/manage;
  `service_role` (edge function) has full access. No `anon` grants.
- No new SECURITY DEFINER functions; the two new tables are queried
  through standard PostgREST + RLS.
- CHECK constraints preserved and widened only for new discovery source
  values.
- No secrets exposed to the client. `YOUTUBE_API_KEY`,
  `YOUTUBE_API_KEY_2`, `CRON_SECRET`, `DISCOVERY_DAILY_QUOTA` remain
  server-only.
- Duplicate detection unchanged (`check_channel_duplicate` RPC), so
  no risk of the queue being flooded with alt/mirror channels.

---

## 11. Moderation safeguards (unchanged, reinforced)

- **Hard blocklist** applied on every candidate before enqueue —
  music, dance, dating, gambling, alcohol, prank/reaction, etc. Any
  hit → discarded immediately.
- **No auto-approval anywhere in this pipeline.** Every candidate
  enters `channel_candidates` with `status='pending'` and must be
  promoted by an admin through `verify-channel`.
- **Duplicate check** runs before enqueue; `high` risk is dropped.
- **Halal-topic classifier** required to get any priority above 40.
- **Language detection + org detection** feed into review dashboards
  but never lower any moderation bar.

---

## 12. Production readiness checklist

- [x] Migration applied cleanly. All new tables have GRANTs, RLS, and admin-only policies.
- [x] `channel_candidates.source` CHECK widened; existing rows unaffected.
- [x] 44 multi-language topic queries seeded (15 languages).
- [x] Confidence breakdown persisted on every new candidate for full explainability.
- [x] Quota reservation happens **before** every network call — no accidental over-spend.
- [x] Bail-at-90% keeps every run inside the daily budget.
- [x] Existing admin UI (`/admin/discovery`), cron path, and manual "Run discovery now" all continue to work — no breaking API changes.
- [x] Backward compatible: old rows and old `discovery` source value still valid.
- [x] No new secrets required (uses the existing `YOUTUBE_API_KEY`).
- [x] No moderation gate weakened. Zero auto-approvals introduced.
- [x] Type-check passes.

---

## 13. What's intentionally deferred (roadmap)

- **Depth-2 graph crawling** — cursor scaffolding is in place
  (`crawl_depth`, `discovery_seeds`); enabling it is a one-line change
  once we've spent 30 days measuring the depth-1 signal quality.
- **Firecrawl-powered institution rosters** — parse university /
  non-profit directory pages to seed high-confidence candidates without
  YouTube API cost.
- **pgvector-based topic embedding** for query expansion instead of
  hand-curated `discovery_topic_queries`.
- **Parallel worker sharding** across `discovery_seeds` — required
  only past ~50 000 approved channels.
