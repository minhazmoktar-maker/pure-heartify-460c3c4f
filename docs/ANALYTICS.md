# Analytics BI Platform

Aggregate-only analytics for admins/owners. **Raw user rows never leave the database** — every RPC returns pre-aggregated JSON or count-only rows.

## Metrics

| Panel | Function |
|-------|----------|
| DAU / WAU / MAU | `analytics_active_users(from, to)` — rolling windows computed over event history |
| Retention | `analytics_retention(cohort_from, weeks)` — weekly signup cohorts × week-offset matrix |
| Session duration | `analytics_session_stats(from, to)` — sessions with ≥2 events, avg + median span |
| Search success | `analytics_search_stats(from, to)` — total, zero-result rate, CTR, top queries |
| Recommendation CTR | `analytics_recommendation_stats(from, to)` — impressions/clicks/conversions + daily series |
| Daily Dose completion | `analytics_dose_stats(from, to)` — dose users vs completions/day |
| Favorites growth | `analytics_favorites_stats(from, to)` — new + cumulative |
| Watch trends | `analytics_watch_stats(from, to)` — daily watches, top channels |
| Moderation accuracy | `analytics_moderation_stats(from, to)` — decisions/state, FP/FN, manual override count |
| AI confidence | `analytics_ai_confidence_histogram(from, to)` — 10-point buckets |
| Channel growth | `analytics_channel_growth(from, to)` — new channels/day + trust risk pie |
| Category popularity | `analytics_category_popularity(from, to)` — watches vs searches by category |
| Engagement | `analytics_engagement(from, to)` — active users, avg + p50/p90/p99 events per user |
| Geographic | `analytics_geo_distribution(from, to)` — country codes only, no IPs |
| Device / platform | `analytics_device_stats(from, to)` — device / platform / viewport pulled from event `properties` |
| Performance | `analytics_performance(from, to)` — client-reported `latency_ms` percentiles |

## Architecture

- **On-demand aggregation** through `security definer` RPCs guarded by an internal `_analytics_assert_admin()` check. Every RPC does `PERFORM public._analytics_assert_admin()` before any query.
- **Admin only** — `REVOKE ALL FROM public` + `GRANT EXECUTE TO authenticated`, plus the runtime role check. Anonymous callers get `forbidden`.
- **Privacy**: no IPs, no user emails, no per-user rows leave the DB. Geo uses opt-in `properties.country` codes the client sets. Session IDs are opaque.
- **Scalability**: existing indexes on `analytics_events(event_name, created_at)`, `(user_id, created_at)`, `recommendation_events(created_at)`, `search_queries(created_at)` back every panel. When volume grows, add materialized-view rollups (e.g. `analytics_daily_metrics`) refreshed hourly by `pg_cron` and swap the RPC body — the public signature stays stable so the dashboard doesn't change.
- **Interactive filtering** in the dashboard: `from` / `to` date pickers re-run every RPC in parallel; each panel exports its underlying series as CSV via a one-click download button.
- **Historical trends** driven by long-form time-series returned by each function (no lossy pre-aggregation on the client).

## Instrumenting new signals

1. Emit a client event: `track("perf", { latency_ms, viewport, country, device, platform })`. The `analytics_events.properties` JSONB accepts arbitrary fields, so adding a signal is a one-line change.
2. Add or extend an RPC using the same `PERFORM public._analytics_assert_admin()` guard and `security definer` pattern.
3. Wire a panel in `src/pages/Analytics.tsx` — copy an existing `<Panel>` and point it at the new RPC.

## Access

Route: `/admin/analytics`. Anyone signed in without `admin` / `owner` role sees "Admins only". No public analytics surface.
