/**
 * Wires the backend circuit breaker (see ./backendHealth) into the network
 * layer by wrapping `window.fetch` once, at boot.
 *
 * Only requests to our own backend origin are considered — third-party calls
 * (analytics, CDNs, YouTube thumbnails) must never trip or clear the breaker.
 *
 * Behaviour per backend request:
 *  - breaker open and not the probe window → reject immediately with
 *    BackendUnavailableError, no socket opened.
 *  - request resolves with any HTTP status → backend is reachable.
 *  - request rejects at transport level (DNS/TCP/TLS/timeout/offline) →
 *    reported as unreachable, which trips the breaker after a short run.
 *
 * Aborted requests (React Query cancellation, unmount) are neither successes
 * nor failures and are passed through untouched.
 */

import {
  BackendUnavailableError,
  reportBackendReachable,
  reportBackendUnreachable,
  shouldAttemptBackendRequest,
} from "./backendHealth";

function backendOrigin(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function installBackendFetchInterceptor() {
  if (typeof window === "undefined") return;
  const w = window as unknown as { __backendBreakerInstalled?: boolean };
  if (w.__backendBreakerInstalled) return;

  const origin = backendOrigin();
  if (!origin) return;
  w.__backendBreakerInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    let isBackend = false;
    try {
      isBackend = new URL(requestUrl(input), window.location.href).origin === origin;
    } catch {
      isBackend = false;
    }

    if (!isBackend) return originalFetch(input, init);

    if (!shouldAttemptBackendRequest()) {
      throw new BackendUnavailableError();
    }

    try {
      const response = await originalFetch(input, init);
      reportBackendReachable();
      return response;
    } catch (err) {
      const name = (err as Error | undefined)?.name;
      // Caller-initiated cancellation is not an availability signal.
      if (name === "AbortError" || init?.signal?.aborted) throw err;
      reportBackendUnreachable();
      throw err;
    }
  };
}
