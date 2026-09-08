import { useEffect } from "react";

/**
 * Android hardware/gesture back button:
 *  - dismisses an open dialog / sheet / menu first (native back never fires
 *    the DOM Escape key that Radix listens for, so without this the user
 *    could exit the app while a sheet was still open)
 *  - goes back through in-app history when there is somewhere to go
 *  - exits the app from a root tab instead of leaving a blank WebView
 */
const ROOT_PATHS = new Set(["/", "/home", "/discover", "/shorts", "/library", "/profile"]);

/** Radix portals mark their open layers with data-state="open". */
const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[data-radix-popper-content-wrapper] [data-state="open"]',
].join(",");

function dismissTopOverlay(): boolean {
  if (!document.querySelector(OPEN_OVERLAY_SELECTOR)) return false;
  // Radix DismissableLayer closes the topmost layer on Escape.
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }),
  );
  return true;
}

export function useAndroidBackButton() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (dismissTopOverlay()) return;
          if (canGoBack && !ROOT_PATHS.has(window.location.pathname)) {
            window.history.back();
          } else {
            void App.exitApp();
          }
        });
        if (cancelled) {
          handle.remove();
          return;
        }
        cleanup = () => handle.remove();
      } catch {
        /* web only */
      }
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);
}
