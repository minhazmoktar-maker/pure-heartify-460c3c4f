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
 * without throwing. Returns null when the token is absent or invalid.
 */
export async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
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
