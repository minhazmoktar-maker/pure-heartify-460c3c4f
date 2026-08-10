# Heartify System Map

Measured on 2026-08-10 from the live repository and live database. All numbers are queried, none estimated.

## Frontend
- React 18 + Vite 5 + TypeScript, Tailwind + shadcn, React Router 6, React Query 5, Framer Motion, Sentry.
- 624 files in `src/`, 221 pages, 184 components, ~105 routes registered in `src/App.tsx`.
- Mobile shell already present: Capacitor 8 (`@capacitor/ios`, `@capacitor/android`, push, haptics, local notifications), PWA via `vite-plugin-pwa`.

## Backend
- Lovable Cloud (Supabase): Postgres + Auth + Storage + 54 edge functions + `pg_cron`/`pg_net`.
- 211 SQL migrations. ~190 public tables, ~200 database functions.
- Edge function groups: ingestion (`ingest-videos`, `discover-channels`, `sample-channel-videos`), moderation (`moderate-video`, `batch-classify-candidates`, `recheck-approved-channels`, `moderate-channel-summary`), serving (`feed`, `surfaces`, `search`, `recommendations`), growth (`send-push`, `personalized-push`, `notify-*`), ops (`dispatch-alert`, `csp-report`, `retention-purge`, `gsc-sync`).

## Database (live counts, 2026-08-10)
| Metric | Value |
|---|---|
| Total videos | 406,402 |
| Approved / auto-approved | 171,254 |
| Pending review | 228,741 |
| Rejected | 6,407 |
| Videos with no resolved channel id | 232,439 |
| Distinct resolved channel ids | 310 |
| Approved channels | ~191 active |
| Channel candidates (pending) | 1,424 |
| Attestation records | 182,581 |
| Registered profiles | 11 |
| Added last 24h / 7d / 30d | 2,146 / 67,094 / 147,140 |

## Authentication
Supabase Auth (email + Google), MFA enrol/verify pages, `user_roles` table with `has_role()` security-definer checks, admin routes guarded client- and server-side.

## Content pipeline
`discovery_seeds` + `discovery_topic_queries` → `discover-channels` → `channel_candidates` → `batch-classify-candidates` (tier S/A/B/C/D) → `verify-channel` → `approved_channels` → `ingest-videos` (uploads playlist pagination) → `curated_videos` → moderation stages → feeds.

## Moderation
Layered: rule stage (multilingual keyword/`_inappropriate_pattern`), channel reputation stage, metadata stage, AI stage (Gemini via Lovable AI), visual columns (`visual_state`, `visual_confidence`), human queue via `/admin/channel-pipeline`, appeals at `/appeals`. Zero-female / zero-music enforced by DB triggers plus a 30-minute sweep.

## Search / recommendations
Postgres FTS (`search_tsv`) + embeddings columns, `get_feed_candidates_diversified`, MMR reranking, `user_taste_profiles`, `feed_impressions` penalties, benefit priors (`benefit_priors_v1`), experiments + feature flags.

## Scheduled automation (`cron.job`, 18 active)
Ingestion every 15 min, discovery-mode ingest hourly, taste profiles 15 min, sections daily, halal re-audit nightly, inappropriate sweep 30 min, ops alerts 10 min, GSC hourly, attestation backfill 10 min, benefit labels daily, plus the four jobs added today (channel discovery, candidate classification, channel-id repair, pipeline watchdog).

## Testing
Vitest unit/component tests (14 files) + Playwright e2e (16 specs incl. RLS cross-user, halal-only surfaces, moderation pipeline, roles).

## Deployment
Lovable hosting for web (`pure-heartify.lovable.app`), Capacitor for store builds, GitHub Actions for CDN warmup, Sentry for errors, CSP report endpoint.
