/**
 * IndexedDB-backed offline video cache (first-party Heartify uploads only).
 *
 * Only native uploads are downloadable: their bytes come from our own storage
 * behind a short-lived signed URL, so caching them is both legal and reliable.
 * YouTube-sourced items are never cached.
 *
 * Object stores:
 * - `videos`: the completed video Blob keyed by upload id
 * - `meta`:   { id, title, creator, language, bytes, mimeType, savedAt }
 * - `partials`: bytes already fetched, so an interrupted transfer resumes with
 *   an HTTP Range request instead of restarting on a mobile network.
 *
 * Retry/backoff behaviour reuses the user's offline download settings, so the
 * "patient" preset benefits video downloads too.
 */
import { getOfflineSettings } from "@/lib/offlineSettings";

const DB_NAME = "heartify-video";
const STORE = "videos";
const META_STORE = "meta";
const PARTIAL_STORE = "partials";
const VERSION = 1;

export interface OfflineVideoMeta {
  id: string;
  title: string;
  creator: string | null;
  language: string | null;
  bytes: number;
  mimeType: string | null;
  savedAt: number;
}

interface PartialRecord {
  id: string;
  blob: Blob;
  received: number;
  total: number | null;
  validator: string | null;
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      if (!db.objectStoreNames.contains(PARTIAL_STORE)) db.createObjectStore(PARTIAL_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function req<T>(store: IDBObjectStore, r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    store.transaction.onabort = () => reject(store.transaction.error);
  });
}

async function withStores<T>(
  mode: IDBTransactionMode,
  fn: (videos: IDBObjectStore, meta: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction([STORE, META_STORE], mode);
  return fn(tx.objectStore(STORE), tx.objectStore(META_STORE));
}

async function withPartials<T>(
  mode: IDBTransactionMode,
  fn: (partials: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDb();
  const tx = db.transaction([PARTIAL_STORE], mode);
  return fn(tx.objectStore(PARTIAL_STORE));
}

/* ------------------------------------------------------------------- reading */

export async function hasOfflineVideo(id: string): Promise<boolean> {
  try {
    return await withStores("readonly", async (videos) => {
      const key = await req(videos, videos.getKey(id) as IDBRequest<IDBValidKey | undefined>);
      return key != null;
    });
  } catch {
    return false;
  }
}

export async function listOfflineVideos(): Promise<OfflineVideoMeta[]> {
  try {
    const rows = await withStores("readonly", async (_v, meta) => {
      const values = await req(meta, meta.getAll() as IDBRequest<OfflineVideoMeta[]>);
      return values ?? [];
    });
    return rows.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export function totalOfflineVideoBytes(rows: OfflineVideoMeta[]): number {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.bytes) ? row.bytes : 0), 0);
}

/**
 * Object URL for a cached video, or null when it isn't downloaded. Callers must
 * revoke the URL when the player unmounts.
 */
export async function getOfflineVideoUrl(id: string): Promise<string | null> {
  try {
    const blob = await withStores("readonly", async (videos) => {
      const value = await req(videos, videos.get(id) as IDBRequest<Blob | undefined>);
      return value ?? null;
    });
    return blob ? URL.createObjectURL(blob) : null;
  } catch {
    return null;
  }
}

export async function removeOfflineVideo(id: string): Promise<void> {
  try {
    await withStores("readwrite", async (videos, meta) => {
      await req(videos, videos.delete(id) as IDBRequest<undefined>);
      await req(meta, meta.delete(id) as IDBRequest<undefined>);
    });
  } catch {
    /* ignore */
  }
  await clearVideoPartial(id);
}

export async function clearAllOfflineVideos(): Promise<number> {
  const rows = await listOfflineVideos();
  for (const row of rows) await removeOfflineVideo(row.id);
  return rows.length;
}

/* ------------------------------------------------------------------ partials */

async function getPartial(id: string): Promise<PartialRecord | null> {
  try {
    return await withPartials("readonly", async (p) => {
      const rec = await req(p, p.get(id) as IDBRequest<PartialRecord | undefined>);
      return rec ?? null;
    });
  } catch {
    return null;
  }
}

async function putPartial(rec: PartialRecord): Promise<void> {
  try {
    await withPartials("readwrite", async (p) => {
      await req(p, p.put(rec, rec.id) as IDBRequest<IDBValidKey>);
    });
  } catch {
    /* resume is an optimisation, not a requirement */
  }
}

export async function clearVideoPartial(id: string): Promise<void> {
  try {
    await withPartials("readwrite", async (p) => {
      await req(p, p.delete(id) as IDBRequest<undefined>);
    });
  } catch {
    /* ignore */
  }
}

export async function getVideoPartialProgress(
  id: string,
): Promise<{ received: number; total: number | null } | null> {
  const rec = await getPartial(id);
  return rec ? { received: rec.received, total: rec.total } : null;
}

/* ------------------------------------------------------------------ download */

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

class VideoDownloadError extends Error {
  readonly retryable: boolean;
  readonly status?: number;
  constructor(message: string, opts: { status?: number; retryable: boolean }) {
    super(message);
    this.name = "VideoDownloadError";
    this.status = opts.status;
    this.retryable = opts.retryable;
  }
}

export function videoBackoffDelay(attempt: number, maxBackoffMs: number): number {
  const ceiling = Math.min(maxBackoffMs, 1000 * 2 ** attempt);
  return Math.round(Math.random() * ceiling);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

function abortError(): Error {
  const e = new Error("Download cancelled");
  e.name = "AbortError";
  return e;
}

export interface SaveVideoOptions {
  onProgress?: (pct: number) => void;
  onRetry?: (info: { attempt: number; maxAttempts: number; delayMs: number; error: Error }) => void;
  signal?: AbortSignal;
}

async function downloadAttempt(
  id: string,
  url: string,
  opts: SaveVideoOptions,
): Promise<Blob> {
  const settings = getOfflineSettings();
  const existing = settings.resume ? await getPartial(id) : null;
  const headers: Record<string, string> = {};
  if (existing && existing.received > 0) headers.Range = `bytes=${existing.received}-`;

  let res: Response;
  try {
    res = await fetch(url, { headers, signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw abortError();
    throw new VideoDownloadError("Download failed (network)", { retryable: true });
  }

  if (res.status === 416) {
    // The cached range is no longer valid — start over.
    await clearVideoPartial(id);
    throw new VideoDownloadError("Download restarted", { retryable: true });
  }
  if (!res.ok && res.status !== 206) {
    throw new VideoDownloadError(`Download failed (${res.status})`, {
      status: res.status,
      retryable: RETRYABLE_STATUS.has(res.status),
    });
  }

  const validator = res.headers.get("etag") ?? res.headers.get("last-modified") ?? null;
  const resumed = res.status === 206 && existing && (!validator || validator === existing.validator);
  const chunks: BlobPart[] = resumed && existing ? [existing.blob] : [];
  let received = resumed && existing ? existing.received : 0;

  const lengthHeader = Number(res.headers.get("content-length") ?? "");
  const total = Number.isFinite(lengthHeader) && lengthHeader > 0 ? received + lengthHeader : null;

  const reader = res.body?.getReader();
  const mimeType = res.headers.get("content-type") ?? "video/mp4";

  if (!reader) {
    const blob = await res.blob();
    await clearVideoPartial(id);
    opts.onProgress?.(100);
    return blob;
  }

  let lastPersist = Date.now();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (opts.signal?.aborted) throw abortError();
    chunks.push(value);
    received += value.byteLength;
    if (total) opts.onProgress?.(Math.min(99, Math.round((received / total) * 100)));
    // Persist periodically so a crash or backgrounding keeps the progress.
    if (settings.resume && Date.now() - lastPersist > 4000) {
      lastPersist = Date.now();
      await putPartial({
        id,
        blob: new Blob(chunks.slice(), { type: mimeType }),
        received,
        total,
        validator,
        updatedAt: Date.now(),
      });
    }
  }

  if (total && received < total) {
    if (settings.resume) {
      await putPartial({
        id,
        blob: new Blob(chunks, { type: mimeType }),
        received,
        total,
        validator,
        updatedAt: Date.now(),
      });
    }
    throw new VideoDownloadError("Download incomplete", { retryable: true });
  }

  await clearVideoPartial(id);
  opts.onProgress?.(100);
  return new Blob(chunks, { type: mimeType });
}

/**
 * Downloads a native upload and stores it for offline playback. Retries
 * transient failures with jittered backoff, bounded by the user's settings.
 */
export async function saveOfflineVideo(
  descriptor: {
    id: string;
    url: string;
    title: string;
    creator?: string | null;
    language?: string | null;
  },
  opts: SaveVideoOptions = {},
): Promise<OfflineVideoMeta> {
  const { maxAttempts, maxTotalMs, maxBackoffMs } = getOfflineSettings();
  const startedAt = Date.now();

  let blob: Blob | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw abortError();
    try {
      blob = await downloadAttempt(descriptor.id, descriptor.url, opts);
      break;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === "AbortError") throw err;
      const retryable = e instanceof VideoDownloadError ? e.retryable : false;
      const lastAttempt = attempt === maxAttempts - 1;
      const delay = videoBackoffDelay(attempt, maxBackoffMs);
      const outOfTime = Date.now() - startedAt + delay > maxTotalMs;
      if (!retryable || lastAttempt || outOfTime) throw err;
      opts.onRetry?.({ attempt: attempt + 1, maxAttempts, delayMs: delay, error: err });
      await wait(delay, opts.signal);
    }
  }
  if (!blob) throw new Error("Download failed");

  const meta: OfflineVideoMeta = {
    id: descriptor.id,
    title: descriptor.title,
    creator: descriptor.creator ?? null,
    language: descriptor.language ?? null,
    bytes: blob.size,
    mimeType: blob.type || null,
    savedAt: Date.now(),
  };
  const finished = blob;
  await withStores("readwrite", async (videos, metaStore) => {
    await req(videos, videos.put(finished, meta.id) as IDBRequest<IDBValidKey>);
    await req(metaStore, metaStore.put(meta, meta.id) as IDBRequest<IDBValidKey>);
  });
  return meta;
}

/** Best-effort device storage estimate, shared with the audio storage screen. */
export async function offlineVideoQuotaEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (!estimate) return null;
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}
