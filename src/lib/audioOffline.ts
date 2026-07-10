/**
 * Tiny IndexedDB-backed cache for downloaded audio tracks so listeners can
 * play favorites during commutes / weak signal. Keys are Track.id.
 */
const DB_NAME = "heartify-audio";
const STORE = "tracks";
const VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function hasOfflineTrack(id: string): Promise<boolean> {
  try {
    const v = await tx<IDBValidKey | undefined>("readonly", (s) => s.getKey(id) as IDBRequest<IDBValidKey | undefined>);
    return v != null;
  } catch { return false; }
}

export async function listOfflineIds(): Promise<string[]> {
  try {
    const keys = await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>);
    return keys.map(String);
  } catch { return []; }
}

export async function saveOfflineTrack(
  id: string,
  url: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get("content-length") || 0);
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
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
    const buf = new Uint8Array(await res.arrayBuffer());
    chunks.push(buf);
  }
  const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("content-type") || "audio/mpeg" });
  await tx<IDBValidKey>("readwrite", (s) => s.put(blob, id));
  onProgress?.(100);
}

export async function removeOfflineTrack(id: string): Promise<void> {
  try {
    await tx<undefined>("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
  } catch { /* ignore */ }
}

export async function getOfflineBlobUrl(id: string): Promise<string | null> {
  try {
    const blob = await tx<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
    return blob ? URL.createObjectURL(blob) : null;
  } catch { return null; }
}
