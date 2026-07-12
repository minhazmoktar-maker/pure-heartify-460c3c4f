/**
 * Tiny in-process TTL cache for edge functions.
 *
 * Scope note: Deno Deploy isolates are per-region and per-instance, so this is
 * a best-effort read-through cache — not a strongly consistent store. Perfect
 * for hot, anonymous, low-cardinality responses (cold-start feed pages, global
 * trending) where a 60s window of staleness is acceptable and CDN warmups keep
 * the working set hot.
 *
 * Never cache anything that depends on a userId, entitlement, or session.
 */

type Entry<T> = { value: T; expiresAt: number };

const MAX_ENTRIES = 512;
const store = new Map<string, Entry<unknown>>();

function evictIfNeeded() {
  if (store.size <= MAX_ENTRIES) return;
  // Cheap FIFO eviction — Map preserves insertion order.
  const excess = store.size - MAX_ENTRIES;
  let i = 0;
  for (const k of store.keys()) {
    store.delete(k);
    if (++i >= excess) break;
  }
}

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  evictIfNeeded();
}

export async function readThrough<T>(
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return { value: cached, hit: true };
  const value = await producer();
  cacheSet(key, value, ttlSeconds);
  return { value, hit: false };
}
