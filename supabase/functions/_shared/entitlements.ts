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
 * without throwing. Returns null when the token is absent, invalid, expired,
 * unsigned/forged, or is an anon/service key.
 *
 * The token signature is ALWAYS verified against the auth server before any
 * claim is trusted — a locally decoded payload is never authoritative. The
 * local decode is used only as a negative fast-path (anon/service tokens and
 * malformed tokens resolve to null without a network round-trip), plus a
 * short-lived positive cache keyed by the full token so repeat calls from the
 * same session don't re-hit the auth server on every request.
 */
const VERIFIED_TTL_MS = 60_000;
const verifiedCache = new Map<string, { userId: string; at: number }>();

export async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;

  // Negative fast-path only: never trust `sub` from this decode.
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const seg = parts[1];
    const b64 = seg.replace(/-/g, "+").replace(/_/g, "/").padEnd(
      seg.length + ((4 - seg.length % 4) % 4),
      "=",
    );
    const payload = JSON.parse(atob(b64));
    const role = payload?.role;
    if (role === "anon" || role === "service_role") return null;
    if (typeof payload?.exp === "number" && payload.exp * 1000 <= Date.now()) return null;
    if (typeof payload?.sub !== "string" || !payload.sub) return null;
  } catch {
    return null;
  }

  const hit = verifiedCache.get(token);
  if (hit && Date.now() - hit.at < VERIFIED_TTL_MS) return hit.userId;

  try {
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    // Cryptographically validates the signature (JWKS / project secret).
    const { data, error } = await client.auth.getClaims(token);
    const sub = data?.claims?.sub;
    if (error || !sub) return null;
    const userId = String(sub);
    if (verifiedCache.size > 500) verifiedCache.clear();
    verifiedCache.set(token, { userId, at: Date.now() });
    return userId;
  } catch {
    return null;
  }
}

