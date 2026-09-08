import { useEffect } from "react";

/**
 * Android hardware/gesture back button:
 *  - goes back through in-app history when there is somewhere to go
 *  - exits the app from a root tab instead of leaving a blank WebView
 */
const ROOT_PATHS = new Set(["/", "/home", "/discover", "/shorts", "/library", "/profile"]);

export function useAndroidBackButton() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") return;
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack && !ROOT_PATHS.has(window.location.pathname)) {
            window.history.back();
          } else {
            void App.exitApp();
          }
        });
        cleanup = () => handle.remove();
      } catch {
        /* web only */
      }
    })();
    return () => cleanup?.();
  }, []);
}
