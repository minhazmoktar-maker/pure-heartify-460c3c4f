/**
 * Vite dependency-cache self-healing.
 *
 * Symptom we recover from: a stale `node_modules/.vite` prebundle ends up with
 * two copies of React, so a provider mounts with a null hooks dispatcher and the
 * app dies with a blank screen:
 *
 *   TypeError: null is not an object (evaluating 'dispatcher.useEffect')
 *   Warning: Invalid hook call / Cannot read properties of null (reading 'useEffect')
 *
 * The only reliable client-side fix is to drop every cached module graph
 * (service worker caches + Cache Storage + the `?v=<hash>` dep URLs) and do one
 * hard reload. Guarded by sessionStorage so a genuine hook bug can never loop.
 */

const FLAG = "heartify.vite-recovery.v1";
const MAX_ATTEMPTS = 1;

const DISPATCHER_PATTERNS = [
  /dispatcher\.use[A-Z]/,
  /null is not an object \(evaluating '.*dispatcher/i,
  /Cannot read propert(?:y|ies) of null \(reading 'use[A-Z]/,
  /Invalid hook call/i,
  /Should have a queue\. This is likely a bug in React/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
];

export function isViteCacheError(message: string, stack?: string): boolean {
  const hay = `${message}\n${stack ?? ""}`;
  return DISPATCHER_PATTERNS.some((re) => re.test(hay));
}

function attempts(): number {
  try {
    return Number(sessionStorage.getItem(FLAG) ?? "0") || 0;
  } catch {
    return MAX_ATTEMPTS; // no storage → never risk a reload loop
  }
}

/** Clears every client-side module cache, then hard-reloads once. */
export async function recoverFromViteCache(reason: string): Promise<boolean> {
  if (attempts() >= MAX_ATTEMPTS) return false;
  try {
    sessionStorage.setItem(FLAG, String(attempts() + 1));
  } catch {
    return false;
  }

  // eslint-disable-next-line no-console
  console.warn("[vite-recovery] clearing module caches and reloading —", reason);

  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
  } catch { /* noop */ }

  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* noop */ }

  try {
    const url = new URL(window.location.href);
    url.searchParams.set("__vite_recover", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
  return true;
}

/** Clear the guard once the app has successfully rendered. */
export function markAppHealthy() {
  try {
    sessionStorage.removeItem(FLAG);
    const url = new URL(window.location.href);
    if (url.searchParams.has("__vite_recover")) {
      url.searchParams.delete("__vite_recover");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  } catch { /* noop */ }
}

/**
 * Installs global listeners. Must run before the React tree mounts so the
 * very first dispatcher crash (blank screen) is caught.
 */
export function installViteRecovery() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __viteRecoveryInstalled?: boolean };
  if (w.__viteRecoveryInstalled) return;
  w.__viteRecoveryInstalled = true;

  window.addEventListener("error", (event) => {
    const msg = event.message ?? String((event.error as Error | undefined)?.message ?? "");
    const stack = (event.error as Error | undefined)?.stack;
    if (isViteCacheError(msg, stack)) void recoverFromViteCache(msg);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as Error | string | undefined;
    const msg = typeof reason === "string" ? reason : reason?.message ?? "";
    const stack = typeof reason === "string" ? undefined : reason?.stack;
    // Benign: supabase-js Web Lock is intentionally "stolen" when a newer
    // token-refresh attempt supersedes a stalled one (e.g. after the network
    // drops or a second tab wakes up). It is internal bookkeeping, not an app
    // fault, so keep it out of the error overlay/reporting.
    if (/Lock broken by another request with the 'steal' option/i.test(msg)) {
      event.preventDefault();
      return;
    }
    if (isViteCacheError(msg, stack)) void recoverFromViteCache(msg);
  });


  // If the tree mounted and painted, the cache is fine — release the guard.
  window.addEventListener("load", () => {
    window.setTimeout(() => {
      if (document.getElementById("root")?.childElementCount) markAppHealthy();
    }, 2000);
  });
}
