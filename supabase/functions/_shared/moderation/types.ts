/**
 * Domain types for the multi-stage moderation pipeline.
 *
 * These types are the ONLY contract between:
 *   - the engine (orchestrator)
 *   - individual stages (rule, reputation, metadata, ai, ...)
 *   - AI provider adapters (lovable, gemini, ...)
 *   - the persistence layer (moderation_decisions table)
 *
 * They intentionally know nothing about YouTube, Supabase, or any provider.
 * That is what makes new signals (thumbnail, transcript, OCR, comments,
 * user reports, ...) pluggable — a new stage only has to return a
 * `StageResult` and it slots into the pipeline.
 */

export type ModerationState =
  | "approved"
  | "auto_approved"
  | "pending_review"
  | "ai_review_required"
  | "human_review_required"
  | "rejected"
  | "blocked"
  | "archived";

export type ModerationStage =
  | "ingest"
  | "rule_engine"
  | "channel_reputation"
  | "metadata_analysis"
  | "ai_reasoning"
  | "human_review"
  | "recheck"
  | "manual_override";

/** Input passed into the pipeline. Extend freely — new fields never break stages. */
export interface VideoContext {
  video_id: string;
  title: string;
  description?: string | null;
  channel_id?: string | null;
  channel_title?: string | null;
  tags?: string[];
  category?: string | null;
  language?: string | null;
  duration_seconds?: number | null;
  published_at?: string | null;
  // Room for future signals — stages that don't understand them ignore them.
  thumbnails?: string[];
  transcript?: string | null;
  extra?: Record<string, unknown>;
}

export interface RuleHit {
  rule_id?: string;
  name: string;
  kind: string;
  severity: "hard" | "soft";
  matched: string;
}

/**
 * A single stage's verdict.
 * - `state`: the strongest state this stage wants to enforce (may be overridden downstream if higher priority).
 * - `confidence` / `risk`: 0-100 signals aggregated by the engine.
 * - `signals`: opaque diagnostic data preserved for auditability.
 * - `terminal`: if true, the engine stops after this stage (e.g. hard rule hit).
 */
export interface StageResult {
  stage: ModerationStage;
  state: ModerationState;
  confidence?: number;
  risk?: number;
  provider?: string;
  reasoning?: string;
  signals?: Record<string, unknown>;
  rule_hits?: RuleHit[];
  terminal?: boolean;
}

/** Configuration thresholds — loaded from the DB, never hard-coded in stages. */
export interface Thresholds {
  auto_approve_min_confidence: number;
  auto_approve_max_risk: number;
  ai_review_min_confidence: number;
  human_review_min_confidence: number;
  reject_below_confidence: number;
  preferred_ai_provider: string;
  fallback_ai_provider: string;
}

/** Aggregated pipeline outcome persisted as ONE moderation_decisions row. */
export interface PipelineOutcome {
  video_id: string;
  final_state: ModerationState;
  final_stage: ModerationStage;
  confidence: number;
  risk: number;
  provider?: string;
  reasoning: string;
  signals: Record<string, unknown>;
  rule_hits: RuleHit[];
  stage_results: StageResult[];
}

/**
 * A moderation stage.
 * Implementations must be side-effect free (no DB writes) — the engine owns
 * persistence. This keeps each stage independently testable and replaceable.
 */
export interface Stage {
  name: ModerationStage;
  run(ctx: VideoContext, thresholds: Thresholds): Promise<StageResult | null>;
}

/**
 * Pluggable AI reasoning provider.
 * Adding a new provider (Anthropic, OpenAI, local model, ...) means implementing
 * this interface and registering it in `providers/index.ts` — no business
 * logic changes.
 */
export interface AiReasoningProvider {
  name: string;
  analyze(ctx: VideoContext): Promise<AiVerdict>;
}

export interface AiVerdict {
  confidence: number; // 0-100 = how confident the content is halal/safe
  risk: number;       // 0-100 = risk of harm
  category?: string;
  reasoning: string;
  flags?: string[];
  raw?: unknown;
}
