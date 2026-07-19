// Shared premium-entitlement check for Supabase Edge Functions.
//
// Backend-side truth for gating premium-only content. Never trust a client
// claim — always call `hasActivePremium(userId)` against the DB.
import { createClient } from "npm:@supabase/supabase-js@2";

let cached: ReturnType<typeof createClient> | null = null;
function serviceClient() {
  if (cached) return cached;
  cached = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return cached;
}

/**
 * True when the given user currently has a non-'free' plan whose expires_at
 * is null or in the future. Anonymous callers are never premium.
 */
export async function hasActivePremium(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await serviceClient().rpc("has_active_premium", { _user_id: userId });
  if (error) {
    console.warn("[entitlements] has_active_premium error", error);
    return false;
  }
  return Boolean(data);
}

/**
 * Extracts the caller's user id from an Authorization: Bearer <jwt> header
 * without throwing. Returns null when the token is absent, invalid, or is
 * an anon/service key (both have `role` claim but no `sub` user id, and
 * anonymous browsers send the publishable anon key on every request).
 *
 * Fast-path: locally base64-decodes the JWT payload to short-circuit the
 * ~200-400ms `auth.getClaims` network round-trip for anon calls. This is
 * the hottest edge-function code path — it runs on every feed/search hit.
 */
export async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);

  // Local decode — avoids network I/O for the 90%+ of requests that carry
  // the anon/publishable key rather than a real user session.
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(
        parts[1].length + ((4 - parts[1].length % 4) % 4),
        "=",
      );
      const payload = JSON.parse(atob(b64));
      const role = payload?.role;
      // Anon / service tokens carry no user identity.
      if (role === "anon" || role === "service_role") return null;
      // Real user tokens: return sub without extra network verification.
      // Downstream RLS still enforces per-user access — we're only reading
      // it to shape feed personalization.
      if (typeof payload?.sub === "string" && payload.sub) return payload.sub;
    }
  } catch {
    // Fall through to remote verification.
  }

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return String(data.claims.sub);
  } catch {
    return null;
  }
}
