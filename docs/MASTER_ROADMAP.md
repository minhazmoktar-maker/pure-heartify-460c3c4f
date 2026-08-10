# Heartify Master Roadmap

Status as of 2026-08-10. Phases are ordered by priority (P0 first). Nothing is marked done unless it was verified against the live system.

## Phase 0 — Audit — DONE
`docs/HEARTIFY_SYSTEM_MAP.md`, `docs/ARCHITECTURE_AUDIT.md`. Live counts queried, no estimates.

## Phase 1 — Stabilisation (autonomy repair) — DONE this cycle
- Channel discovery scheduled hourly (was unscheduled since 19 July).
- Candidate classification scheduled every 20 min, live mode.
- Orphan channel-id repair function + 30-min schedule.
- Review-backlog drain gated on approved channel + strict policy.
- Pipeline watchdog raising admin alerts.
- `pipeline_health()` for truthful reporting.

## Phase 2 — Backend ownership — IN PROGRESS
Keep the modular monolith. Portability work: all provider keys server-side (done), no secrets in client (audited), typed API boundary through edge functions (done for feed/search/recommendations). Extract a Node worker only on the trigger documented in the audit.

## Phase 3 — Content pipeline (P1)
Clear the 232k orphan backlog; verify enough channels to pass 1,000 trusted channels; raise ingestion throughput within quota; add per-key quota accounting in `api_usage`.

## Phase 4 — Moderation (P1)
Add real thumbnail classification and sampled frame checks; keep the tiered confidence model; expand the human queue SLA dashboard; never claim video-level guarantees from metadata alone.

## Phase 5 — Search & recommendations (P2)
Continue benefit-label ranking rollout; hold the 3-videos-per-creator cap on every surface including fallbacks; measure diversity per user in `/admin/feed-diversity`.

## Phase 6 — Social (P2)
Connections, challenges, pokes shipped. Next: abuse controls at scale, privacy-default review, k-anonymity checks on all admin charts.

## Phase 7 — Mobile (P1 for launch)
Capacitor is the chosen path (see `docs/MOBILE_ARCHITECTURE_DECISION.md` guidance in `LAUNCH_HANDOFF.md`). Remaining: signed release builds, Team ID + SHA-256 in the `.well-known` files, store metadata, data-safety answers.

## Phase 8 — Security (continuous)
Work through the linter backlog; keep RLS scoped to `authenticated`; rotate provider keys on schedule; keep cron tokens out of client code.

## Phase 9 — Performance (P2)
LCP work shipped. Next: cursor pagination audit on every infinite surface, cache-hit telemetry on feed RPCs.

## Phase 10 — Production launch
Release gates: build green, unit + e2e pass, no critical security findings, no moderation bypass, migrations tested, mobile builds signed, alerting live, rollback documented.

## Phase 11 — Growth
Referrals, shareable certificates, deep links, programmatic SEO landings — all shipped; measure conversion once real users exist.

## Phase 12 — Million-video infrastructure
Quota-bound, not code-bound. Requires additional API allowance and/or licensed sources, priority channel scheduling, and partitioning `curated_videos` when it passes ~2M rows.
