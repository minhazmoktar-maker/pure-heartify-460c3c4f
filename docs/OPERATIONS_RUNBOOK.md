# Operations Runbook

## Daily

- `/admin/feed-quality` — diversity, novelty, benefit-rate dips (alerts fire
  automatically).
- Corpus health monitor — stuck/unchecked videos, ingestion DLQ depth.
- Edge function logs for 5xx spikes.

## Common incidents

**Feed empty or thin**
Check `videos` serving predicate counts (`status=approved`,
`visual_state='clean'`, `halal_score>=70`, `embeddable`). If `visual_state` is
mostly `unchecked`, the visual safety sweep is stalled — check
`visual-safety-sweep` logs and the AI provider key.

**Search returns nothing**
Verify the `search` function hydrates `visual_state` and `content_language`;
missing metadata makes strict assessment reject every hit (historical bug,
fixed). Smoke: POST `/functions/v1/search` with `{"q":"quran"}`.

**Ingestion stalled**
Usually YouTube quota. Add/rotate `YOUTUBE_API_KEY_2..6`. Check `ingest_dlq`
and the channel cooldown table.

**Push not delivering**
Check `VAPID_*` / `FCM_SERVER_KEY`, then the push dispatch cron and
`push_subscriptions` for stale endpoints (410 responses are pruned).

**AI features failing**
All AI calls resolve through `_shared/aiGateway.ts`. Set
`AI_GATEWAY_BASE_URL` + `AI_GATEWAY_API_KEY` to any OpenAI-compatible
provider and redeploy the affected functions.

**Moderation escalation**
`escalate_visually_unsafe_channels()` auto-blocks repeat offenders. Manual
review at `/admin/review`; unserved-video audit at `/admin/unserved-videos`.

## Routine tasks

- Deploy backend: `supabase functions deploy <name>`; migrations via
  `supabase db push`.
- Deploy frontend: build and publish static output (see `DEPLOYMENT.md`).
- Rotate secrets: update the Edge Function secret, redeploy consumers.
- Restore: latest backup + `supabase/migrations` (see `DATABASE.md`).

## Escalation

Security findings → `docs/SECURITY.md`. Store/native release steps →
`docs/STORE_READINESS_MATRIX.md`, `docs/WATCHOS_SETUP.md`.
