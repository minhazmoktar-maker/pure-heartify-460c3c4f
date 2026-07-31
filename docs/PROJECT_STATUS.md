# Heartify — Project Status

_Last updated: 2026-07-31 (end of the Lovable engineering phase)_

## What Heartify is

A mobile-first, halal-first discovery platform for beneficial video, audio (Qur'an
recitation and scholar lectures) and worship tooling. It optimizes **benefit per
minute**, not watch time, and carries **no advertising** by constitution.

## Current state: production-capable, pre-scale

| Subsystem | State | Notes |
| --- | --- | --- |
| Corpus | 344,328 videos in `curated_videos` | Trigger-enforced halal floor (no female-featured content, no music) |
| Moderation | Automated, confidence-tiered (A/B/C/D) | Nightly re-audit + 30-min sweep crons; human review only for tier C/D |
| Ingestion | Automated, quota-scheduled | `ingest-videos` every 15 min, discovery hourly, DLQ + stuck-job reaper |
| Discovery | 5,381 seeded topic queries, 18 languages | Goal: 7,000 ethical channels; tracked at `/admin/global-discovery` |
| Recommendations | Personalization v4 + benefit-ranked arm (A/B) | Multi-pool retrieval, per-channel caps, MMR rerank, session seeding |
| Search | Lexical (tsv + trigram) + semantic (pgvector HNSW) | Lexical index coverage backfilling automatically (see below) |
| Attestation ledger | Live | Hash-chained provenance, public verification at `/verify` |
| Knowledge graph | Live | `concepts`, prerequisites, video segments, 4 guided learning paths |
| Benefit labels | Live | T+90 "was it worth it?" prompts feeding `benefit_priors_v1()` |
| Auth / RLS | Enforced on all user tables | Roles in `user_roles` + `has_role()`; grants audited |
| Observability | `/admin/*` dashboards, ops alerts, CSP reports, Sentry release tags | `check-ops-alerts` every 10 min |
| PWA / mobile | Installable, push notifications, safe-area aware | Capacitor wrappers not yet built |

## This phase's measured work

**1. Embedding write path (top database cost in the project).**
`pg_stat_statements` showed the single-row embedding `PATCH` as the #1, #3 and #4
statements by total time: **198,790 + 28,214 calls, 35.5 ms and 48.0 ms mean,
8,411 seconds of cumulative database time**, with 7.5 s worst case. Root cause:
one HTTP `PATCH` per video, each re-running two whole-row `BEFORE UPDATE`
moderation triggers with subqueries.

Fixes shipped:
- `apply_video_embeddings(jsonb, text)` — one set-based `UPDATE` per 100-vector
  batch instead of 100 single-row writes (`ingest-videos`).
- `trg_enforce_blocked_creators` scoped to `UPDATE OF title, channel_title, is_archived`.
- `trg_reject_removed_video` scoped to `UPDATE OF video_id`.
  Embedding-only writes now skip both triggers entirely.
- Added `removed_videos_video_id_idx` (the blocklist lookup had no index).

**2. Search index coverage — a real, previously invisible quality hole.**
267,368 of 344,328 rows (**77.6%**) had `search_tsv = NULL`, i.e. they were
invisible to full-text search. The old `search-backfill` function touched rows
**one at a time** (and contained a dead no-op update), so it never finished.

Fixes shipped:
- `backfill_search_tsv(int)` — set-based recompute. Measured: **5,000 rows in
  3.43 s (0.69 ms/row) vs 35.5 ms/row on the old per-row path — ~51x faster.**
- `search-backfill` edge function rewritten to call it.
- Self-terminating cron `backfill-search-tsv` runs every minute and
  `cron.unschedule`s itself at zero remaining. Verified progressing:
  267,368 → 257,368 nulls in the first two minutes (5,000/min, ETA ~51 min).

## Verified vs unverified

- Verified by measurement: the numbers above (pg_stat_statements, timed RPC runs,
  repeated null-count sampling).
- Not verified here: end-user latency change from the trigger scoping (needs
  production traffic), semantic search recall after embedding backfill (blocked,
  see `KNOWN_LIMITATIONS.md`), and native app behaviour (needs devices).
