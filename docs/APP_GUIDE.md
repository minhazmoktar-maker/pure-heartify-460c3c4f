# Heartify — A–Z App Guide

A single reference for how Heartify is built, deployed, and operated. Written for owners, admins, and future contributors.

---

## A. What Heartify is

Heartify is a **curated, distraction-free video and audio app** focused on Islamic-friendly content. Users get a "Daily Dose" of vetted videos, a personalized feed, reciter search, and audio playback. Admins moderate content, manage channels, and monitor platform health.

- Web app: PWA installable, mobile-first design.
- Backend: Lovable Cloud (Postgres + Auth + Edge Functions + Storage).
- Content source: YouTube via ingestion + trust scoring.

## B. Tech stack

| Layer      | Choice |
|-----------|--------|
| Framework  | React 18 + Vite 5 + TypeScript |
| UI         | shadcn/ui + Tailwind CSS 3 + Radix primitives |
| State      | TanStack Query, React context (Auth, Player, Theme, Locale) |
| Router     | react-router-dom v6 |
| Backend    | Lovable Cloud (Supabase-managed Postgres, Auth, Edge Functions) |
| PWA        | vite-plugin-pwa (Workbox) |
| Tests      | Vitest + React Testing Library, Playwright for E2E |

## C. Repository layout

```text
src/
  pages/                Route components (see M. Routes)
  components/           Shared UI + admin widgets
  contexts/             AuthContext, PlayerContext, ThemeContext, LocaleContext
  hooks/                useRole, useFavorites, useRequireAdminMfa, ...
  lib/                  permissions.ts, utils, feature helpers
  integrations/supabase Auto-generated client + types (DO NOT EDIT)
supabase/
  functions/            Edge functions (see O. Edge functions)
  migrations/           SQL migrations (append-only)
docs/                   This guide
```

## D. Design system

Semantic tokens live in `src/index.css` and `tailwind.config.ts`. Never hardcode `text-white`, `bg-[#...]`, etc. — use tokens (`bg-background`, `text-foreground`, `text-primary`, `bg-card`). Dark/light modes swap the token values.

Fonts: Space Grotesk (headings) + Inter (body), loaded via non-blocking `<link>` in `index.html`.

## E. Environments

- **Preview** — sandbox with its own Supabase project.
- **Published** — `https://pure-heartify.lovable.app` (custom domains not yet configured).

Cloud-managed secrets are attached per environment.

## F. Auth model

- Email/password + Google OAuth via Lovable Cloud Auth.
- Sessions stored client-side (Supabase JS). Refresh handled automatically.
- **MFA (TOTP)** — admins must enroll and sign in at AAL2 to reach `/admin/*` or `/owner`. Enforced client-side (`useRequireAdminMfa`) and server-side (RLS + `has_role`).
- No anonymous sign-ups.

## G. Roles and permissions

Three tiers stored in dedicated tables (never on profile):

| Tier      | Source table                     | Grants |
|-----------|----------------------------------|--------|
| user      | (default; no row)                 | own data only |
| admin     | `public.user_roles` (role='admin')| moderation + admin dashboards |
| owner     | `public.platform_owners`          | admin + destructive settings |

Helpers: `has_role(uid, role)`, `is_owner(uid)`, `has_min_role(uid, 'admin')`. Permission → surface map lives in `src/lib/permissions.ts` and is previewed on `/admin/permissions`.

## H. Database tables (short list)

Content: `curated_videos`, `approved_channels`, `channel_candidates`, `video_candidates`, `channel_trust_profiles`, `channel_trust_events`, `channel_trust_weights`, `blocked_creators`, `removed_videos`.

Users & activity: `profiles`, `user_roles`, `platform_owners`, `favorites`, `watch_history`, `audio_playback_positions`, `daily_dose`, `dose_completions`, `streaks`, `entitlements`, `referrals`, `user_interests`, `favorite_categories`, `user_locale_preferences`, `device_tokens`.

Moderation: `moderation_decisions`, `moderation_log`, `moderation_overrides`, `moderation_rules`, `moderation_thresholds`, `video_reports`, `audio_reports`, `report_moderation_actions`.

Operations: `analytics_events`, `search_queries`, `recommendation_events`, `attributions`, `rate_limit_counters`, `retention_policies`, `retention_purge_runs`, `privileged_actions_log`, `gsc_sync_snapshots`, `channels_state`, `ingestion_log`, `_internal_config`.

Reciters: `reciters`, `reciter_aliases`, `reciter_audio_sources`.

Every public table has explicit `GRANT`s and RLS. See `supabase/migrations/`.

## I. Row-Level Security policy pattern

- **Self-scoped tables** (favorites, watch_history, profiles) — `user_id = auth.uid()` in USING + WITH CHECK.
- **Admin-only tables** (moderation, audit, roles) — `has_role(auth.uid(),'admin') OR is_owner(auth.uid())`.
- **Public read** (curated_videos approved subset) — read allowed to anon, writes admin-only.
- **Attribution** — anon INSERT allowed (first-touch), UPDATE requires signed-in owner (tightened 2026-07-08).

## J. SECURITY DEFINER discipline

Any `SECURITY DEFINER` function that writes or exposes admin data MUST begin with an auth assertion — `_analytics_assert_admin()`, `is_owner(auth.uid())`, or per-row `auth.uid()` check. See `mem://security-memory` for the accepted list.

## K. Frontend contexts

- `AuthContext` — user, session, loading.
- `ThemeContext` — dark/light.
- `LocaleContext` — language selection, per-user + guest.
- `PlayerContext` — global audio/video player state (persists across route changes).

## L. Routing map

Wired in `src/App.tsx`. All non-critical routes are lazy-loaded.

## M. Routes

Public: `/`, `/watch/:videoId`, `/search`, `/section/:sectionId`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/about`, `/onboarding`, `/channels`.

Signed-in: `/profile` (tabs: profile, continue, favorites, history), `/security/mfa`, `/security/mfa/verify`.

Admin-gated (`AdminRoute` + AAL2): `/admin/console`, `/admin/moderation`, `/admin/audit`, `/admin/review`, `/admin/reports`, `/admin/entitlements`, `/admin/channel-trust`, `/admin/analytics`, `/admin/audio-integrity`, `/admin/roles`, `/admin/gsc`, `/admin/permissions`.

Owner-only: `/owner`.

## N. Admin surfaces

- `/admin/console` — landing dashboard, links to every admin tool.
- `/admin/review` — approve/reject queue, edit metadata, override AI.
- `/admin/moderation` — decision history.
- `/admin/reports` — user-submitted reports.
- `/admin/channel-trust` — trust scores, weights, recompute.
- `/admin/analytics` — engagement, retention, moderation KPIs.
- `/admin/roles` — grant/revoke admin, audit log.
- `/admin/entitlements` — premium plans, manual grant/revoke.
- `/admin/audio-integrity` — audio source checks.
- `/admin/gsc` — Google Search Console: connection, sitemap diff, sync panel, alerts.
- `/admin/permissions` — permission tester with route/file map and simulate-missing view.

## O. Edge functions

| Function                    | Purpose |
|-----------------------------|---------|
| `feed`                       | Personalized home feed |
| `recommendations`            | Ranked video recs |
| `search`                     | Full-text + trigram search |
| `search-backfill`            | Index warm-up |
| `generate-daily-dose`        | Nightly Daily Dose composer |
| `complete-dose-video`        | Marks a dose slot complete |
| `ingest-videos`              | Pulls new videos from approved channels |
| `verify-channel`             | Approves a channel candidate |
| `batch-verify-channels`      | Bulk channel verification |
| `recheck-approved-channels`  | Re-scans channels for policy drift |
| `moderate-video`             | AI + rules moderation |
| `recompute-channel-trust`    | Rebuilds trust score |
| `refresh-sections`           | Rebuilds curated sections |
| `submit-report`              | User content report |
| `notify-favorites`           | Push notifications for saved channels |
| `audio-integrity-check`      | Validates reciter audio sources |
| `redeem-referral`            | Applies referral rewards |
| `youtube-proxy`              | Proxied YT metadata for CSP compliance |
| `retention-purge`            | Runs `enforce_retention_policies()` |
| `audit-compliance`           | Compliance report generator |
| `admin-roles`                | Server-verified role mutations |
| `delete-account`             | GDPR account deletion |
| `log-privileged-action`      | Central audit sink |
| `gsc`                        | Google Search Console query/actions |
| `gsc-sync`                   | Scheduled GSC sync + sitemap snapshot |

All functions live in `supabase/functions/<name>/index.ts`. CORS via `npm:@supabase/supabase-js@2/cors`. Input validated with Zod. Auth verified in-code (JWT).

## P. Scheduled jobs (pg_cron)

- `gsc-hourly-sync` — runs `gsc-sync` every hour. Toggle from `/admin/gsc → Sync`.
- Retention purge, nightly re-audit sweep, and channel-trust recompute are triggered by SQL functions (`enforce_retention_policies`, `nightly_reaudit_sweep`, `recompute_all_channel_trust`).

Manage jobs: **More → Cloud → Jobs** in the Lovable editor.

## Q. Search & discovery

- Postgres `pg_trgm` + `unaccent` for fuzzy matching.
- Reciter search via `search_reciters()` (aliases + phoneme variants).
- Autocomplete: `search_autocomplete()`. Trending: `get_trending_searches()`.
- Category/tag facets served from `curated_videos.category` + `moderation_state`.

## R. Recommendations & Daily Dose

- Trending seed: `get_trending_video_ids()` window of 14 days.
- Personalization via `user_interests` + collaborative signals in `recommendation_events`.
- Daily Dose composed by the `generate-daily-dose` function and stored in `daily_dose`.

## S. Moderation pipeline

1. `ingest-videos` pulls candidates → `video_candidates`.
2. `moderate-video` scores with AI + rules → writes `moderation_decisions`.
3. Trigger `sync_video_last_decision` mirrors state to `curated_videos`.
4. Blocked creator patterns (`blocked_creators`) enforced by `enforce_blocked_creators` trigger.
5. Removed video IDs (`removed_videos`) rejected by `reject_removed_video` trigger.
6. Nightly sweep re-audits existing videos against updated blocklists.

## T. Trust scoring

`recompute_channel_trust(channel_id)` combines: manual approvals/rejections, avg AI confidence, false pos/neg, user reports, category consistency, upload frequency, historical approval rate, strikes. Weights configurable in `channel_trust_weights`. History logged to `channel_trust_events`.

## U. Analytics

Admin RPCs (all gated by `_analytics_assert_admin()`):
- `analytics_active_users`, `analytics_engagement`, `analytics_retention`
- `analytics_watch_stats`, `analytics_favorites_stats`, `analytics_dose_stats`
- `analytics_channel_growth`, `analytics_moderation_stats`, `analytics_recommendation_stats`
- `analytics_performance`, `analytics_session_stats`, `analytics_ai_confidence_histogram`
- `analytics_category_popularity`, `analytics_geo_distribution`

## V. Rate limiting

`rate_limit_increment(identity, action, bucket_at)` counts per-minute-bucket calls in `rate_limit_counters`. Called by edge functions before doing expensive work. `rate_limit_cleanup()` prunes old rows.

## W. Data retention

`retention_policies` rows drive `enforce_retention_policies()`:
- `analytics_events`, `search_queries`, `recommendation_events` cleaned by age.

Purge runs recorded in `retention_purge_runs` for audit.

## X. Referrals & entitlements

- `referrals` — inviter/invitee mapping + rewards.
- `entitlements` — plan + expiry; `has_active_premium(uid)` for gating.

## Y. Security posture

- MFA required for admin/owner routes.
- All destructive admin actions call `log-privileged-action` → `privileged_actions_log`.
- Attribution tampering by anon closed 2026-07-08.
- Extensions `pg_trgm`, `unaccent` intentionally in `public` (search requirement).
- Password HIBP check enabled — enforce in Cloud → Users → Auth Settings.
- See `mem://security-memory` for accepted risks.

## Z. Operations runbook

**Deploy** — automatic on file change. Publish from Lovable UI.
**Rotate Lovable API key** — Settings → connectors, or via `rotate_lovable_api_key` tool.
**Add an admin** — sign in as owner → `/admin/roles` → grant admin.
**Investigate a bad video** — `/admin/review` (search video_id) → override AI or add channel to `blocked_creators`.
**Fix a GSC sync failure** — `/admin/gsc → Sync → Run now`. Check last run status. Common causes: expired connector token → re-link the Google connection.
**Purge personal data (GDPR)** — user clicks Delete Account on `/profile` → `delete-account` edge function runs.
**Restore a removed video** — `/admin/review → Removed` tab (owner only).
**Change trust weights** — insert a new version in `channel_trust_weights` (is_active=true, previous version=false), then `recompute_all_channel_trust()`.

---

_Last updated: 2026-07-08._
