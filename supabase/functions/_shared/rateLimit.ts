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

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface RateLimitOptions {
  identity: string;
  action: string;
  limit: number;
  windowSeconds: number;
}

export async function enforceRateLimit(
  admin: SupabaseClient,
  opts: RateLimitOptions,
): Promise<boolean> {
  try {
    const now = Date.now();
    const bucketMs = opts.windowSeconds * 1000;
    const bucket = new Date(Math.floor(now / bucketMs) * bucketMs).toISOString();

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
    const count = typeof data === 'number' ? data : (data?.[0]?.count ?? 0);
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
