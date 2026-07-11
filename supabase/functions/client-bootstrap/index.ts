// Platform-neutral bootstrap payload for constrained clients (watch, widget, TV).
// Returns everything a fresh client needs in one round-trip.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const anonClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  let userId: string | null = null;
  let profile: unknown = null;
  let entitlement: { plan: string; expires_at: string | null } = { plan: "free", expires_at: null };
  let preferences: Record<string, unknown> = {};

  if (authHeader) {
    const { data: userData } = await anonClient.auth.getUser();
    userId = userData.user?.id ?? null;

    if (userId) {
      const [profileRes, entRes, prefsRes] = await Promise.all([
        anonClient.from("profiles").select("display_name, avatar_url, locale").eq("user_id", userId).maybeSingle(),
        anonClient.from("entitlements").select("plan, expires_at").eq("user_id", userId).maybeSingle(),
        anonClient.from("user_preferences_v2").select("key, value").eq("user_id", userId),
      ]);
      profile = profileRes.data;
      if (entRes.data) entitlement = entRes.data as typeof entitlement;
      for (const row of prefsRes.data ?? []) preferences[(row as any).key] = (row as any).value;
    }
  }

  const body = {
    server_time: new Date().toISOString(),
    user_id: userId,
    profile,
    entitlement,
    preferences,
    feature_flags: {
      premium_ui_enabled: false,
      moderation_reporting: true,
      dhikr_counter: true,
      salah_tracker: true,
      prayer_times: true,
      qibla: true,
    },
    capabilities: {
      // Clients may echo their own capabilities via ?platform=; server stays neutral.
      platforms: ["web", "ios", "android", "watchos", "wearos", "tvos", "carplay", "androidauto"],
    },
  };

  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": userId ? "private, max-age=30" : "public, max-age=60",
    },
  });
});
