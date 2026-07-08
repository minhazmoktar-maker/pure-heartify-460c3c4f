# Channel Trust & Reputation System

Every approved channel carries a dynamic **trust profile** that captures its
moderation history, human overrides, AI confidence, user reports, category
consistency, upload cadence, and historical quality. The profile is the single
source of truth used by search ranking, recommendations, moderation
confidence, review priority, and homepage placement.

## Tables

| Table | Purpose |
|-------|---------|
| `channel_trust_profiles` | One row per `approved_channels`. Current score, risk level, and every counter contributing to it. |
| `channel_trust_events`   | Append-only audit log. Every score change writes an event with `delta`, `score_before`, `score_after`, `reason`, `source`, `actor_id`, and structured `metadata`. |
| `channel_trust_weights`  | Versioned, admin-editable weights + baseline + min/max clamps. Only the row with `is_active = true` is used. |

## Scoring Algorithm

`public.recompute_channel_trust(channel_id)` aggregates signals and produces
a score in `[min_score, max_score]` (default `[0, 100]`):

```
score = baseline
      + w_manual_approval       * manual_approvals
      + w_manual_rejection      * manual_rejections
      + w_ai_confidence         * (avg_ai_confidence - 50)
      + w_false_positive        * false_positive_events
      + w_false_negative        * false_negative_events
      + w_user_report           * user_report_events
      + w_category_consistency  * (category_share*100 - 50)
      + w_upload_frequency      * min(uploads_per_week, 20)
      + w_historical_quality    * (approval_rate*100 - 50)
      + w_strike                * strike_events
```

Risk level buckets the final score:

| Score | Risk |
|-------|------|
| ≥ 85 | `low` |
| 65 – 84 | `medium` |
| 40 – 64 | `high` |
| < 40 | `critical` |

Every recompute writes a `channel_trust_events` row of source `recompute`
carrying the exact inputs in `metadata`, which powers the dashboard's
"Reason for change" column.

## Configurable Weights

Weights, baseline, min/max, and decay half-life are stored in
`channel_trust_weights`. Admins can insert a new version and mark it
`is_active = true` to hot-swap the algorithm without a deploy. Because
weights are versioned, every historical decision can still be interpreted
against the algorithm that produced it (see `metadata.weights_version`).

## Effects on the platform

| Consumer | How trust is used |
|----------|-------------------|
| **Moderation** (`reputationStage`) | Trusted-tier channels short-circuit toward `pending_review` with elevated confidence; critical-risk channels are forced into human review. |
| **Search** (`search_videos`) | `is_trusted_channel` boost is now derived from `trust_score ≥ 75`. Ranking multiplies the FTS score by `trust_score / 100`. |
| **Recommendations** (`hybridRules`) | `trusted_channel` and `channel_affinity` reasons are weighted by `trust_score`. Critical channels are excluded from cold-start pools. |
| **Homepage / Sections** | Sections requesting "featured" content prefer channels with `trust_score ≥ 85`. |
| **Review priority** | The admin review queue is ordered by ascending `trust_score` so the riskiest content is triaged first. |

## Recompute Cadence

- On-demand via `POST /functions/v1/recompute-channel-trust` with
  `{ channel_id }` (admin JWT) or `{ all: true, limit }` (cron token).
- Nightly batch: schedule `recompute-channel-trust` with `{ all: true }` via
  `pg_cron` + `pg_net`. The batch is staleness-ordered so the oldest
  profiles refresh first.

## Extending the model

- Add a signal: extend `channel_trust_profiles`, aggregate it inside
  `recompute_channel_trust`, add a weight column to
  `channel_trust_weights`, and bump the version.
- Add a source type: extend the `trust_event_source` enum. Historical rows
  keep working because `channel_trust_events.metadata` is `jsonb`.
- Swap the algorithm entirely: create a new active weights row with the
  new coefficients. The public interface (`recompute_channel_trust`) does
  not change, so downstream services keep working.
