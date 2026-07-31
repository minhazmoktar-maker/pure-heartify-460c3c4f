# Heartify — Architecture

## Stack

- **Client**: React 18 + Vite 5 + TypeScript + Tailwind (semantic design tokens only).
  406 `.tsx` modules, ~5 MB source. Routes are code-split (`React.lazy`, 217 lazy
  boundaries, one eager page).
- **Backend**: Lovable Cloud (Postgres + Auth + Storage + Edge Functions).
  54 edge functions in `supabase/functions/`.
- **AI**: Lovable AI Gateway (moderation reasoning, embeddings
  `openai/text-embedding-3-small`, 1536 dims).

## Data spine

```
discovery_seeds / discovery_topic_queries
        │  (discover-channels)
        ▼
channel_candidates ──► channel_trust_profiles ──► approved_channels
        │  (confidence tiers A/B/C/D)
        ▼
curated_videos  ◄── moderation triggers (halal floor, blocklists, tsv, language)
        │            attestations (hash-chained provenance)
        ├──► search_tsv (lexical) + embedding (pgvector HNSW, semantic)
        ├──► concepts / concept_video_segments (knowledge graph)
        └──► benefit_labels ──► benefit_priors_v1() ──► ranker
```

## Read path (feed)

`useInfiniteFeed` / surfaces → `feed`, `surfaces`, `recommendations` edge
functions → `_shared/recommendations/candidates.ts` builds **independent pools**
(freshness, trending, Heartify-native trending, hidden gems, taste, beneficial)
with an explicit column list (never `select *` — the `embedding` column is
1536 floats and must never cross the wire), applies per-channel caps, then MMR
reranks with a session seed so no two sessions or users get identical ordering.

## Write path invariants

1. Every `CREATE TABLE public.*` ships with explicit `GRANT`s in the same migration.
2. Roles live only in `user_roles`, checked through `has_role()` / `has_min_role()`
   (SECURITY DEFINER, `search_path` pinned).
3. Bulk writes go through set-based RPCs, never per-row PostgREST loops.
   Precedent: `apply_video_embeddings`, `backfill_search_tsv`.
4. `BEFORE UPDATE` triggers on hot tables must be scoped with `UPDATE OF <cols>`;
   an unscoped trigger on `curated_videos` costs ~35 ms per unrelated write.
5. Privileged RPCs are revoked from `anon`/`authenticated` and granted to
   `service_role` only; cron-invoked functions additionally require `X-Cron-Secret`.

## Automation (pg_cron)

| Job | Schedule | Purpose |
| --- | --- | --- |
| `ingest-videos-15min` | */15 | Primary ingestion |
| `ingest-videos-discovery-1h` | hourly | Channel discovery lane |
| `reap-stuck-discovery-jobs` | */5 | Retry/DLQ recovery |
| `sweep-inappropriate-content` | */30 | Halal-floor sweep |
| `nightly-halal-reaudit` | 03:00 | Full re-audit |
| `attestation-backfill-10min` | */10 | Provenance ledger |
| `channel-id-backfill-tick` | */1 | Channel identity backfill |
| `backfill-search-tsv` | */1 (self-terminating) | Lexical index coverage |
| `refresh-taste-profiles-15m` | */15 | Personalization |
| `refresh-sections-daily` | 04:00 | Section rebuild |
| `benefit-labels-daily` | 03:10 | T+90 label queue |
| `personalized-push-30m`, `notify-favorites-daily`, `notify-streak-risk` | — | Retention |
| `check-ops-alerts` | */10 | Health + alerting |
| `gsc-hourly-sync` | hourly | Search Console |

## Observability

`/admin/rec-health`, `/admin/feed-diversity`, `/admin/benefit-labels`,
`/admin/channel-pipeline`, `/admin/global-discovery`, `/diagnostics`, `/status`,
plus `ops_metrics`, `production_alerts`, `dead_letter_queue`, `csp-report`.
