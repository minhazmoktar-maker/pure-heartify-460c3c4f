
# Phase P1 — Ultimate Execution Plan

Phase P1 as written spans ~7 major workstreams that together represent 2–3 months of production engineering. Shipping it as one atomic change would either be shallow across everything or drop existing features by accident. To honor the "do not remove any existing features" and "no moderation bypasses" constraints, I will ship it as **5 sequential sub-phases**, each independently verifiable, each preserving all prior behavior.

Below is what each sub-phase delivers. I will start P1.1 immediately after you approve this plan, and return for a go-ahead between sub-phases so you can catch regressions early.

---

## P1.1 — Creator Discovery Pipeline (Content Scale)

Goal: continuously grow approved channels toward 50k+ without weakening moderation.

- New edge function `discover-channels` (scheduled via `pg_cron`) that walks the YouTube graph from every `approved_channels` row:
  - Featured channels, subscriptions (where public), related-channel signals from top videos, collaborators surfaced in descriptions, playlist owners.
- New table `channel_discovery_queue` (candidate URL/ID, source_channel_id, discovery_method, priority_score, halal_topic_hint, dedup key via `compute_owner_key`, status enum: `queued|processing|approved|rejected|duplicate|needs_owner_review`).
- Discovery reuses the **existing** `verify-channel` pipeline verbatim — no shortcut path. Auto-approval remains impossible; every candidate lands in the owner review queue.
- Priority scoring boosts the halal topic list you enumerated (Islamic, education, science, business, history, medicine, etc.) via keyword + language classifier.
- Quota safety: token-bucket in `rate_limit_counters`, hard daily cap, graceful degrade when quota exhausted.
- Admin UI (`/admin/discovery`) to review the queue with bulk approve/reject and one-click "run full moderation now".

## P1.2 — Feed Ranking v2 (Content Variety)

Goal: no repetition, high diversity, every refresh feels fresh.

- Extend `hybridRules.ts` with:
  - **Creator rotation window**: per-user 7-day exposure decay so recently-shown channels are down-weighted.
  - **Long-tail booster**: inverse-frequency weight for creators under-served in the last 30 days.
  - **Topic/age/language/region rotation**: soft caps per page (already partial for channel/category — extend to topic + language + upload-age bucket).
  - **Anti-repeat memory**: persistent `recommendation_events` lookup (already exists) to hard-exclude any video shown in last 14 days for signed-in users.
- New "Hidden Gems" section wired to `idx_curated_videos_hidden_gems` (added last turn).
- "Fast growing creators" surface backed by channel-trust delta over 30 days.

## P1.3 — Reliability Audit & Fixes

Goal: nothing silently fails.

- Automated sweep script (`scripts/reliability-audit.mjs`) that grep-scans for:
  - `<button>` / `onClick` handlers that are empty, `TODO`, or reference undefined functions.
  - Router `<Link>` targets not present in route table.
  - `supabase.functions.invoke` calls whose function doesn't exist in `supabase/functions/`.
  - Mutations without error toast/handler.
- Playwright suite `tests/e2e/reliability.spec.ts` clicking every primary CTA on every route and asserting no console error + no unhandled promise rejection.
- Fix every finding surfaced by the sweep (batched per-route in the sub-phase).

## P1.4 — Performance Pass

Goal: instant on mid-range Android.

- React Query: raise `staleTime` on read-mostly queries, dedupe with `queryKey` audit, add `placeholderData: keepPreviousData` for paginated feeds.
- Render: memoize `YouTubeVideoCard`, wrap `InfiniteVideoGrid` in `react-window` (virtualization) for lists > 60 items.
- Bundle: route-level `lazy()` for `/admin/*`, `/mushaf`, `/shorts`, `/creator/*` (heavy, low-traffic).
- Images: enforce `loading="lazy"`, `decoding="async"`, `sizes` attribute on all thumbnails; preconnect to `i.ytimg.com`.
- DB: EXPLAIN top 10 slowest queries via `supabase--slow_queries`, add missing indexes.
- Edge: increase in-process TTL cache hit ratio for anonymous feed (already scaffolded).

## P1.5 — Halal Intelligence Hardening

Goal: strictest platform in the world, without false positives.

- Two-tier moderation: existing keyword+AI pipeline unchanged; add a **secondary re-review job** (`recheck-approved-channels` on daily `pg_cron`) that samples 1% of trusted-channel uploads for re-moderation and flags drift.
- Channel trust score refinements: incorporate report_rate, appeal-loss rate, and moderation-override history.
- Thumbnail moderation: forward thumbnail URL to existing vision-moderation path in `moderate-video` (already imports it — extend to also score thumbnails for new videos, not just titles).
- Appeal workflow: ensure every rejected candidate from P1.1 can trigger an owner appeal review — reuse `appeals` table.

---

## What ships in P1.1 (starting immediately on approval)

1. Migration: `channel_discovery_queue` table + indexes + RLS + GRANTs.
2. Edge function: `discover-channels` (graph crawl, dedup, enqueue).
3. Edge function extension: `verify-channel` invoked from the queue.
4. Cron: `pg_cron` schedule every 6h with quota guard.
5. Admin UI: `/admin/discovery` page with queue table, filters, bulk actions.
6. Zero changes to existing moderation thresholds or auto-approval (there is no auto-approval).

## Guardrails held across every sub-phase

- No feature removed, no route deleted, no moderation rule loosened.
- Every new table has explicit `GRANT` + RLS from day one.
- Every new edge function validates JWT + rate-limits + surfaces provider errors verbatim.
- Kids Mode, Age Gate, blocklist, and trusted-channel gating remain authoritative.

Approve to proceed with P1.1, or tell me to reorder or expand any sub-phase.
