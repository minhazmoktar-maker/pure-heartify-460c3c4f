# Heartify Scaling Roadmap: 1M → 500M Users

A milestone-by-milestone map of what breaks first, what to fix, and roughly what it costs. Numbers assume a halal streaming platform with heavy read traffic (feed, search, recommendations), moderate writes (favorites, watch history, dhikr/salah logs), and a moderation pipeline over YouTube-sourced videos.

Assumed activity per MAU: ~15 sessions/mo, ~40 feed loads, ~8 searches, ~25 video plays, ~5 writes. DAU ≈ 25% of MAU.

---

## Milestone 1 — 1,000,000 users (~250k DAU)

**Load**: ~1.2k req/s peak on API, ~10M analytics events/day, ~500 GB DB, ~2 TB egress/mo.

| Layer | Bottleneck | Fix |
|---|---|---|
| Database | Single Postgres primary handles all reads; `curated_videos` full-text scans slow past 5M rows; `analytics_events` bloats WAL. | Add read replicas (2×), move `search_tsv` to GIN index (already partial), partition `analytics_events` by day, enable connection pooling via PgBouncer transaction mode. |
| Storage | Supabase Storage fine for user uploads; thumbnails still hot-linked from YouTube. | Introduce a thumbnail proxy + S3/R2 bucket with 30-day cache. |
| CDN | Vite bundle served from Lovable hosting; no edge caching on `/feed` responses. | Put Cloudflare in front; cache `feed`, `search` GETs with `s-maxage` + `stale-while-revalidate`. |
| Search | `search_videos` RPC on primary DB, ~120 QPS OK but p95 climbing. | Add materialized trending views, refresh every 5 min. |
| Recommendations | `hybrid-rules` recomputes per request. | Add per-user cache in Redis (60s TTL). |
| Analytics | `INSERT` per event from client. | Batch client-side (5s flush), keep 90-day retention (already configured). |
| Notifications | Adhan + favorites via edge functions; no queue. | Introduce a lightweight queue table + cron worker. |
| Moderation | Nightly re-audit sweep OK; Gemini calls sync. | Move to async queue; parallelize 10 workers. |
| Security | RLS + rate limits sufficient; MFA optional. | Enforce MFA for all admins/owners. |
| **Infra cost** | | **~$800–1,500/mo** (Cloud DB, edge functions, storage, CDN). |

**Architecture change**: Cloudflare CDN + read replicas + Redis cache. Still a monolithic Postgres.

---

## Milestone 2 — 10,000,000 users (~2.5M DAU)

**Load**: ~12k req/s peak, ~100M analytics events/day, ~5 TB DB, ~30 TB egress/mo.

| Layer | Bottleneck | Fix |
|---|---|---|
| Database | Primary write-bound on `watch_history`, `favorites`, `analytics_events`; connection storms; RLS check cost visible. | Vertical scale primary; add 4 read replicas; split `analytics_events` + `recommendation_events` to ClickHouse; introduce logical sharding key (`user_id % N`) prep. |
| Storage | Thumbnail bucket ~10 TB; user-uploaded audio reports growing. | Multi-region R2, lifecycle rules, image resizing at edge. |
| CDN | Origin egress spiking on cache miss storms after deploys. | Tiered caching, cache-tag purges instead of full flush, edge workers for auth-aware feed responses. |
| Search | Postgres FTS p95 >500ms; typo tolerance strained. | Move to **Meilisearch** or **Typesense** cluster (3 nodes). Provider abstraction already in place. |
| Recommendations | Rules-based ceiling hit; CTR flattening. | Introduce **pgvector embeddings** (Gemini `embedding-001`) + candidate → rerank pipeline. Redis for feature store. |
| Analytics | Postgres analytics queries lock tables. | Ship events via Kafka/Redpanda → ClickHouse. Superset/Metabase for dashboards. |
| Notifications | Push fan-out serial. | FCM/APNs via SQS + worker fleet; template rendering separated. |
| Moderation | Human queue backlog; AI cost climbing. | Two-tier: cheap classifier first (Lovable AI flash), Gemini only on uncertain; add moderator tooling with SLA dashboards. |
| Security | Bot signups; credential stuffing. | Turnstile/hCaptcha, WAF rules, IP reputation, per-endpoint token buckets. |
| **Infra cost** | | **~$15k–30k/mo**. |

**Architecture change**: Introduce ClickHouse, Meilisearch, Redis, Kafka. Postgres becomes system-of-record only.

---

## Milestone 3 — 50,000,000 users (~12M DAU)

**Load**: ~60k req/s, ~500M events/day, ~25 TB DB, ~150 TB egress/mo.

| Layer | Bottleneck | Fix |
|---|---|---|
| Database | Single primary saturated on writes; vacuum lag; RLS overhead nontrivial. | **Shard Postgres by user_id** (Citus or app-level). Move `watch_history` and `dhikr_sessions` to Cassandra/ScyllaDB or DynamoDB. Keep `curated_videos`, `approved_channels`, `entitlements` on relational tier. |
| Storage | Audio + thumbnails ~200 TB. | Object storage tiered (hot/warm/cold), CDN pull-through, per-region replication. |
| CDN | Global latency for MENA/SEA users. | Multi-CDN (Cloudflare + Fastly), regional POPs, HTTP/3, Brotli. |
| Search | Meilisearch single cluster too small. | Sharded search cluster; per-locale indexes (ar, en, id, ur, bn); async index pipeline from CDC. |
| Recommendations | Embedding lookup on hot path is slow. | Dedicated vector DB (Pinecone / Qdrant / Vespa); nightly batch scoring for cold users, real-time for active. Introduce contextual bandits. |
| Analytics | ClickHouse single cluster; query concurrency limits hit. | ClickHouse cluster with replication + sharding; tiered storage to S3. Real-time dashboards vs batch cohorts split. |
| Notifications | Push volume ~50M/day. | Dedicated notification service; priority lanes (adhan = realtime, digest = batch); regional workers. |
| Moderation | 500k+ new videos/mo; human ops team of ~30. | Full ML pipeline: audio+vision+text scoring, active learning loop, regional moderator teams, appeals workflow. |
| Security | Nation-state and coordinated abuse. | SOC2 audit, dedicated security team, bug bounty, WAF + DDoS scrubbing, secrets rotation automation, per-region key isolation. |
| **Infra cost** | | **~$150k–300k/mo**. |

**Architecture change**: Sharded polyglot persistence. Dedicated services for search, recs, notifications, moderation. Multi-region active-passive.

---

## Milestone 4 — 100,000,000 users (~25M DAU)

**Load**: ~150k req/s, ~1B events/day, ~60 TB relational + 500 TB events, ~400 TB egress/mo.

| Layer | Bottleneck | Fix |
|---|---|---|
| Database | Cross-shard queries painful; entitlement joins slow. | Denormalize aggressively; CQRS — write to shards, read from purpose-built projections. Introduce a graph DB for social/follow features if added. |
| Storage | Object store egress cost dominates. | Own CDN edges for MENA/SEA, peering agreements, aggressive thumbnail dedup. |
| CDN | Deploy invalidations propagate too slowly. | Immutable asset URLs, blue/green with per-region rollout. |
| Search | Query intent + personalization = per-user rerank. | LLM query understanding at edge; personalized reranker cached per session. |
| Recommendations | Model staleness hurts retention. | Online learning; feature freshness <60s; multi-objective (halal safety + engagement + diversity + reciter variety). |
| Analytics | Data volume unbounded. | Iceberg/Delta lake on S3 + Trino/Spark for offline; ClickHouse only for last 30 days hot. |
| Notifications | Timezone × locale × Islamic calendar = huge fan-out. | Precompute daily send plans nightly; edge workers dispatch; user-level frequency caps. |
| Moderation | Human queue cannot scale linearly. | 90% auto-decisioned with high-confidence; human queue only for edge cases + appeals; trust score gates upload/discovery. |
| Security | Insider risk, key sprawl. | HSM-backed KMS, zero-trust internal, per-tenant encryption keys, continuous compliance scans. |
| **Infra cost** | | **~$800k–1.5M/mo**. |

**Architecture change**: Multi-region active-active for reads; regional write leaders for user-scoped data. Full data platform (lakehouse). Own edge presence.

---

## Milestone 5 — 500,000,000 users (~125M DAU, YouTube-scale)

**Load**: ~700k req/s, ~5B events/day, ~250 TB relational + multi-PB events, PB-scale egress.

| Layer | Bottleneck | Fix |
|---|---|---|
| Database | No single DB technology fits. | Purpose-built per domain: Spanner/CockroachDB for global entitlements; DynamoDB/Scylla for user activity; sharded Postgres for catalog; vector DB for embeddings; graph DB for social. |
| Storage | Exabyte-class media if we host originals. | Continue proxying YouTube for video; own only thumbnails, transcripts, audio recitations. Consider licensing deals + own transcode pipeline for premium exclusives. |
| CDN | Global scale requires owned infra. | Anycast POPs in 40+ metros; peering with major ISPs in Muslim-majority markets; QUIC + BBR. |
| Search | Query volume matches Google-scale niche. | Federated search: personal index + global index + editorial index, merged by reranker. Sub-100ms p99 globally. |
| Recommendations | Cold start, cultural nuance, madhhab-aware ranking. | Multi-tower deep models; per-region models fine-tuned on local scholars/reciters; RLHF from moderator feedback. |
| Analytics | Real-time cohort analysis across 500M users. | Streaming (Flink) + lakehouse; privacy-preserving aggregation (DP), federated for on-device metrics. |
| Notifications | Adhan alone = 500M push/day × 5 prayers = 2.5B pushes/day. | Own push infrastructure alongside FCM/APNs; edge-scheduled from user's device timezone; strict per-user budgets. |
| Moderation | Regulatory + religious authority coordination needed. | Regional scholar boards, transparent policy, appeals with legal SLA, on-device pre-screen for uploads, real-time takedown network. |
| Security | Target for state actors and abuse. | Dedicated red team, formal verification of critical paths, hardware attestation for admin actions, e2e encryption for private data (journal, salah log). |
| **Infra cost** | | **~$8M–20M/mo** (competitive with Spotify-tier at this scale). |

**Architecture change**: Full platform sovereignty — own CDN, own ML infra, regional data residency (KSA, UAE, ID, TR, EU, US), federated data plane, on-device intelligence for privacy-sensitive features.

---

## Evolution at a glance

```text
1M    : Monolith + Cloudflare + read replicas + Redis
         │
10M   : + ClickHouse, Meilisearch, Kafka, queue-backed notifications
         │
50M   : + Sharded Postgres, vector DB, ML moderation, multi-region reads
         │
100M  : + Lakehouse, active-active, own edge, online-learning recs
         │
500M  : + Owned CDN, per-domain DBs, federated search, regional scholar ops
```

## Principles that carry across every milestone

1. **Provider abstractions stay** — `SearchProvider`, `RecommendationProvider`, `ModerationProvider` already let us swap backends per milestone without touching clients.
2. **Halal moderation is non-negotiable** — it scales *before* growth, not after. Trust score + blocklist + human review must ship at every tier.
3. **Read paths cache; write paths queue** — every hot endpoint gets `s-maxage`; every fan-out goes through a queue.
4. **Data-driven content stays flat** — `library.json` (and its successors) beats 400+ hand-coded pages at any scale.
5. **Cost per MAU should drop** — from ~$0.001/MAU at 1M to ~$0.02/MAU at 500M (heavier egress/ML, offset by scale efficiencies).
6. **Privacy scales with reach** — encrypt journals, salah logs, and DMs by 50M; on-device inference by 500M.
