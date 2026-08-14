/**
 * IndexedDB-backed offline audio cache.
 *
 * Object stores:
 * - `tracks`:   the completed audio Blob keyed by Track.id
 * - `meta`:     { id, savedAt, expiresAt, plan } keyed by Track.id
 * - `partials`: { id, blob, received, total, validator } — bytes already
 *               fetched for an in-flight download so an interrupted transfer
 *               can resume with an HTTP Range request instead of restarting.
 *
 * Entitlement rules (enforced by helpers below — callers should always use
 * `saveOfflineTrackGated` / `getOfflineBlobUrlGated` when the caller may not
 * be a Heartify+ member):
 * - Free users: up to 5 offline tracks, each expires after 24h.
 * - Plus users: unlimited tracks, no client-side expiry.
 * The server is still the source of truth for who is Plus — this layer only
 * mirrors that so free users can't hoard downloads indefinitely.
 *
 * Retry/backoff/resume behaviour is user-tunable via `offlineSettings`.
 */
import { getOfflineSettings } from "@/lib/offlineSettings";

const DB_NAME = "heartify-audio";
const STORE = "tracks";
const META_STORE = "meta";
const PARTIAL_STORE = "partials";
const VERSION = 3;

const FREE_LIMIT = 5;
const FREE_TTL_MS = 24 * 60 * 60 * 1000;

export interface OfflineMeta {
  id: string;
  savedAt: number;
  expiresAt: number | null; // null = never expires (Plus)
  plan: "free" | "premium";
}

interface PartialRecord {
  id: string;
  blob: Blob;
  received: number;
  total: number | null;
  /** ETag / Last-Modified so we never stitch bytes from two different files. */
  validator: string | null;
  updatedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      if (!db.objectStoreNames.contains(PARTIAL_STORE)) db.createObjectStore(PARTIAL_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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
  fn: (tracks: IDBObjectStore, meta: IDBObjectStore) => Promise<T>,
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

export async function hasOfflineTrack(id: string): Promise<boolean> {
  try {
    return await withStores("readonly", async (tracks) => {
      const key = await req(tracks, tracks.getKey(id) as IDBRequest<IDBValidKey | undefined>);
      return key != null;
    });
  } catch { return false; }
}

export async function listOfflineIds(): Promise<string[]> {
  try {
    return await withStores("readonly", async (tracks) => {
      const keys = await req(tracks, tracks.getAllKeys() as IDBRequest<IDBValidKey[]>);
      return keys.map(String);
    });
  } catch { return []; }
}

export async function getOfflineMeta(id: string): Promise<OfflineMeta | null> {
  try {
    return await withStores("readonly", async (_t, meta) => {
      const m = await req(meta, meta.get(id) as IDBRequest<OfflineMeta | undefined>);
      return m ?? null;
    });
  } catch { return null; }
}

export async function listOfflineMeta(): Promise<OfflineMeta[]> {
  try {
    return await withStores("readonly", async (_t, meta) => {
      const values = await req(meta, meta.getAll() as IDBRequest<OfflineMeta[]>);
      return values ?? [];
    });
  } catch { return []; }
}

/**
 * Sweep expired free-tier downloads. Safe to call on app boot or before any
 * playback. Returns the ids that were purged.
 */
export async function purgeExpiredOffline(): Promise<string[]> {
  const now = Date.now();
  const purged: string[] = [];
  const all = await listOfflineMeta();
  for (const m of all) {
    if (m.expiresAt !== null && m.expiresAt <= now) {
      await removeOfflineTrack(m.id);
      purged.push(m.id);
    }
  }
  return purged;
}

async function writeMeta(id: string, plan: "free" | "premium"): Promise<void> {
  const savedAt = Date.now();
  const expiresAt = plan === "premium" ? null : savedAt + FREE_TTL_MS;
  await withStores("readwrite", async (_t, meta) => {
    await req(meta, meta.put({ id, savedAt, expiresAt, plan } as OfflineMeta, id) as IDBRequest<IDBValidKey>);
  });
}

/* ------------------------------------------------------------------ partials */

async function getPartial(id: string): Promise<PartialRecord | null> {
  try {
    return await withPartials("readonly", async (p) => {
      const rec = await req(p, p.get(id) as IDBRequest<PartialRecord | undefined>);
      return rec ?? null;
    });
  } catch { return null; }
}

async function putPartial(rec: PartialRecord): Promise<void> {
  try {
    await withPartials("readwrite", async (p) => {
      await req(p, p.put(rec, rec.id) as IDBRequest<IDBValidKey>);
    });
  } catch { /* best-effort: resume is an optimisation, not a requirement */ }
}

export async function clearPartial(id: string): Promise<void> {
  try {
    await withPartials("readwrite", async (p) => {
      await req(p, p.delete(id) as IDBRequest<undefined>);
    });
  } catch { /* ignore */ }
}

/** Bytes already buffered for a not-yet-finished download (for UI display). */
export async function getPartialProgress(
  id: string,
): Promise<{ received: number; total: number | null } | null> {
  const rec = await getPartial(id);
  return rec ? { received: rec.received, total: rec.total } : null;
}

/* ------------------------------------------------------------------ download */

/**
 * Many recitation CDNs allow <audio> playback but send no CORS headers, so a
 * direct `fetch()` for the bytes fails. `audio-proxy` re-streams allowlisted
 * hosts with CORS so downloads succeed on every platform (notably iOS Safari).
 */
function proxiedUrl(url: string): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) return null;
  return `${base}/functions/v1/audio-proxy?url=${encodeURIComponent(url)}`;
}

/** Transient statuses worth retrying (timeouts, rate limits, gateway blips). */
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const RETRY_BASE_MS = 600;

export class DownloadError extends Error {
  status?: number;
  retryable: boolean;
  constructor(message: string, opts: { status?: number; retryable: boolean }) {
    super(message);
    this.name = "DownloadError";
    this.status = opts.status;
    this.retryable = opts.retryable;
  }
}

function backoffDelay(attempt: number, maxBackoffMs: number): number {
  const expo = Math.min(maxBackoffMs, RETRY_BASE_MS * 2 ** attempt);
  // Full jitter avoids thundering herds when many tracks retry at once.
  return Math.round(expo * (0.5 + Math.random() * 0.5));
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(abortError()); }, { once: true });
  });

function abortError(): Error {
  const e = new Error("Download cancelled");
  e.name = "AbortError";
  return e;
}

function validatorOf(res: Response): string | null {
  return res.headers.get("etag") || res.headers.get("last-modified") || null;
}

/** Total size of the resource from either Content-Length or Content-Range. */
function totalSizeOf(res: Response, offset: number): number | null {
  const cr = res.headers.get("content-range"); // bytes 100-999/1000
  const slash = cr?.lastIndexOf("/") ?? -1;
  if (cr && slash > -1) {
    const n = Number(cr.slice(slash + 1));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const len = Number(res.headers.get("content-length") || 0);
  if (len > 0) return res.status === 206 ? offset + len : len;
  return null;
}

/**
 * Fetch bytes, preferring a direct CORS request and falling back to the
 * CORS-safe proxy. When `offset > 0` a Range request is issued so an
 * interrupted download resumes where it stopped.
 */
async function fetchAudio(url: string, offset: number, signal?: AbortSignal): Promise<Response> {
  const rangeHeaders = offset > 0 ? { Range: `bytes=${offset}-` } : undefined;
  try {
    const direct = await fetch(url, { mode: "cors", headers: rangeHeaders, signal });
    if (direct.ok) return direct;
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    /* CORS / network failure — fall through to the proxy */
  }
  const proxy = proxiedUrl(url);
  if (!proxy) throw new DownloadError("Download failed (network)", { retryable: true });
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  let res: Response;
  try {
    res = await fetch(proxy, {
      headers: {
        ...(rangeHeaders ?? {}),
        ...(anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : {}),
      },
      signal,
    });
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    throw new DownloadError(e instanceof Error ? e.message : "Download failed (network)", {
      retryable: true,
    });
  }
  if (!res.ok) {
    throw new DownloadError(`Download failed (${res.status})`, {
      status: res.status,
      retryable: RETRYABLE_STATUS.has(res.status),
    });
  }
  return res;
}

export interface SaveOptions {
  onProgress?: (pct: number) => void;
  /** Fired before each retry so the UI can show "retrying (2/4)". */
  onRetry?: (info: { attempt: number; maxAttempts: number; delayMs: number; error: Error }) => void;
  signal?: AbortSignal;
}

/**
 * One transfer attempt. Resumes from any buffered partial (when enabled) and
 * persists progress so the next attempt can pick up mid-file.
 */
async function downloadAttempt(
  id: string,
  url: string,
  opts: SaveOptions,
): Promise<Blob> {
  const { resume } = getOfflineSettings();
  let partial = resume ? await getPartial(id) : null;
  if (!resume && (await getPartial(id))) await clearPartial(id);

  let offset = partial?.received ?? 0;
  const res = await fetchAudio(url, offset, opts.signal);

  // Server ignored the Range request (200 instead of 206) or the file changed:
  // discard the buffer and start over.
  const serverValidator = validatorOf(res);
  const changed =
    partial && partial.validator && serverValidator && partial.validator !== serverValidator;
  if (offset > 0 && (res.status !== 206 || changed)) {
    await clearPartial(id);
    partial = null;
    offset = 0;
  }

  const total = totalSizeOf(res, offset) ?? partial?.total ?? null;
  const chunks: BlobPart[] = [];
  let received = 0;
  let lastPersist = Date.now();

  const emit = () => {
    if (total && opts.onProgress) {
      opts.onProgress(Math.min(100, Math.round(((offset + received) / total) * 100)));
    }
  };
  emit();

  const persist = async () => {
    if (!resume || chunks.length === 0) return;
    const base = partial?.blob ? [partial.blob, ...chunks] : chunks;
    const blob = new Blob(base, { type: res.headers.get("content-type") || "audio/mpeg" });
    partial = {
      id,
      blob,
      received: offset + received,
      total,
      validator: serverValidator ?? partial?.validator ?? null,
      updatedAt: Date.now(),
    };
    await putPartial(partial);
    // Buffer is now folded into `partial.blob`; reset local state so we never
    // write the same bytes twice.
    offset = partial.received;
    received = 0;
    chunks.length = 0;
  };

  const reader = res.body?.getReader();
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value as BlobPart);
          received += value.byteLength;
          emit();
          // Checkpoint every ~2s so a mid-file failure keeps most of the work.
          if (Date.now() - lastPersist > 2_000) {
            await persist();
            lastPersist = Date.now();
          }
        }
      }
    } else {
      const buf = new Uint8Array(await res.arrayBuffer());
      chunks.push(buf as BlobPart);
      received += buf.byteLength;
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") throw e;
    await persist(); // keep what we got so the retry can resume
    throw new DownloadError(e instanceof Error ? e.message : "Download interrupted", {
      retryable: true,
    });
  }

  const finalBlob = new Blob(partial?.blob ? [partial.blob, ...chunks] : chunks, {
    type: res.headers.get("content-type") || "audio/mpeg",
  });

  if (total && finalBlob.size < total) {
    await persist();
    throw new DownloadError("Download incomplete", { retryable: true });
  }
  return finalBlob;
}

export async function saveOfflineTrack(
  id: string,
  url: string,
  onProgressOrOpts?: ((pct: number) => void) | SaveOptions,
): Promise<void> {
  const opts: SaveOptions =
    typeof onProgressOrOpts === "function" ? { onProgress: onProgressOrOpts } : onProgressOrOpts ?? {};
  const { maxAttempts, maxTotalMs, maxBackoffMs } = getOfflineSettings();
  const startedAt = Date.now();

  let blob: Blob | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw abortError();
    try {
      blob = await downloadAttempt(id, url, opts);
      break;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.name === "AbortError") throw err;
      const retryable = e instanceof DownloadError ? e.retryable : false;
      const lastAttempt = attempt === maxAttempts - 1;
      const delay = backoffDelay(attempt, maxBackoffMs);
      const outOfTime = Date.now() - startedAt + delay > maxTotalMs;
      if (!retryable || lastAttempt || outOfTime) throw err;
      opts.onRetry?.({ attempt: attempt + 1, maxAttempts, delayMs: delay, error: err });
      await wait(delay, opts.signal);
    }
  }
  if (!blob) throw new Error("Download failed");

  const finished = blob;
  await withStores("readwrite", async (tracks) => {
    await req(tracks, tracks.put(finished, id) as IDBRequest<IDBValidKey>);
  });
  await clearPartial(id);
  opts.onProgress?.(100);
}

/**
 * Entitlement-aware save. Enforces the free-tier cap + writes meta so
 * `purgeExpiredOffline` can reclaim the slot after 24h.
 *
 * Throws with a stable code so the UI can show the right upsell copy:
 * - `OFFLINE_FREE_LIMIT`
 * - `OFFLINE_TRACK_PREMIUM` (attempting to save a premium-only track as free)
 */
export async function saveOfflineTrackGated(
  id: string,
  url: string,
  opts: {
    isPremium: boolean;
    trackIsPremium?: boolean;
  } & SaveOptions,
): Promise<void> {
  if (opts.trackIsPremium && !opts.isPremium) {
    const e = new Error("This track requires Heartify+.");
    (e as Error & { code?: string }).code = "OFFLINE_TRACK_PREMIUM";
    throw e;
  }
  if (!opts.isPremium) {
    await purgeExpiredOffline();
    const meta = await listOfflineMeta();
    const active = meta.filter((m) => m.plan === "free");
    if (!(await hasOfflineTrack(id)) && active.length >= FREE_LIMIT) {
      const e = new Error(`Free plan allows up to ${FREE_LIMIT} offline tracks.`);
      (e as Error & { code?: string }).code = "OFFLINE_FREE_LIMIT";
      throw e;
    }
  }
  await saveOfflineTrack(id, url, {
    onProgress: opts.onProgress,
    onRetry: opts.onRetry,
    signal: opts.signal,
  });
  await writeMeta(id, opts.isPremium ? "premium" : "free");
}

export async function removeOfflineTrack(id: string): Promise<void> {
  try {
    await withStores("readwrite", async (tracks, meta) => {
      await req(tracks, tracks.delete(id) as IDBRequest<undefined>);
      await req(meta, meta.delete(id) as IDBRequest<undefined>);
    });
  } catch { /* ignore */ }
  await clearPartial(id);
}

export async function getOfflineBlobUrl(id: string): Promise<string | null> {
  try {
    return await withStores("readonly", async (tracks) => {
      const blob = await req(tracks, tracks.get(id) as IDBRequest<Blob | undefined>);
      return blob ? URL.createObjectURL(blob) : null;
    });
  } catch { return null; }
}

/**
 * Entitlement-aware read. If the track was saved on a free plan and has
 * expired, it is purged and `null` is returned so the caller falls back to a
 * live stream (or shows an upgrade prompt).
 */
export async function getOfflineBlobUrlGated(id: string): Promise<string | null> {
  const meta = await getOfflineMeta(id);
  if (meta && meta.expiresAt !== null && meta.expiresAt <= Date.now()) {
    await removeOfflineTrack(id);
    return null;
  }
  return getOfflineBlobUrl(id);
}

export const OFFLINE_LIMITS = { FREE_LIMIT, FREE_TTL_MS } as const;
