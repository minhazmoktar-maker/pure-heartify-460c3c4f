
# Confidence-Tiered Moderation Pipeline

Goal: scale channel moderation from 1-by-1 review to a 4-tier confidence pipeline with batch actions, AI-generated evidence, cluster review, and active learning — while preserving every existing halal rule and never lowering the approval bar.

## 1. Confidence tier model

Extend `channel_candidates` with:
- `tier CHAR(1)` — A/B/C/D
- `tier_reason TEXT[]` — human-readable evidence bullets
- `auto_action TEXT` — `auto_approved` | `queued_fast` | `queued_full` | `auto_rejected` | `quarantined`
- `moderation_summary JSONB` — AI + rules blob (topics, presenter, music, dup, similar approved)
- `risk_score INTEGER` (0–100, inverse of confidence + penalties)
- `cluster_id UUID` — bulk grouping key
- `learned_weight_version INTEGER` — active-learning generation used at scoring time

Tier gating (server-computed, immutable client-side):
```text
A  98–100  auto_approve   (strict allow-list of trusted org signals + zero flags)
B  90–97   fast_review    (~5-10s: summary card, 1-click approve/reject)
C  70–89   full_review    (existing manual UI)
D  <70     auto_reject / quarantine
```

Tier A requires ALL of: institution match (universities/gov/known scholar registry), zero exclusion hits, zero female-presenter signal, zero music signal, `duplicate_risk=low`, subs≥10k, channel age≥2y. Any single failure ⇒ demote to B.

## 2. Trust registries (new tables)

- `trusted_institutions` — regex/domain patterns for universities, ministries, waqf orgs (auto-Tier-A eligibility).
- `verified_scholars` — hand-curated scholar identity list; matches on name/handle/YouTube ID.
- `moderation_learned_signals` — active-learning weights per feature (topic, org, source, language).
- `moderation_clusters` — bulk grouping (owner-key prefix, topic, language, org).

All admin-only RLS + service_role, standard 4-step grant pattern.

## 3. AI moderation summary

New edge function `moderate-channel-summary`:
- Input: candidate row + YouTube snippet + latest 10 titles + thumbnails.
- Uses Lovable AI (`google/gemini-3.5-flash` for cost; escalate to `openai/gpt-5.4` for Tier B/C ambiguous cases).
- Structured output (Zod):
  ```
  { topics[], presenter_analysis, music_analysis, halal_flags[],
    confidence_breakdown{...}, duplicate_notes, similar_approved_ids[],
    recommend_tier, rationale }
  ```
- Writes to `channel_candidates.moderation_summary`.
- Called automatically after `discover-channels` enqueue and on-demand from admin UI.

## 4. Batch scoring & clustering

New edge function `batch-classify-candidates`:
- Runs over all `status=pending` in pages of 500.
- For each: recompute tier from current rules + learned weights, call `moderate-channel-summary` if missing, assign `cluster_id` via:
  - Same owner-key prefix (org family), OR
  - Same (language, primary_topic, org_type) triple.
- Auto-executes Tier A approvals and Tier D rejections; logs every action to `channel_audit_log` with `evidence` (fully reversible via existing pipeline).

## 5. Admin UI — `/admin/moderation`

New page with 4 tabs (A/B/C/D) plus Clusters view.

- **Tier A tab**: audit log of auto-approvals, one-click revert.
- **Tier B tab**: card list. Each card = channel + AI summary + 4 buttons (Approve / Reject / Escalate / Approve cluster).
- **Tier C tab**: full existing review UI.
- **Tier D tab**: quarantine list; requires 2-admin override to promote.
- **Clusters tab**: grouped list; "Approve all similar" / "Reject all similar" acts on entire `cluster_id`.
- **Bulk bar** (all tabs): multi-select + Approve 50–500 / Reject / Reassign tier.

Every action calls new edge function `bulk-moderate-candidates` (batches of ≤500, atomic per candidate, full audit).

## 6. Active learning

- On every moderator decision (approve/reject/revert), insert into `moderation_learned_signals` deltas:
  - +weight for features present on approvals, −weight on rejections.
- Weekly cron `retrain-moderation-weights` recomputes normalized weights (bounded −0.25..+0.25) and bumps `learned_weight_version`.
- Scorer blends baseline confidence with learned weights (learned weights can only **raise the bar**, never lower halal exclusions — hard-coded floor unchanged).

## 7. Safeguards (unchanged and reinforced)

- Halal exclusion keywords, duplicate check, female-presenter heuristic, music heuristic — all still hard-blocking regardless of tier or learned weights.
- Learned weights cannot promote a candidate past a hard-block.
- Every auto-approval reversible from Tier A log; reverting a Tier A also feeds negative signal into active learning.
- Tier A eligibility list itself is admin-curated (no self-promotion possible from AI or heuristics).

## 8. Technical scope

New files:
- `supabase/migrations/*` — schema + registries + RLS + grants.
- `supabase/functions/moderate-channel-summary/index.ts`
- `supabase/functions/batch-classify-candidates/index.ts`
- `supabase/functions/bulk-moderate-candidates/index.ts`
- `supabase/functions/retrain-moderation-weights/index.ts` (cron, weekly)
- `src/pages/admin/Moderation.tsx` + tab components
- `src/components/admin/ModerationSummaryCard.tsx`
- `src/components/admin/ClusterList.tsx`
- `src/hooks/useModerationQueue.ts`
- `docs/PHASE_P1_2D.md` — pipeline spec + reversal procedure.

Reuse:
- Existing `verify-channel` moderation gate (Tier A auto-approve still routes through it for the actual approval write).
- Existing `channel_audit_log`, `check_channel_duplicate`, `compute_owner_key`.
- Existing discovery cron — just triggers `batch-classify-candidates` at the end of each run.

Estimated review reduction (from your 25% baseline approval rate at ~800–1500 hits/day):
- Tier A auto-approve ~10–15% of hits → 0 review time
- Tier D auto-reject ~40–55% → 0 review time
- Tier B fast (5–10s each) → ~25–35%
- Tier C full review → ~5–10%
Total manual time ≈ 10–20% of current, meeting the 80–95% reduction target with no rule weakening.

## 9. Rollout

1. Ship schema + registries (migration).
2. Ship AI summary function + batch classifier (dry-run mode: writes tier/summary but does not auto-act).
3. Ship admin UI; run in dry-run for 3–7 days to calibrate.
4. Enable Tier A auto-approve + Tier D auto-reject.
5. Enable active learning cron after ≥500 moderator decisions collected.

Confirm and I'll implement in this order.
