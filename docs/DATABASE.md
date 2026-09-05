# Database

Postgres (Supabase). 325 SQL migrations in `supabase/migrations/`, applied in
filename order. Every table in `public` has RLS enabled plus explicit
`GRANT`s; anonymous access is granted only where a policy allows it.

## Core domains

**Corpus / moderation**
- `videos` — canonical catalog. Key serving columns: `status`, `halal_score`,
  `visual_state` (`clean` / `unchecked` / `flagged`), `content_language`,
  `language_confidence`, `duration_seconds`, `embeddable`, `is_premium_only`.
- `channels`, `channels_state`, `channel_trust` — trust tiers (A/B/C) and
  institutional co-signatures feeding trust rank.
- `moderation_events`, `moderation_backlog`, `video_unplayable_reports`,
  `ingest_dlq` — audit trail, retry queue, dead-letter queue.

**Users**
- `profiles`, `user_roles` (separate table, checked via `has_role()` security
  definer — never a role column on profiles), `user_preferences`,
  `user_language_prefs`, `entitlements`.
- `watch_history`, `favorites`, `benefit_outcomes` ("was this worth it?"),
  `video_feedback` (negative signals).

**Social / retention**
- `follows`, `connections`, `notifications`, `push_subscriptions`,
  `streaks`, `khatm_groups`, `live_sessions`, `live_session_participants`,
  `certificates`.

**Ranking support**
- `video_embeddings` (semantic dedupe), `concept_graph`, `sections`,
  `leaderboards`, `search_phrases`, `search_queries`.

## Serving predicates

A video is servable only when: `status = 'approved'` AND
`visual_state = 'clean'` AND `halal_score >= 70` AND `embeddable`. The strict
Halal floor (no music, no female presence) is enforced in three independent
layers: ingestion classifiers, database triggers, and the retrieval RPCs.

## Key RPCs

`get_feed`, `get_shorts_feed`, `get_shorts_recommended`, `return_digest`,
`search_videos`, `autocomplete_phrases`, `has_role`, `recompute_channel_trust`,
`escalate_visually_unsafe_channels`. Privileged RPCs are restricted to
`authenticated` or `service_role`.

## Scheduled jobs (`pg_cron`)

Ingestion, per-language verification (Bangla + 10 more), visual safety sweep
(15 min), corpus health monitor, rejection recovery (hourly), push dispatch,
leaderboard refresh, retention purge. See `docs/RUNBOOK_SWEEPS.md`.

## Backups / restore

Supabase automated daily backups plus PITR on paid tiers. To move off Lovable:
`pg_dump` the database, restore into any Postgres 15+, re-apply
`supabase/migrations` for schema parity, then redeploy functions.
See `docs/EXIT_LOVABLE.md`.
