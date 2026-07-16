// Phase 3 — Standardized notification helper.
// Single entry point for all toast notifications so durations, tone, and
// motion stay consistent with the locked design system (docs/DESIGN_SYSTEM.md,
// docs/MOTION.md). Wraps sonner directly — pages should import from here
// rather than reaching into sonner for one-off overrides.

import { toast as sonnerToast, type ExternalToast } from "sonner";

// Duration tokens (ms). Aligned to product intent, not motion tokens:
//   ack     — quick confirmation, dismisses fast
//   default — standard message
//   long    — needs a beat to read (multi-line)
//   sticky  — critical error, user must dismiss
const DURATION = {
  ack: 2000,
  default: 4000,
  long: 6500,
  sticky: Infinity,
} as const;

type Tone = "success" | "error" | "info" | "warning" | "message";
type Length = keyof typeof DURATION;

interface NotifyOptions extends Omit<ExternalToast, "duration"> {
  length?: Length;
  duration?: number;
}

function fire(tone: Tone, message: string, opts: NotifyOptions = {}) {
  const { length = tone === "error" ? "long" : "default", duration, ...rest } = opts;
  const finalDuration = duration ?? DURATION[length];
  const options: ExternalToast = { ...rest, duration: finalDuration };
  switch (tone) {
    case "success":
      return sonnerToast.success(message, options);
    case "error":
      return sonnerToast.error(message, options);
    case "info":
      return sonnerToast.info(message, options);
    case "warning":
      return sonnerToast.warning(message, options);
    default:
      return sonnerToast(message, options);
  }
}

export const notify = {
  success: (message: string, opts?: NotifyOptions) => fire("success", message, opts),
  error: (message: string, opts?: NotifyOptions) => fire("error", message, opts),
  info: (message: string, opts?: NotifyOptions) => fire("info", message, opts),
  warning: (message: string, opts?: NotifyOptions) => fire("warning", message, opts),
  message: (message: string, opts?: NotifyOptions) => fire("message", message, opts),
  loading: sonnerToast.loading,
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  /** Escape hatch for advanced sonner APIs (custom JSX, etc.). Prefer the tone helpers. */
  raw: sonnerToast,
};

export type { NotifyOptions };
