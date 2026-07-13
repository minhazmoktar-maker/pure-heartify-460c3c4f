// Phase 10 — Sound & haptics library.
//
// Tiny Web Audio–synthesized "earcons" so we ship delight without shipping any
// binary sound assets (keeps bundle < 1KB per sound). Every helper:
//   • Silently no-ops when reduced motion / sound is off, or the user has
//     disabled sound in settings, or an AudioContext can't be created.
//   • Pairs with a matching haptic pulse via the existing `buzz()` helper.
//   • Uses short (< 250ms), soft, mid-frequency tones — never intrusive.
//
// Preference key: heartify.sound.enabled (bool, default true).

import { buzz } from "@/lib/celebrate";

const SOUND_KEY = "heartify.sound.enabled";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(SOUND_KEY);
  return raw === null ? true : raw === "1";
}

export function setSoundEnabled(enabled: boolean): void {
  try { localStorage.setItem(SOUND_KEY, enabled ? "1" : "0"); } catch { /* noop */ }
}

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Play a short envelope-shaped tone.
 * @param freq base frequency in Hz
 * @param durationMs total duration
 * @param type oscillator waveform — sine is softest, triangle slightly brighter
 * @param gainPeak peak gain (0..1), kept low so the sound never clips
 */
function tone(freq: number, durationMs: number, type: OscillatorType = "sine", gainPeak = 0.08): void {
  if (!isSoundEnabled() || reducedMotion()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain).connect(ac.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  } catch { /* noop */ }
}

/** Soft dhikr-bead click (buttery, single tap). */
export function soundTap(): void {
  tone(1400, 40, "sine", 0.05);
  void buzz(5);
}

/** Goal reached — two-note ascending chime. */
export function soundGoal(): void {
  tone(660, 120, "sine", 0.09);
  setTimeout(() => tone(990, 180, "sine", 0.08), 90);
  void buzz(12);
}

/** Streak-saved reassurance — mid-warm swell. */
export function soundStreakSave(): void {
  tone(520, 220, "triangle", 0.09);
  void buzz([10, 30, 10]);
}

/** Completion (video / lesson finished) — pleasant major-third. */
export function soundComplete(): void {
  tone(660, 160, "sine", 0.09);
  setTimeout(() => tone(830, 220, "sine", 0.08), 110);
  void buzz(15);
}

/** Warning / undo affordance — low, short. */
export function soundNudge(): void {
  tone(320, 90, "triangle", 0.05);
  void buzz(3);
}
