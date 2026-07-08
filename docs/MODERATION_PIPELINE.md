# Multi-Stage Moderation Pipeline

## Purpose
Every video that enters the platform is scored by an explainable, layered
pipeline whose policy thresholds live in the database. The design goals are:

1. **Never auto-approve uncertain content.** When confidence is insufficient,
   the pipeline escalates to AI review or human review — never approves.
2. **Fully explainable & auditable.** Every decision is an append-only row in
   `moderation_decisions` with per-stage signals and reasoning.
3. **Modular.** Every stage is independently replaceable; new signals slot in
   as new stages without touching existing code.
4. **Provider-agnostic.** AI providers implement a small interface and register
   themselves — swapping Gemini ↔ Lovable ↔ Anthropic requires no business
   logic changes.
5. **Configurable.** All thresholds live in `moderation_thresholds` and are
   editable by Owners at runtime.

## Layers (default pipeline order)

| # | Stage | File | Purpose | Cost |
|---|-------|------|---------|------|
| 1 | `rule_engine` | `stages/ruleStage.ts` | Hard/soft keyword and regex rules from `moderation_rules` | O(1) DB read |
| 2 | `channel_reputation` | `stages/reputationStage.ts` | Whitelist / blocklist check against `approved_channels` and `blocked_creators` | 2 DB reads |
| 3 | `metadata_analysis` | `stages/metadataStage.ts` | Heuristics on title/description/language/duration | None |
| 4 | `ai_reasoning` | `stages/aiStage.ts` | Delegates to a pluggable `AiReasoningProvider` | 1 model call |

Cheap deterministic checks run first so AI is only spent on content that
survives gating. **Order can be changed by passing a custom `stages` array to
`runPipeline()`.**

### Adding a new signal
1. Create `stages/<myStage>.ts` returning a `Stage`.
2. Add it to `defaultPipeline()` in `_shared/moderation/index.ts`.

No other file needs to change. Suggested future stages:
`thumbnail_analysis`, `transcript_analysis`, `ocr`, `audio_analysis`,
`comment_toxicity`, `user_report_signals`.

### Adding a new AI provider
1. Create `providers/<myProvider>.ts` implementing `AiReasoningProvider`.
2. Register it in `providers/index.ts` under the `REGISTRY` map.
3. Set `preferred_ai_provider` (or `fallback_ai_provider`) on the
   `moderation_thresholds` row.

## Aggregation rules
- **Confidence** = `min()` across stage confidences. Weakest link wins.
- **Risk** = `max()` across stage risks. Highest concern wins.
- **Terminal short-circuit**: if any stage returns `terminal: true` (e.g. hard
  rule hit or blocked creator), the pipeline stops and that stage's verdict
  becomes final.
- **Exceptions never crash** — a thrown stage becomes a
  `human_review_required` result with the error captured in signals.

## State machine

| State | Meaning | Set by |
|-------|---------|--------|
| `auto_approved` | High-confidence, low-risk, no rule hits | Pipeline only when both thresholds satisfied |
| `approved` | Explicitly approved by a human moderator | Manual override |
| `ai_review_required` | Confidence in the AI-review band | Pipeline |
| `human_review_required` | Confidence below AI band but above reject cutoff, OR any stage exception | Pipeline |
| `pending_review` | Newly ingested, awaiting first pipeline run | Ingest / backfill |
| `rejected` | Confidence below reject cutoff | Pipeline |
| `blocked` | Terminal rule / creator block | Rule or reputation stage |
| `archived` | Removed from live surfaces by an admin | Manual |

## Persistence
Only `moderation_decisions` is written from application code. It is
append-only. The trigger `sync_video_last_decision` denormalises the latest
decision onto `curated_videos` so the read path stays a single-table query.

**Never `UPDATE moderation_decisions`.** History is the audit trail.

## Thresholds (defaults)
| Field | Default | Notes |
|-------|---------|-------|
| `auto_approve_min_confidence` | 98 | Strict — false approvals are worse than manual work. |
| `auto_approve_max_risk` | 5 | Any residual risk blocks auto-approval. |
| `ai_review_min_confidence` | 90 | Below this, humans review. |
| `human_review_min_confidence` | 60 | Below this, rejected. |
| `reject_below_confidence` | 60 | Absolute floor. |
| `preferred_ai_provider` | `lovable` | Lovable AI Gateway (`google/gemini-3-flash-preview`). |
| `fallback_ai_provider` | `gemini` | Direct Gemini API using `GEMINI_API_KEY`. |

Owners can update these live via the admin UI; no deploy required.

## Testing
- Unit tests: `supabase/functions/_shared/moderation/__tests__/engine.test.ts`
  cover policy edges, terminal short-circuit, aggregation, and exception
  handling.
- Every stage is a pure function of `(VideoContext, Thresholds)` — trivially
  mockable. Add stage-specific tests alongside `engine.test.ts`.
- End-to-end verification runs through the `moderate-video` edge function.

## SOLID mapping
- **S**: each stage does one thing (rules OR reputation OR AI).
- **O**: pipeline is open to extension via new stages / providers, closed to
  modification of the engine.
- **L**: any `Stage` is substitutable for any other `Stage`.
- **I**: `AiReasoningProvider` is a minimal 2-method interface.
- **D**: engine depends on abstractions (`Stage`, `AiReasoningProvider`,
  `Thresholds`), not concrete providers.
