// Simple database-backed rate limiter for Edge Functions.
//
// Buckets requests per (identity, action) into a fixed time window using an
// atomic upsert against public.rate_limit_counters. Fail-open on database
// errors so a transient outage never takes down a whole endpoint — the goal
// is to protect against abuse & budget-drain, not to be a hard security gate.
//
// Usage:
//   const limited = await enforceRateLimit(admin, {
//     identity: userId ?? clientIp,
//     action: "recommendations",
//     limit: 60,
//     windowSeconds: 60,
//   });
//   if (limited) return json({ error: "Rate limit exceeded" }, 429);

// Structural client type: avoids a runtime-only `npm:` specifier so this module
// can also be imported by the Vite/Vitest typechecker.
export interface RateLimitClient {
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
}

export interface RateLimitOptions {
  identity: string;
  action: string;
  limit: number;
  windowSeconds: number;
  /**
   * Count every request in the shared counter instead of sampling.
   * Use for low-volume paths that guard real spend (paid AI calls), where an
   * approximate per-isolate ceiling would let a client multiply its quota by
   * the number of isolates it happens to land on.
   */
  precise?: boolean;
}


// In-isolate counters. Under heavy traffic the database round-trip for every
// single request is itself the bottleneck (one hot-row write per request), so
// each isolate counts locally, blocks abusers immediately without touching the
// database, and only samples a fraction of requests into the shared counter to
// keep global visibility. Effective ceiling is per-isolate, which is fine: the
// limits exist to stop abuse and budget drain, not to be an exact quota.
const localCounts = new Map<string, { bucket: number; count: number }>();
const LOCAL_MAX_KEYS = 20_000;
const DB_SAMPLE_EVERY = 10;

function bumpLocal(key: string, bucket: number): number {
  const cur = localCounts.get(key);
  if (!cur || cur.bucket !== bucket) {
    if (localCounts.size > LOCAL_MAX_KEYS) localCounts.clear();
    localCounts.set(key, { bucket, count: 1 });
    return 1;
  }
  cur.count += 1;
  return cur.count;
}

export async function enforceRateLimit(
  admin: RateLimitClient,
  opts: RateLimitOptions,
): Promise<boolean> {
  try {
    const now = Date.now();
    const bucketMs = opts.windowSeconds * 1000;
    const bucketStart = Math.floor(now / bucketMs);
    const bucket = new Date(bucketStart * bucketMs).toISOString();

    const localKey = `${opts.action}:${opts.identity}`;
    const localCount = bumpLocal(localKey, bucketStart);
    if (localCount > opts.limit) return true;
    // Sample only: keeps the shared counter useful for abuse analytics without
    // a database write on every request. Precise callers always write.
    if (!opts.precise && localCount % DB_SAMPLE_EVERY !== 1) return false;



    // Upsert atomic increment. Requires the rate_limit_counters table
    // (see migration). Returns the current count for this bucket.
    const { data, error } = await admin.rpc('rate_limit_increment', {
      _identity: opts.identity,
      _action: opts.action,
      _bucket: bucket,
    });

    if (error) {
      console.warn('[rate-limit] fail-open due to error:', error.message);
      return false;
    }
    const count = typeof data === 'number'
      ? data
      : ((data as { count?: number }[] | null)?.[0]?.count ?? 0);
    return count > opts.limit;
  } catch (e) {
    console.warn('[rate-limit] fail-open due to exception:', e);
    return false;
  }
}

export function getClientIdentity(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  // Prefer standard proxy headers so we don't group all users behind one IP.
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  const ip = fwd.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  return `ip:${ip}`;
}
