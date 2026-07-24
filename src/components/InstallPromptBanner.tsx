// InstallPromptBanner — soft "Add to Home Screen" ask for mobile web users.
//
// Policy:
//   - Only on mobile web (not standalone PWA, not Capacitor native).
//   - Only after 2+ recorded sessions (reuses SessionPushNudge's daily counter).
//   - Dismiss with 30-day backoff.
//   - Chrome/Android: fires the deferred beforeinstallprompt.
//   - iOS Safari: shows Share → Add to Home Screen instructions inline.
//
// Renders as a slim bottom sheet-style card above the BottomTabBar.

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const DISMISSED_KEY = "heartify.install.dismissed-at";
const BACKOFF_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_COUNT_KEY = "heartify.session.count";
const MIN_SESSIONS = 2;

function isCapacitor(): boolean {
  return typeof window !== "undefined" && "Capacitor" in window;
}

function readSessionCount(): number {
  try {
    return Number(localStorage.getItem(SESSION_COUNT_KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

function isBackedOff(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return Boolean(raw && Date.now() - Number(raw) < BACKOFF_MS);
  } catch {
    return false;
  }
}

export default function InstallPromptBanner() {
  const { canInstall, isIOS, isStandalone, installed, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [expandedIOS, setExpandedIOS] = useState(false);

  useEffect(() => {
    if (installed || isStandalone) return;
    if (isCapacitor()) return;
    if (!canInstall) return;
    if (isBackedOff()) return;
    if (readSessionCount() < MIN_SESSIONS) return;
    // Slight delay so it never competes with page load LCP.
    const t = window.setTimeout(() => setVisible(true), 4000);
    return () => window.clearTimeout(t);
  }, [canInstall, installed, isStandalone]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch { /* noop */ }
    setVisible(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      setExpandedIOS(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted" || outcome === "dismissed") {
      dismiss();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Add Heartify to your home screen"
      className="fixed inset-x-3 z-40 rounded-card border border-border bg-card/95 p-4 shadow-card-hover backdrop-blur"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary/10 text-primary">
          <Download className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Add Heartify to your home screen
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Faster launch, prayer-time reminders, offline audio.
          </p>
          {expandedIOS && isIOS && (
            <div className="mt-3 rounded-card bg-muted/60 p-3 text-xs text-foreground">
              <p className="flex items-center gap-1.5">
                Tap <Share className="h-3.5 w-3.5 inline" aria-hidden /> in Safari, then
                choose <strong>Add to Home Screen</strong>.
              </p>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleInstall} className="min-h-[40px]">
              {isIOS ? "Show me how" : "Install"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
              className="min-h-[40px]"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="rounded-pill p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
