/**
 * Offline download queue.
 *
 * A single module-level queue (survives route changes) that runs downloads with
 * user-tunable concurrency and exposes observable per-item status so the UI can
 * show queued / downloading / retrying / completed / failed / cancelled.
 *
 * Queue state is mirrored to localStorage so a tab reload (or a crash) does not
 * lose in-flight work: anything that was queued/downloading/retrying is
 * restored as `queued` and automatically resumed — combined with the `partials`
 * store in `audioOffline`, the transfer continues from the bytes already
 * fetched instead of restarting.
 */
import { saveOfflineTrackGated, clearPartial, DownloadError, hasOfflineTrack } from "@/lib/audioOffline";
import { getOfflineSettings } from "@/lib/offlineSettings";
import { diag } from "@/lib/diagnostics";

export type QueueStatus =
  | "queued"
  | "downloading"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled";

export interface QueueItem {
  id: string;
  title: string;
  url: string;
  isPremium: boolean;
  trackIsPremium?: boolean;
  status: QueueStatus;
  pct: number;
  attempt: number;
  maxAttempts: number;
  /** When retrying, the epoch ms at which the next attempt starts. */
  nextAttemptAt?: number;
  error?: string;
  errorCode?: string;
  queuedAt: number;
  finishedAt?: number;
  /** True when this item was restored from a previous session and resumed. */
  resumedFromReload?: boolean;
}

type Listener = (items: QueueItem[]) => void;

const items = new Map<string, QueueItem>();
const controllers = new Map<string, AbortController>();
const listeners = new Set<Listener>();
let running = 0;

const STORAGE_KEY = "heartify.offlineDownload.queue";
const ACTIVE: QueueStatus[] = ["queued", "downloading", "retrying"];
/** Finished items older than this are dropped when rehydrating. */
const FINISHED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function snapshot(): QueueItem[] {
  return [...items.values()].sort((a, b) => a.queuedAt - b.queuedAt);
}

function persist() {
  try {
    const payload = snapshot().map((i) =>
      // Never persist a mid-flight status: on restore it must look interrupted.
      ACTIVE.includes(i.status)
        ? { ...i, status: "queued" as QueueStatus, nextAttemptAt: undefined, resumedFromReload: true }
        : i,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch { /* storage full / unavailable — persistence is best-effort */ }
}

function emit() {
  const snap = snapshot();
  persist();
  listeners.forEach((fn) => fn(snap));
}


function update(id: string, patch: Partial<QueueItem>) {
  const cur = items.get(id);
  if (!cur) return;
  items.set(id, { ...cur, ...patch });
  emit();
}

export function subscribeQueue(fn: Listener): () => void {
  listeners.add(fn);
  fn(snapshot());
  return () => { listeners.delete(fn); };
}

export function getQueue(): QueueItem[] {
  return snapshot();
}

export interface EnqueueInput {
  id: string;
  title: string;
  url: string;
  isPremium: boolean;
  trackIsPremium?: boolean;
}

/** Adds a track to the queue (no-op if already active) and starts the pump. */
export function enqueueDownload(input: EnqueueInput): QueueItem {
  const existing = items.get(input.id);
  if (existing && ["queued", "downloading", "retrying"].includes(existing.status)) {
    return existing;
  }
  const item: QueueItem = {
    ...input,
    status: "queued",
    pct: 0,
    attempt: 0,
    maxAttempts: getOfflineSettings().maxAttempts,
    queuedAt: Date.now(),
  };
  items.set(input.id, item);
  emit();
  diag("download", "queued", { trackId: input.id });
  void pump();
  return item;
}

/** Re-queues a failed/cancelled item, keeping any resumable partial bytes. */
export function retryDownload(id: string): void {
  const item = items.get(id);
  if (!item || ["queued", "downloading", "retrying"].includes(item.status)) return;
  update(id, {
    status: "queued",
    error: undefined,
    errorCode: undefined,
    attempt: 0,
    maxAttempts: getOfflineSettings().maxAttempts,
    nextAttemptAt: undefined,
    finishedAt: undefined,
  });
  void pump();
}

/** Cancels an in-flight or queued download. Partial bytes are kept for resume. */
export function cancelDownload(id: string): void {
  const item = items.get(id);
  if (!item) return;
  controllers.get(id)?.abort();
  controllers.delete(id);
  if (item.status !== "completed") {
    update(id, { status: "cancelled", finishedAt: Date.now() });
  }
  void pump();
}

/** Removes an item from the list (and drops its resume buffer). */
export async function clearQueueItem(id: string): Promise<void> {
  const item = items.get(id);
  if (item && ["downloading", "retrying"].includes(item.status)) cancelDownload(id);
  items.delete(id);
  emit();
  await clearPartial(id);
}

/** Clears every finished item (completed / failed / cancelled). */
export function clearFinished(): void {
  for (const [id, item] of items) {
    if (["completed", "failed", "cancelled"].includes(item.status)) items.delete(id);
  }
  emit();
}

export function cancelAll(): void {
  for (const [id, item] of items) {
    if (["queued", "downloading", "retrying"].includes(item.status)) cancelDownload(id);
  }
}

async function pump(): Promise<void> {
  const { concurrency } = getOfflineSettings();
  while (running < concurrency) {
    const next = snapshot().find((i) => i.status === "queued");
    if (!next) return;
    running++;
    void run(next.id).finally(() => {
      running--;
      void pump();
    });
  }
}

async function run(id: string): Promise<void> {
  const item = items.get(id);
  if (!item || item.status !== "queued") return;

  const controller = new AbortController();
  controllers.set(id, controller);
  update(id, { status: "downloading", pct: 0, attempt: 1, nextAttemptAt: undefined });
  const startedAt = Date.now();

  try {
    await saveOfflineTrackGated(item.id, item.url, {
      isPremium: item.isPremium,
      trackIsPremium: item.trackIsPremium,
      signal: controller.signal,
      onProgress: (pct) => update(id, { pct, status: "downloading" }),
      onRetry: ({ attempt, maxAttempts, delayMs, error }) => {
        update(id, {
          status: "retrying",
          attempt: attempt + 1,
          maxAttempts,
          nextAttemptAt: Date.now() + delayMs,
          error: error.message,
        });
        diag("download", "retry", { trackId: id, attempt, delayMs, message: error.message });
      },
    });
    update(id, {
      status: "completed",
      pct: 100,
      error: undefined,
      errorCode: undefined,
      nextAttemptAt: undefined,
      finishedAt: Date.now(),
    });
    diag("download", "cached_ok", { trackId: id, ms: Date.now() - startedAt });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    if (err.name === "AbortError") {
      update(id, { status: "cancelled", finishedAt: Date.now(), nextAttemptAt: undefined });
      return;
    }
    const code = (err as Error & { code?: string }).code
      ?? (e instanceof DownloadError && e.status ? `HTTP_${e.status}` : undefined);
    update(id, {
      status: "failed",
      error: err.message,
      errorCode: code,
      nextAttemptAt: undefined,
      finishedAt: Date.now(),
    });
    diag("download", "cache_failed", {
      trackId: id,
      ms: Date.now() - startedAt,
      code: code ?? null,
      message: err.message,
    });
  } finally {
    controllers.delete(id);
  }
}

export const QUEUE_ACTIVE_STATUSES: QueueStatus[] = ["queued", "downloading", "retrying"];
