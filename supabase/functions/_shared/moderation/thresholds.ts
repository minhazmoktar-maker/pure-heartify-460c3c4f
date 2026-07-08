import type { Thresholds } from "./types.ts";

const DEFAULTS: Thresholds = {
  auto_approve_min_confidence: 98,
  auto_approve_max_risk: 5,
  ai_review_min_confidence: 90,
  human_review_min_confidence: 60,
  reject_below_confidence: 60,
  preferred_ai_provider: "lovable",
  fallback_ai_provider: "gemini",
};

/**
 * Loads tunable thresholds from moderation_thresholds. Never hard-code —
 * all decision boundaries flow through this loader so Owners can retune
 * policy without a code change.
 */
export async function loadThresholds(
  supabaseUrl: string,
  serviceKey: string,
): Promise<Thresholds> {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/moderation_thresholds?singleton=eq.true&select=*&limit=1`,
      {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      },
    );
    if (!res.ok) return DEFAULTS;
    const rows = (await res.json()) as Array<Partial<Thresholds>>;
    if (!rows.length) return DEFAULTS;
    return { ...DEFAULTS, ...rows[0] } as Thresholds;
  } catch {
    return DEFAULTS;
  }
}

export const THRESHOLD_DEFAULTS = DEFAULTS;
