import { useCallback, useEffect, useState } from "react";

/**
 * beforeinstallprompt funnel + iOS Add-to-Home-Screen detection.
 * - `canInstall` is true when Chrome/Edge/Android fired the event OR
 *   the app is running in a browser that supports iOS A2HS (Safari).
 * - `promptInstall()` fires the deferred prompt on supported browsers.
 * - `isIOS` / `isStandalone` help render iOS-specific manual instructions.
 */
type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS
      (navigator as unknown as { standalone?: boolean }).standalone === true);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferred) return "unavailable";
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [deferred]);

  return {
    canInstall: Boolean(deferred) || (isIOS && !isStandalone),
    isIOS,
    isStandalone,
    installed,
    promptInstall,
  };
}
