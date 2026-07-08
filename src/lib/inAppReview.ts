/**
 * Lightweight in-app review request.
 *
 * On native (Capacitor) uses @capacitor-community/in-app-review when the
 * plugin is present. On web it falls back to a soft "would you rate us?"
 * toast that links to the store listings.
 *
 * The helper enforces sensible gating so we don't nag users:
 *   - Only prompt once every 90 days.
 *   - Only prompt after N qualifying "delight moments" (see triggerIf...).
 *   - Never prompt inside the first 3 days of use.
 */
import { toast } from "sonner";

const LAST_PROMPT_KEY = "heartify-review-last-prompt";
const DELIGHT_COUNT_KEY = "heartify-review-delight-count";
const FIRST_SEEN_KEY = "heartify-review-first-seen";

const MIN_DAYS_SINCE_INSTALL = 3;
const MIN_DELIGHT_MOMENTS = 5;
const MIN_DAYS_BETWEEN_PROMPTS = 90;

const APP_STORE_URL = "https://apps.apple.com/app/idPLACEHOLDER";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=app.lovable.6731527d4fb54e95bb9e47de8bea4363";

function daysSince(ts: number): number {
  return (Date.now() - ts) / (24 * 3600 * 1000);
}

function ensureFirstSeen(): number {
  const existing = localStorage.getItem(FIRST_SEEN_KEY);
  if (existing) return Number(existing);
  const now = Date.now();
  localStorage.setItem(FIRST_SEEN_KEY, String(now));
  return now;
}

/**
 * Call this from any "delight moment" (video completed, streak extended,
 * favorite added, etc.). Prompts the user only when all gates pass.
 */
export function triggerIfDelightful(): void {
  try {
    ensureFirstSeen();
    const firstSeen = Number(localStorage.getItem(FIRST_SEEN_KEY) ?? Date.now());
    if (daysSince(firstSeen) < MIN_DAYS_SINCE_INSTALL) return;

    const last = Number(localStorage.getItem(LAST_PROMPT_KEY) ?? 0);
    if (last && daysSince(last) < MIN_DAYS_BETWEEN_PROMPTS) return;

    const count = Number(localStorage.getItem(DELIGHT_COUNT_KEY) ?? 0) + 1;
    localStorage.setItem(DELIGHT_COUNT_KEY, String(count));
    if (count < MIN_DELIGHT_MOMENTS) return;

    localStorage.setItem(LAST_PROMPT_KEY, String(Date.now()));
    localStorage.setItem(DELIGHT_COUNT_KEY, "0");
    void requestReview();
  } catch {
    /* never throw */
  }
}

async function requestReview(): Promise<void> {
  // Prefer native review dialog on device.
  try {
    // Dynamic import so the web bundle never pays for the plugin.
    const mod = await import("@capacitor-community/in-app-review").catch(() => null);
    if (mod?.InAppReview?.requestReview) {
      await mod.InAppReview.requestReview();
      return;
    }
  } catch {
    /* fall through to web */
  }

  // Web fallback: soft nudge with links.
  const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = isApple ? APP_STORE_URL : PLAY_STORE_URL;
  toast("Loving Heartify? A quick rating helps others discover it. ✦", {
    action: {
      label: "Rate the app",
      onClick: () => window.open(url, "_blank", "noopener,noreferrer"),
    },
    duration: 10_000,
  });
}
