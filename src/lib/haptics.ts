// Phase 8 — Normalized haptics API.
//
// One place to trigger tactile feedback for the entire app. Every helper:
//   • No-ops when prefers-reduced-motion is set.
//   • No-ops when device/browser has no vibration or Capacitor Haptics.
//   • Delegates to Capacitor Haptics on native, Web Vibration on browsers.
//   • Uses named intents (not raw ms values) so the feel stays consistent
//     across features (dhikr tap should feel identical to a bump on Wird).
//
// Intent → duration mapping (kept centralized so future tuning is one edit):
//   light      →  8ms  — subtle acknowledgement (counter bump, toggle)
//   selection  → 12ms  — nav/tab/segment change
//   success    → [10, 30, 10] — completion / streak save
//   warning    → [15, 40, 15] — reversible destructive intent
//   error      → [40, 20, 40] — hard failure
//
// Prefer this over calling `navigator.vibrate` or `buzz()` directly.

import { buzz } from "@/lib/celebrate";

export type HapticIntent = "light" | "selection" | "success" | "warning" | "error";

const PATTERNS: Record<HapticIntent, number | number[]> = {
  light: 8,
  selection: 12,
  success: [10, 30, 10],
  warning: [15, 40, 15],
  error: [40, 20, 40],
};

/**
 * Trigger a named haptic intent. Fire-and-forget; never throws.
 * Reduced-motion users get silence.
 */
export function haptic(intent: HapticIntent = "light"): void {
  void buzz(PATTERNS[intent]);
}
