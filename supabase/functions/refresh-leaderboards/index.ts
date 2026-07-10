import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Refresh precomputed leaderboard snapshots.
 * Called on a schedule (pg_cron / external scheduler). Safe to invoke manually.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: jsonHeaders });
  }
  const admin = createClient(url, serviceKey);
  const { error } = await admin.rpc("refresh_leaderboards");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
  }
  return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), { headers: jsonHeaders });
});
