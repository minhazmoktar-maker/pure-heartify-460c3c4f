/**
 * Client-side circuit breaker for backend availability.
 *
 * When the hosted backend is unreachable (paused project, regional outage,
 * upstream 5xx storm), every surface on screen retries independently. With
 * enough concurrent clients that turns a partial outage into a thundering
 * herd the moment the backend recovers.
 *
 * This module watches the outcome of backend requests and trips a breaker
 * after a run of consecutive transport failures. While the breaker is open,
 * requests fail fast locally (no socket opened) except for a single timed
 * probe per cooldown window, which closes the breaker as soon as the backend
 * answers again. Cooldown grows exponentially and is capped, so an outage of
 * any length costs each client at most a handful of requests per minute.
 */

export type BackendState = "up" | "degraded" | "down";

const FAILURE_THRESHOLD = 3;
const BASE_COOLDOWN_MS = 5_000;
const MAX_COOLDOWN_MS = 60_000;

type Listener = (state: BackendState) => void;

let consecutiveFailures = 0;
let openedAt = 0;
let cooldownMs = BASE_COOLDOWN_MS;
let probeInFlight = false;
let state: BackendState = "up";

const listeners = new Set<Listener>();

function setState(next: BackendState) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) {
    try {
      listener(state);
    } catch {
      // A misbehaving subscriber must never break request handling.
    }
  }
}

export function getBackendState(): BackendState {
  return state;
}

export function subscribeBackendState(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

/** Record a request that reached the backend (any HTTP status counts). */
export function reportBackendReachable() {
  consecutiveFailures = 0;
  openedAt = 0;
  cooldownMs = BASE_COOLDOWN_MS;
  probeInFlight = false;
  setState("up");
}

/** Record a transport-level failure (DNS, TCP, TLS, timeout, offline). */
export function reportBackendUnreachable() {
  consecutiveFailures += 1;
  if (consecutiveFailures < FAILURE_THRESHOLD) {
    setState("degraded");
    return;
  }
  if (openedAt === 0) {
    openedAt = Date.now();
  } else {
    // Probe failed — back off further, capped.
    openedAt = Date.now();
    cooldownMs = Math.min(cooldownMs * 2, MAX_COOLDOWN_MS);
  }
  probeInFlight = false;
  setState("down");
}

/**
 * Should this request be attempted?
 * Closed/half-open → yes. Open → only the single probe per cooldown window.
 */
export function shouldAttemptBackendRequest(): boolean {
  if (state !== "down") return true;
  if (probeInFlight) return false;
  if (Date.now() - openedAt < cooldownMs) return false;
  probeInFlight = true;
  return true;
}

/** Human-readable retry hint, in seconds, for UI copy. */
export function backendRetryInSeconds(): number {
  if (state !== "down") return 0;
  return Math.max(0, Math.ceil((openedAt + cooldownMs - Date.now()) / 1000));
}

export class BackendUnavailableError extends Error {
  readonly code = "BACKEND_UNAVAILABLE";
  constructor() {
    super("Backend temporarily unavailable — retrying shortly");
    this.name = "BackendUnavailableError";
  }
}

/** Test-only reset. */
export function __resetBackendHealth() {
  consecutiveFailures = 0;
  openedAt = 0;
  cooldownMs = BASE_COOLDOWN_MS;
  probeInFlight = false;
  state = "up";
}
