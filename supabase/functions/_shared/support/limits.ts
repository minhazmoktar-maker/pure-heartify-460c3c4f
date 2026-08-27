/**
 * Layered rate limiting + abuse detection for the support agent.
 *
 * Three independent identities are limited on every turn:
 *   user      — the authenticated account (fair-use quota)
 *   anon      — the per-device anonymous key (stops key-less looping)
 *   ip        — the network origin (stops many throwaway anon keys behind one IP)
 *
 * The plan itself is pure so the retry / concurrency / degradation behaviour is
 * testable without a database; `enforceSupportLimits` applies it against the
 * shared DB counter and fails open on infrastructure errors (protecting budget
 * is the goal, not gate-keeping).
 */
import { enforceRateLimit } from "../rateLimit.ts";
import type { RateLimitClient } from "../rateLimit.ts";

export type LimitScope = "user" | "anon" | "ip";

export interface LimitRule {
  scope: LimitScope;
  identity: string;
  action: string;
  limit: number;
  windowSeconds: number;
}

export interface LimitContext {
  userId: string | null;
  anonKey: string | null;
  ip: string;
}

/** Burst = seconds-scale protection; sustained = daily fair use. */
export function buildLimitPlan(ctx: LimitContext): LimitRule[] {
  const rules: LimitRule[] = [];
  if (ctx.userId) {
    rules.push(
      { scope: "user", identity: `u:${ctx.userId}`, action: "support_burst", limit: 5, windowSeconds: 10 },
      { scope: "user", identity: `u:${ctx.userId}`, action: "support_minute", limit: 20, windowSeconds: 60 },
      { scope: "user", identity: `u:${ctx.userId}`, action: "support_daily", limit: 300, windowSeconds: 86_400 },
    );
  } else if (ctx.anonKey) {
    rules.push(
      { scope: "anon", identity: `a:${ctx.anonKey}`, action: "support_burst", limit: 3, windowSeconds: 10 },
      { scope: "anon", identity: `a:${ctx.anonKey}`, action: "support_minute", limit: 8, windowSeconds: 60 },
      { scope: "anon", identity: `a:${ctx.anonKey}`, action: "support_daily", limit: 40, windowSeconds: 86_400 },
    );
  }
  // The IP layer always applies — it is what makes rotating anon keys pointless.
  rules.push(
    { scope: "ip", identity: `ip:${ctx.ip}`, action: "support_ip_burst", limit: 10, windowSeconds: 10 },
    { scope: "ip", identity: `ip:${ctx.ip}`, action: "support_ip_minute", limit: 40, windowSeconds: 60 },
    { scope: "ip", identity: `ip:${ctx.ip}`, action: "support_ip_daily", limit: 600, windowSeconds: 86_400 },
  );
  return rules;
}

export interface LimitVerdict {
  limited: boolean;
  rule?: LimitRule;
  /** Seconds the client should wait before retrying. */
  retryAfterSeconds: number;
  message: string;
  /** True when the caller looks abusive rather than merely fast. */
  abuse: boolean;
}

const BURST_MESSAGE = "You're sending messages faster than I can answer. Give it a few seconds and try again.";
const MINUTE_MESSAGE = "That's a lot of questions in one minute. Please pause briefly — the Help centre stays available.";
const DAILY_MESSAGE =
  "You've reached today's support chat limit. Help centre articles are still available, and you can reach the team from the Contact page.";

export function verdictFor(rule: LimitRule): LimitVerdict {
  const daily = rule.windowSeconds >= 3600;
  const minute = !daily && rule.windowSeconds >= 60;
  return {
    limited: true,
    rule,
    retryAfterSeconds: daily ? 3600 : rule.windowSeconds,
    message: daily ? DAILY_MESSAGE : minute ? MINUTE_MESSAGE : BURST_MESSAGE,
    abuse: false,
  };
}

export const ALLOWED_VERDICT: LimitVerdict = {
  limited: false,
  retryAfterSeconds: 0,
  message: "",
  abuse: false,
};

// ---------------------------------------------------------------------------
// Abuse detection (pure)
// ---------------------------------------------------------------------------

export interface AbuseSignal {
  /** Identical question repeated within the window. */
  repeats: number;
  /** Turns seen in the last 60 seconds for this identity. */
  turnsPerMinute: number;
  /** Injection or extraction attempts in this conversation. */
  injectionAttempts: number;
  /** Distinct anon keys seen from this IP in the window. */
  distinctAnonKeys: number;
}

export interface AbuseVerdict {
  abusive: boolean;
  reasons: string[];
  /** Hard block for the rest of the window rather than a "slow down". */
  block: boolean;
}

export function detectAbuse(s: AbuseSignal): AbuseVerdict {
  const reasons: string[] = [];
  if (s.repeats >= 5) reasons.push("repeated_identical_question");
  if (s.turnsPerMinute >= 30) reasons.push("automated_rate");
  if (s.injectionAttempts >= 3) reasons.push("repeated_injection");
  if (s.distinctAnonKeys >= 12) reasons.push("anon_key_rotation");
  const block = reasons.includes("repeated_injection")
    || reasons.includes("anon_key_rotation")
    || reasons.includes("automated_rate");
  return { abusive: reasons.length > 0, reasons, block };
}

export const ABUSE_MESSAGE =
  "This chat has been paused for a while because of unusual activity. " +
  "Heartify's Help centre is still available, and the team can help from the Contact page.";

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------

/**
 * Apply every rule in the plan. Rules are evaluated cheapest-window-first so a
 * bursting client is told to slow down before its daily quota is consumed.
 */
export async function enforceSupportLimits(
  admin: RateLimitClient,
  ctx: LimitContext,
): Promise<LimitVerdict> {
  const rules = buildLimitPlan(ctx).sort((a, b) => a.windowSeconds - b.windowSeconds);
  for (const rule of rules) {
    let limited = false;
    try {
      limited = await enforceRateLimit(admin, {
        identity: rule.identity,
        action: rule.action,
        limit: rule.limit,
        windowSeconds: rule.windowSeconds,
      });
    } catch {
      // Fail open: a counter outage must not take the Help assistant down.
      limited = false;
    }
    if (limited) return verdictFor(rule);
  }
  return ALLOWED_VERDICT;
}

/** Extract the client IP from proxy headers without trusting a single one. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim()
    || req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || "unknown";
}
