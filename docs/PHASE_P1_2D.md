# Phase P1.2D — Confidence-tiered moderation pipeline

Goal: cut manual channel review by 80–95% without weakening any halal
rule. Every candidate is scored, placed in one of four tiers, and
reviewed at the tier's speed. Every decision is explainable and
reversible.

## Tier model

| Tier | Confidence | Action | Review target |
| --- | --- | --- | --- |
| A | 98–100 + institution match + zero flags + subs≥10k | auto-approve | none |
| B | 90–97 | fast card review | 5–10 s |
| C | 70–89 | full review | ~1 min |
| D | <70 or any hard-block | auto-reject / quarantine | none (2-admin override to promote) |

**Hard blocks** (any → tier D regardless of confidence): exclusion
keyword hit, music signal, female-presenter signal, `duplicate_risk =
high`. These bars are baked into `public.compute_candidate_tier` and
cannot be lowered by AI, learned weights, or admin config.

## Data model

New columns on `channel_candidates`: `tier`, `tier_reason`, `auto_action`,
`moderation_summary`, `risk_score`, `cluster_id`, `learned_weight_version`,
`summary_generated_at`.

New tables (all admin-only RLS, standard 4-step GRANT pattern):

- `trusted_institutions` — pattern-based org allowlist (universities,
  ministries, waqf, academies). Match → tier-A eligibility.
- `verified_scholars` — hand-curated scholar identities.
- `moderation_learned_signals` — running approvals / rejections /
  reverts per feature; normalized weight bounded to `[-0.25, +0.25]`.
- `moderation_clusters` — bulk groups keyed by
  `(language, topic, organization_type)`.
- `channel_moderation_decisions` — reversible audit trail for every
  automated and manual action.

Helper: `public.compute_candidate_tier(confidence, dup_risk,
exclusion_hits, music_signal, female_signal, institution_match, subs)`
— IMMUTABLE, `SECURITY INVOKER`, EXECUTE revoked from `anon`.

## Edge functions

| Function | Purpose |
| --- | --- |
| `moderate-channel-summary` | AI-generated structured summary (topics, presenter, music, halal flags, recommended tier). Uses Lovable AI `google/gemini-3.5-flash`. Admin JWT or cron secret. |
| `batch-classify-candidates` | Reads pending candidates, computes tier + cluster, executes tier-A auto-approve and tier-D auto-reject when `dry_run=false`. Runs after every discovery tick. |
| `bulk-moderate-candidates` | Bulk approve / reject / escalate / revert for an explicit ID list or an entire `cluster_id`. Feeds active learning. Never approves a tier-D candidate (hard-block guard). |

## Safeguards (unchanged, reinforced)

- Halal exclusion keywords, duplicate check, music heuristic, female-
  presenter heuristic — all still hard-blocking regardless of tier.
- Learned weights can only tighten (raise thresholds), never soften.
- Tier-A allowlist is admin-curated; discovery cannot self-promote.
- Every auto-approval writes a reversible row to
  `channel_moderation_decisions`; revert restores prior status and
  removes from `approved_channels`.
- Tier-D promotion requires an admin acting through the UI; the
  `escalate` action moves it back to `pending` for full review.

## Rollout

1. Ship schema + registries (migration applied).
2. Ship AI summary + batch classifier in dry-run
   (`MODERATION_DRY_RUN=true`, default). Writes tier + summary but does
   not auto-act.
3. Ship admin UI at `/admin/channel-pipeline` — run 3–7 days in dry-run
   to calibrate.
4. Flip `MODERATION_DRY_RUN=false` to enable tier-A auto-approve and
   tier-D auto-reject.
5. Weekly `retrain-moderation-weights` cron once ≥500 moderator
   decisions have been recorded.

## Expected impact

At the current ~800–1500 hits/day discovery volume:

- Tier A auto-approve ≈ 10–15% → 0 review time.
- Tier D auto-reject ≈ 40–55% → 0 review time.
- Tier B fast review (5–10 s each) ≈ 25–35%.
- Tier C full review ≈ 5–10%.

Total moderator time drops to ~10–20% of the previous baseline while
every halal invariant remains in force.
