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
  const value = await singleFlight(key, producer);
  cacheSet(key, value, ttlSeconds);
  return { value, hit: false };
}

/**
 * Stampede guard: concurrent callers of the same key inside one isolate share a
 * single producer run instead of each hammering the database.
 */
const inflight = new Map<string, Promise<unknown>>();

async function singleFlight<T>(key: string, producer: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return await existing;
  const p = (async () => {
    try {
      return await producer();
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return await p;
}

interface SharedCacheClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        maybeSingle(): Promise<{
          data: { payload: unknown; expires_at: string } | null;
          error: unknown;
        }>;
      };
    };
    upsert(row: Record<string, unknown>, opts: { onConflict: string }): Promise<{ error: unknown }>;
  };
}

/** How long an expired entry may still be served while it refreshes. */
const STALE_GRACE_MS = 10 * 60 * 1000;

/**
 * Cross-instance read-through cache backed by public.edge_response_cache.
 *
 * Deno Deploy runs many isolates, so the in-process cache alone leaves most
 * anonymous requests cold under real traffic. This layers a single indexed
 * primary-key lookup (~1ms) in front of the expensive pipelines, so a burst of
 * thousands of simultaneous anonymous visitors costs one heavy computation per
 * TTL window globally instead of one per isolate.
 *
 * Expiry is served stale-while-revalidate: when the TTL lapses, callers keep
 * getting the last good payload instantly and one background refresh replaces
 * it. Without that, every TTL boundary turns a traffic spike into a herd of
 * simultaneous expensive recomputations (measured: 13-25s p50 at 100 concurrent
 * cold callers).
 *
 * Only use for responses that do not depend on a userId, entitlement, or
 * session. Fails open: any cache error falls back to computing the value.
 */
export async function readThroughShared<T>(
  admin: SharedCacheClient,
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const local = cacheGet<T>(key);
  if (local !== null) return { value: local, hit: true };

  const write = async (value: T) => {
    try {
      await admin.from("edge_response_cache").upsert({
        cache_key: key,
        payload: value,
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      }, { onConflict: "cache_key" });
    } catch {
      // fail open
    }
  };

  try {
    const { data } = await admin
      .from("edge_response_cache")
      .select("payload,expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (data?.payload) {
      const value = data.payload as T;
      const age = Date.now() - new Date(data.expires_at).getTime();
      if (age < 0) {
        cacheSet(key, value, Math.min(ttlSeconds, 60));
        return { value, hit: true };
      }
      if (age < STALE_GRACE_MS) {
        // Serve stale now, refresh once in the background.
        cacheSet(key, value, 15);
        if (!inflight.has(key)) {
          void singleFlight(key, producer)
            .then((fresh) => {
              cacheSet(key, fresh, Math.min(ttlSeconds, 60));
              return write(fresh);
            })
            .catch(() => {});
        }
        return { value, hit: true };
      }
    }
  } catch {
    // fail open
  }


  const value = await singleFlight(key, producer);
  cacheSet(key, value, Math.min(ttlSeconds, 60));
  try {
    await admin.from("edge_response_cache").upsert({
      cache_key: key,
      payload: value,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    }, { onConflict: "cache_key" });
  } catch {
    // fail open
  }
  return { value, hit: false };
}

