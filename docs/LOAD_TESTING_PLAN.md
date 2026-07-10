# Heartify Load Testing Plan & Performance SLOs

Companion to `docs/SCALING_ROADMAP.md`. Every bottleneck named there has a matching load test + SLO here. Tests use **k6** for HTTP, **Artillery** for websocket/push, and **pgbench** for DB. All runs are scripted under `tests/load/` and executed in a staging region isolated from production.

---

## 1. Traffic model per milestone

Derive synthetic load from DAU and per-user actions. RPS = DAU × actions/day ÷ 86,400 × peak_factor(3).

| Milestone | MAU | DAU | Peak req/s | Events/day | Concurrent WS |
|---|---:|---:|---:|---:|---:|
| M1 | 1M | 250k | 1,200 | 10M | 5k |
| M2 | 10M | 2.5M | 12,000 | 100M | 50k |
| M3 | 50M | 12.5M | 60,000 | 500M | 250k |
| M4 | 100M | 25M | 150,000 | 1B | 500k |
| M5 | 500M | 125M | 700,000 | 5B | 2.5M |

Mix per request: 55% feed, 15% search, 15% recommendations, 8% writes (favorites/watch), 5% auth, 2% moderation/admin.

---

## 2. Global SLOs (apply to every milestone)

| Domain | SLI | SLO | Alert threshold | Page threshold |
|---|---|---|---|---|
| **Feed** | p95 latency | ≤ 300 ms | p95 > 500 ms for 5 min | p95 > 1 s for 2 min |
| **Feed** | availability | 99.95% | error rate > 0.5% / 5 min | > 2% / 2 min |
| **Search — query** | p95 latency | ≤ 400 ms | p95 > 700 ms / 5 min | p95 > 1.2 s / 2 min |
| **Search — autocomplete** | p99 latency | ≤ 120 ms | p99 > 250 ms / 5 min | p99 > 500 ms / 2 min |
| **Search** | zero-result rate | ≤ 8% | > 15% / 15 min | > 25% / 5 min |
| **Recommendations** | p95 latency | ≤ 500 ms | p95 > 800 ms / 5 min | p95 > 1.5 s / 2 min |
| **Recommendations** | CTR (7-day) | ≥ 6% | < 4% / 24 h | < 2% / 6 h |
| **Recommendations** | diversity (unique channels / 20) | ≥ 8 | < 6 / 24 h | < 4 / 6 h |
| **Moderation** | new-video decision latency | p95 ≤ 60 s | p95 > 5 min | p95 > 15 min |
| **Moderation** | human queue depth | ≤ 500 | > 1,000 / 30 min | > 2,500 / 15 min |
| **Moderation** | false-negative rate (audited sample) | ≤ 1% | > 2% weekly | > 5% weekly |
| **Analytics** | ingestion lag | ≤ 30 s | > 2 min / 5 min | > 10 min / 2 min |
| **Analytics** | dashboard query p95 | ≤ 3 s | > 6 s / 15 min | > 15 s / 5 min |
| **Notifications** | adhan delivery drift | ≤ 30 s from scheduled | > 60 s for >1% of sends | > 2 min for >5% of sends |
| **Notifications** | push success rate | ≥ 98% | < 95% / 30 min | < 90% / 10 min |
| **DB** | connection saturation | ≤ 70% | > 80% / 5 min | > 90% / 2 min |
| **DB** | replication lag | ≤ 2 s | > 5 s / 5 min | > 15 s / 2 min |
| **CDN** | cache hit ratio | ≥ 92% | < 85% / 15 min | < 75% / 5 min |
| **Auth** | login p95 | ≤ 500 ms | p95 > 900 ms / 5 min | p95 > 2 s / 2 min |

Error budgets: monthly (1 - SLO). Burn-rate alerts: 2× burn / 1 h = warn, 14× / 1 h = page.

---

## 3. Test suites per bottleneck

Each suite has: **goal**, **load shape**, **pass criteria**, **milestone target**.

### 3.1 Database
- **db-writes-mixed**: 70/20/10 favorites/watch/dhikr inserts. Ramp to milestone RPS × 0.08. Pass: writes p95 < 100 ms, WAL lag < 5 s. Detects primary saturation → triggers replica/sharding decision.
- **db-rls-heavy**: authenticated reads across `user_roles`, `entitlements`, `favorites`. Pass: RLS overhead < 15% vs anon baseline.
- **db-connection-storm**: cold-start burst (0 → target in 30 s). Pass: PgBouncer queue < 200, no rejections.

### 3.2 Storage
- **thumbnail-cold**: 10k unique thumbs/s not in edge cache. Pass: origin egress < budget, p95 < 800 ms.
- **audio-upload-abuse**: 500 concurrent 10 MB uploads. Pass: no OOM, virus scan queue drains < 5 min.

### 3.3 CDN
- **cache-purge-storm**: invalidate 100k tags, sustain traffic. Pass: hit ratio recovers > 90% within 3 min.
- **regional-fanout**: geo-distributed load from 6 regions. Pass: p95 within 1.3× of best region.

### 3.4 Search
- **search-mixed-lang**: 40% en, 25% ar, 15% id, 10% ur, 10% other. Pass: p95 within SLO per locale.
- **search-typo-tolerance**: 30% queries with 1–2 char typos. Pass: zero-result < 10%.
- **search-autocomplete-flood**: keystroke bursts (8 chars @ 20 ms). Pass: p99 < 120 ms, no 429.

### 3.5 Recommendations
- **recs-cold-user**: new-user profiles, no history. Pass: p95 < 500 ms, ≥ 20 candidates returned.
- **recs-hot-user**: heavy history (500+ watches). Pass: p95 < 500 ms, diversity ≥ 8 channels.
- **recs-embedding-lookup** (M2+): vector query at target QPS. Pass: p95 < 150 ms.

### 3.6 Moderation
- **mod-video-flood**: 10k new videos in 10 min. Pass: decision p95 < 60 s, human queue < 500.
- **mod-abuse-report-storm**: 5k reports/min. Pass: no dropped reports, dedupe works.
- **mod-appeal-cycle**: end-to-end submit → decide → appeal → resolve. Pass: SLA ≤ 72 h simulated.

### 3.7 Analytics
- **analytics-ingest**: full event mix at milestone RPS. Pass: ingestion lag < 30 s, no drops.
- **analytics-dashboard**: 20 concurrent admin queries over 90-day window. Pass: p95 < 3 s.

### 3.8 Notifications
- **push-adhan-fanout**: 5 daily prayers × DAU across all timezones simulated in 10 min. Pass: drift < 30 s, success ≥ 98%.
- **push-digest-batch**: nightly digest to 30% DAU. Pass: complete within 2 h window.

### 3.9 Security
- **auth-credential-stuffing**: 100k login attempts/min from 10k IPs. Pass: WAF + rate limits block > 99%, no successful takeover.
- **rls-cross-user-fuzz**: automated attempts to read another user's data. Pass: 0 leaks (already covered by `tests/e2e/rls-cross-user.spec.ts`, extended for load).

### 3.10 Chaos
- **primary-failover**: kill primary DB. Pass: recovery < 60 s, no data loss.
- **region-outage**: black-hole one region. Pass: traffic re-routes < 30 s at M3+.

---

## 4. Milestone-specific pass gates

Before declaring a milestone "ready", the suites below must pass at the milestone's peak RPS × 1.5 for 30 min.

| Milestone | Required suites |
|---|---|
| **M1 (1M)** | db-writes-mixed, search-mixed-lang, recs-hot-user, mod-video-flood (1k), analytics-ingest, push-adhan-fanout |
| **M2 (10M)** | + db-connection-storm, cache-purge-storm, search-autocomplete-flood, recs-embedding-lookup, analytics-dashboard, auth-credential-stuffing |
| **M3 (50M)** | + regional-fanout, mod-abuse-report-storm, primary-failover, rls-cross-user-fuzz |
| **M4 (100M)** | + region-outage, all suites at 2× RPS |
| **M5 (500M)** | + multi-region active-active failover, federated search cutover drill, on-device push scheduler |

CI: `M1 + M2` suites run nightly against staging; `M3+` weekly; chaos drills monthly.

---

## 5. Alert routing

- Page (PagerDuty): SLO breach at "page threshold" or chaos test failure.
- Warn (Slack #heartify-ops): SLO breach at "alert threshold" or burn-rate 2×.
- Digest (email `minhazmoktar@gmail.com`): daily SLO summary + budget remaining.

All alerts flow through `production_alerts` table → `dispatch-alert` edge function (already implemented).
