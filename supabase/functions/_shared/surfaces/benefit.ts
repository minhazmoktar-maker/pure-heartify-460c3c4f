// MVP-5 — Benefit-ranked feed.
//
// Heartify's objective is benefit per minute, measured by the T+7/T+30/T+90
// "was this worth it?" labels — never watch time. This module turns answered
// labels into per-channel / per-topic priors and re-ranks an already-retrieved
// pool so sources that people were glad they watched surface earlier.
//
// Rolled out behind the `feed.benefit_ranked` feature flag (default 10% of
// signed-in users) so the effect can be measured against the control arm.

import type { SurfaceVideo, SurfaceContext } from "./types.ts";
import { traceStep } from "./types.ts";

export interface BenefitPriors {
  global: number;
  sample_size: number;
  channels: Record<string, [number, number]>;
  categories: Record<string, [number, number]>;
}

const EMPTY: BenefitPriors = { global: 0.6, sample_size: 0, channels: {}, categories: {} };

let cached: { at: number; priors: BenefitPriors } | null = null;
const TTL_MS = 5 * 60 * 1000; // labels move slowly; 5 min is plenty fresh

export async function loadBenefitPriors(service: any): Promise<BenefitPriors> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.priors;
  try {
    const { data, error } = await service.rpc("benefit_priors_v1");
    if (error || !data) return EMPTY;
    const p: BenefitPriors = {
      global: typeof data.global === "number" ? data.global : Number(data.global) || 0.6,
      sample_size: Number(data.sample_size) || 0,
      channels: (data.channels ?? {}) as Record<string, [number, number]>,
      categories: (data.categories ?? {}) as Record<string, [number, number]>,
    };
    cached = { at: Date.now(), priors: p };
    return p;
  } catch {
    return EMPTY;
  }
}

/** Stable 32-bit hash → 0..99 bucket. Same user always lands in the same arm. */
export function rolloutBucket(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}

export interface BenefitRolloutFlag {
  enabled: boolean;
  percentage: number;
}

let flagCache: { at: number; flag: BenefitRolloutFlag } | null = null;

export async function loadBenefitFlag(service: any): Promise<BenefitRolloutFlag> {
  if (flagCache && Date.now() - flagCache.at < 20_000) return flagCache.flag;
  const fallback: BenefitRolloutFlag = { enabled: true, percentage: 10 };
  try {
    const { data, error } = await service
      .from("feature_flags")
      .select("enabled, kill_switch, rollout_percent, targeting_rules")
      .eq("key", "feed.benefit_ranked")
      .maybeSingle();
    if (error || !data) return fallback;
    const rules = (data.targeting_rules ?? {}) as Record<string, unknown>;
    const pctRaw = data.rollout_percent ?? rules.rollout_percentage ?? 10;
    const pct = Number(pctRaw);
    const flag: BenefitRolloutFlag = {
      enabled: data.kill_switch !== true && data.enabled !== false,
      percentage: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 10,
    };
    flagCache = { at: Date.now(), flag };
    return flag;
  } catch {
    return fallback;
  }
}

/** Benefit prior for one video: channel evidence first, topic evidence next. */
export function benefitPrior(v: SurfaceVideo, p: BenefitPriors): { score: number; source: string } {
  const ch = v.channel_id ? p.channels[v.channel_id] : undefined;
  if (ch && ch[1] >= 2) return { score: ch[0], source: "channel" };
  const cat = v.category ? p.categories[v.category] : undefined;
  if (cat && cat[1] >= 3) return { score: cat[0], source: "category" };
  if (ch) return { score: ch[0], source: "channel_thin" };
  return { score: p.global, source: "global" };
}

/**
 * Re-rank a retrieved pool by measured benefit while preserving most of the
 * original retrieval order (rank blending, not a hard sort): final position
 * score = 0.7 * inverse-rank + 0.3 * benefit prior delta.
 */
export function rerankByBenefit(
  items: SurfaceVideo[],
  priors: BenefitPriors,
  weight = 0.3,
): SurfaceVideo[] {
  if (!items.length || priors.sample_size < 5) return items;
  const n = items.length;
  return items
    .map((v, i) => {
      const { score } = benefitPrior(v, priors);
      const rankScore = 1 - i / n;
      const delta = score - priors.global; // -0.6..+0.4 typical
      return { v, s: (1 - weight) * rankScore + weight * (0.5 + delta) };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

/**
 * Decide the arm for this request and apply the re-rank when in treatment.
 * Anonymous users always stay in control (no per-user labels to learn from).
 */
export async function applyBenefitRanking(
  ctx: SurfaceContext,
  items: SurfaceVideo[],
): Promise<{ items: SurfaceVideo[]; arm: "treatment" | "control"; reason: string }> {
  if (!ctx.userId) return { items, arm: "control", reason: "anonymous" };

  const flag = await loadBenefitFlag(ctx.service);
  if (!flag.enabled) {
    traceStep(ctx, "benefit_rank", { arm: "control", reason: "flag_disabled" });
    return { items, arm: "control", reason: "flag_disabled" };
  }

  const bucket = rolloutBucket(`benefit:${ctx.userId}`);
  if (bucket >= flag.percentage) {
    traceStep(ctx, "benefit_rank", { arm: "control", bucket, pct: flag.percentage });
    return { items, arm: "control", reason: "not_bucketed" };
  }

  const priors = await loadBenefitPriors(ctx.service);
  if (priors.sample_size < 5) {
    traceStep(ctx, "benefit_rank", { arm: "control", reason: "insufficient_labels", labels: priors.sample_size });
    return { items, arm: "control", reason: "insufficient_labels" };
  }

  const before = items.slice(0, 10).map((v) => v.video_id);
  const ranked = rerankByBenefit(items, priors);
  const moved = ranked.slice(0, 10).filter((v) => !before.includes(v.video_id)).length;
  traceStep(ctx, "benefit_rank", {
    arm: "treatment",
    bucket,
    pct: flag.percentage,
    labels: priors.sample_size,
    global: priors.global,
    top10_changed: moved,
  });
  return { items: ranked, arm: "treatment", reason: "ranked" };
}
