// Phase 10 — Auto theme schedule based on the user's saved prayer location.
// Resolves a "target" theme (light/dark) for a given moment:
//   • Before sunrise / after Maghrib → dark
//   • Sunrise → Maghrib → light
// Falls back to `prefers-color-scheme` when no location is stored, so nothing
// regresses for users who never opened prayer settings.

import { computePrayerTimes, loadSettings } from "@/lib/prayerTimes";

export type ResolvedTheme = "light" | "dark";

export function resolveAutoTheme(now: Date = new Date()): ResolvedTheme {
  const settings = loadSettings();
  const loc = settings.location;
  if (!loc) {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }
  try {
    const slots = computePrayerTimes(loc, now, settings.method, settings.madhab);
    const sunrise = slots.find((s) => s.name === "sunrise")?.time;
    const maghrib = slots.find((s) => s.name === "maghrib")?.time;
    if (!sunrise || !maghrib) return "light";
    if (now.getTime() < sunrise.getTime() || now.getTime() >= maghrib.getTime()) {
      return "dark";
    }
    return "light";
  } catch {
    return "light";
  }
}

/**
 * Returns the next boundary (sunrise or maghrib) after `now`. Used to schedule
 * the auto-theme re-check without polling.
 */
export function nextThemeBoundary(now: Date = new Date()): Date | null {
  const settings = loadSettings();
  const loc = settings.location;
  if (!loc) return null;
  try {
    const today = computePrayerTimes(loc, now, settings.method, settings.madhab);
    const sunrise = today.find((s) => s.name === "sunrise")?.time;
    const maghrib = today.find((s) => s.name === "maghrib")?.time;
    const candidates = [sunrise, maghrib].filter(
      (d): d is Date => !!d && d.getTime() > now.getTime(),
    );
    if (candidates.length > 0) return new Date(Math.min(...candidates.map((d) => d.getTime())));
    // Roll over: use tomorrow's sunrise.
    const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
    const nextSlots = computePrayerTimes(loc, tomorrow, settings.method, settings.madhab);
    return nextSlots.find((s) => s.name === "sunrise")?.time ?? null;
  } catch {
    return null;
  }
}
