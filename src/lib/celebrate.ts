// design-lint-disable-file — brand/canvas/chart palette requires literal hex colors
import confetti from "canvas-confetti";

const REDUCED = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Fire a tactile buzz. Silently no-ops on the web (uses Web Vibration API). */
export async function buzz(pattern: number | number[] = 12) {
  if (REDUCED()) return;
  try {
    // Try Capacitor Haptics first (real device); fall back to Web Vibration.
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    try {
      // Web Vibration API — Android Chrome / most browsers, silently no-op on iOS Safari.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      /* ignore */
    }
  }
}

/** Small celebratory burst — used for single dose-video completion. */
export function celebrateSmall() {
  if (REDUCED()) return;
  void buzz(10);
  confetti({
    particleCount: 40,
    spread: 55,
    startVelocity: 30,
    origin: { y: 0.7 },
    ticks: 120,
    scalar: 0.9,
    colors: ["#22c55e", "#10b981", "#facc15", "#f59e0b"],
  });
}

/** Full celebration — used when the entire Daily Dose is completed. */
export function celebrateBig() {
  if (REDUCED()) return;
  void buzz([15, 40, 25]);
  const end = Date.now() + 900;
  const colors = ["#22c55e", "#facc15", "#10b981", "#f59e0b", "#38bdf8"];
  (function frame() {
    confetti({
      particleCount: 6,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.75 },
      colors,
    });
    confetti({
      particleCount: 6,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.75 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Streak milestone burst — includes a gentle top-down shimmer. */
export function celebrateMilestone(days: number) {
  if (REDUCED()) return;
  void buzz([20, 60, 30, 60, 20]);
  confetti({
    particleCount: Math.min(220, 60 + days * 3),
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.35 },
    scalar: 1.1,
    ticks: 200,
    colors: ["#22c55e", "#facc15", "#10b981", "#f59e0b", "#a78bfa"],
  });
}

/** Heartify+ upgrade success — gold/emerald burst tuned to brand hues. */
export function celebrateUpgrade() {
  if (REDUCED()) return;
  void buzz([12, 40, 20]);
  const colors = ["#facc15", "#f59e0b", "#10b981", "#22c55e", "#ffffff"];
  // Center burst
  confetti({
    particleCount: 90,
    spread: 80,
    startVelocity: 38,
    origin: { y: 0.55 },
    ticks: 160,
    scalar: 1,
    colors,
  });
  // Delayed side puffs for a layered feel
  setTimeout(() => {
    confetti({ particleCount: 25, angle: 60, spread: 55, origin: { x: 0.05, y: 0.7 }, colors });
    confetti({ particleCount: 25, angle: 120, spread: 55, origin: { x: 0.95, y: 0.7 }, colors });
  }, 180);
}
