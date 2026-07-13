import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Refresh precomputed leaderboard snapshots.
 * Called on a schedule (pg_cron / external scheduler). Gated by either the
 * shared AUDIT_CRON_TOKEN header (matches refresh-sections, recompute-channel-trust)
 * or an admin JWT so anonymous callers cannot spam the expensive RPC.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: jsonHeaders });
  }

  // Authorize: shared cron token OR admin JWT.
  const cronToken = Deno.env.get("AUDIT_CRON_TOKEN");
  const cronHeader = req.headers.get("x-cron-token") ?? "";
  let allowed = !!cronToken && cronHeader === cronToken;
  const admin = createClient(url, serviceKey);
  if (!allowed) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const sb = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
        const { data: userData } = await sb.auth.getUser();
        if (userData?.user) {
          const { data: isAdmin } = await admin.rpc("has_role", {
            _user_id: userData.user.id,
            _role: "admin",
          });
          allowed = !!isAdmin;
        }
      } catch { /* fallthrough */ }
    }
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
  }

  const { error } = await admin.rpc("refresh_leaderboards");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
  }
  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), { headers: jsonHeaders });
});
