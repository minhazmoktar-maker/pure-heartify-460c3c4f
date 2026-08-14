/**
 * IndexedDB-backed offline audio cache.
 *
 * Two object stores:
 * - `tracks`: the audio Blob keyed by Track.id
 * - `meta`:   { id, savedAt, expiresAt, plan } keyed by Track.id
 *
 * Entitlement rules (enforced by helpers below — callers should always use
 * `saveOfflineTrackGated` / `getOfflineBlobUrlGated` when the caller may not
 * be a Heartify+ member):
 * - Free users: up to 5 offline tracks, each expires after 24h.
 * - Plus users: unlimited tracks, no client-side expiry.
 * The server is still the source of truth for who is Plus — this layer only
 * mirrors that so free users can't hoard downloads indefinitely.
 */
const DB_NAME = "heartify-audio";
const STORE = "tracks";
const META_STORE = "meta";
const VERSION = 2;

const FREE_LIMIT = 5;
const FREE_TTL_MS = 24 * 60 * 60 * 1000;

export interface OfflineMeta {
  id: string;
  savedAt: number;
  expiresAt: number | null; // null = never expires (Plus)
  plan: "free" | "premium";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
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

const RETRY_ATTEMPTS = 4;
const RETRY_BASE_MS = 600;
const RETRY_MAX_MS = 8_000;

class DownloadError extends Error {
  status?: number;
  retryable: boolean;
  constructor(message: string, opts: { status?: number; retryable: boolean }) {
    super(message);
    this.name = "DownloadError";
    this.status = opts.status;
    this.retryable = opts.retryable;
  }
}

function backoffDelay(attempt: number): number {
  const expo = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempt);
  // Full jitter avoids thundering herds when many tracks retry at once.
  return Math.round(expo * (0.5 + Math.random() * 0.5));
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function fetchAudio(url: string): Promise<Response> {
  try {
    const direct = await fetch(url, { mode: "cors" });
    if (direct.ok) return direct;
  } catch {
    /* CORS / network failure — fall through to the proxy */
  }
  const proxy = proxiedUrl(url);
  if (!proxy) throw new DownloadError("Download failed (network)", { retryable: true });
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  let res: Response;
  try {
    res = await fetch(proxy, {
      headers: anon ? { apikey: anon, Authorization: `Bearer ${anon}` } : undefined,
    });
  } catch (e) {
    throw new DownloadError(
      e instanceof Error ? e.message : "Download failed (network)",
      { retryable: true },
    );
  }
  if (!res.ok) {
    throw new DownloadError(`Download failed (${res.status})`, {
      status: res.status,
      retryable: RETRYABLE_STATUS.has(res.status),
    });
  }
  return res;
}

async function downloadBlob(url: string, onProgress?: (pct: number) => void): Promise<Blob> {
  const res = await fetchAudio(url);
  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.byteLength;
          if (total && onProgress) onProgress(Math.min(100, Math.round((received / total) * 100)));
        }
      }
    } else {
      chunks.push(new Uint8Array(await res.arrayBuffer()));
    }
  } catch (e) {
    // A stream that dies mid-transfer is transient — allow a retry.
    throw new DownloadError(
      e instanceof Error ? e.message : "Download interrupted",
      { retryable: true },
    );
  }
  if (total && received < total) {
    throw new DownloadError("Download incomplete", { retryable: true });
  }
  return new Blob(chunks as BlobPart[], {
    type: res.headers.get("content-type") || "audio/mpeg",
  });
}

export async function saveOfflineTrack(
  id: string,
  url: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  let lastErr: unknown;
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < RETRY_ATTEMPTS; attempt++) {
    try {
      if (attempt > 0) onProgress?.(0);
      blob = await downloadBlob(url, onProgress);
      break;
    } catch (e) {
      lastErr = e;
      const retryable = e instanceof DownloadError ? e.retryable : false;
      if (!retryable || attempt === RETRY_ATTEMPTS - 1) throw e;
      await wait(backoffDelay(attempt));
    }
  }
  if (!blob) throw lastErr instanceof Error ? lastErr : new Error("Download failed");
  await withStores("readwrite", async (tracks) => {
    await req(tracks, tracks.put(blob as Blob, id) as IDBRequest<IDBValidKey>);
  });
  onProgress?.(100);
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
    onProgress?: (pct: number) => void;
  },
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
  await saveOfflineTrack(id, url, opts.onProgress);
  await writeMeta(id, opts.isPremium ? "premium" : "free");
}

export async function removeOfflineTrack(id: string): Promise<void> {
  try {
    await withStores("readwrite", async (tracks, meta) => {
      await req(tracks, tracks.delete(id) as IDBRequest<undefined>);
      await req(meta, meta.delete(id) as IDBRequest<undefined>);
    });
  } catch { /* ignore */ }
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
