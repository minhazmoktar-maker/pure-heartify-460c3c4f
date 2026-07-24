// Micro-delight haptic helper. Safely no-ops when unsupported or when the user
// has requested reduced motion. Never throws.

type Kind = "tap" | "success" | "warning" | "impact";

function reducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const PATTERNS: Record<Kind, number | number[]> = {
  tap: 8,
  success: [10, 40, 18],
  warning: [20, 60, 20],
  impact: 24,
};

export function haptic(kind: Kind = "tap"): void {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  if (reducedMotion()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    /* swallow */
  }
}
