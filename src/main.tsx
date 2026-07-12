import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { captureAttributionOnce } from "./lib/attribution";
import { growth } from "./lib/growthEvents";

// Bootstrap error reporting FIRST so early crashes are captured.
initSentry();

// Fire-and-forget: capture first-touch UTM/referral on every fresh page load.
void captureAttributionOnce();

// Growth: acquisition.visited on cold boot (per session).
try {
  const key = "heartify-visited-fired";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    growth.visited(window.location.pathname, document.referrer || null);
  }
} catch { /* noop */ }

// Guard service worker: never run inside Lovable preview iframes.
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
} else if ("serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
  // Route the user when they click a Web-Push notification (see public/push-handler.js)
  navigator.serviceWorker?.addEventListener("message", (event) => {
    const data = event.data as { type?: string; url?: string } | undefined;
    if (data?.type === "navigate" && typeof data.url === "string") {
      try {
        const target = new URL(data.url, window.location.origin);
        if (target.origin === window.location.origin) window.location.assign(target.pathname + target.search + target.hash);
      } catch { /* noop */ }
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
