// Recompute channel trust scores.
// - POST { channel_id }     -> recompute one channel
// - POST { all: true, limit } -> recompute a batch (staleness-ordered)
// Callable by admins (verified JWT) or by internal cron (AUDIT_CRON_TOKEN).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_TOKEN = Deno.env.get("AUDIT_CRON_TOKEN") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await safeJson(req);

  // Auth: cron token OR admin JWT
  const cronHeader = req.headers.get("x-cron-token");
  let authorized = !!cronHeader && cronHeader === CRON_TOKEN;
  let actorId: string | null = null;

  if (!authorized) {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const { data: userRes } = await admin.auth.getUser(jwt);
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: role } = await admin
      .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle();
    const { data: owner } = await admin
      .from("platform_owners").select("user_id").eq("user_id", uid).maybeSingle();
    if (!role && !owner) return json({ error: "forbidden" }, 403);
    authorized = true;
    actorId = uid;
  }

  try {
    if (body?.all) {
      const limit = Math.min(2000, Math.max(1, Number(body.limit ?? 500)));
      const { data, error } = await admin.rpc("recompute_all_channel_trust", { _limit: limit });
      if (error) throw error;
      return json({ ok: true, recomputed: data ?? 0, actor_id: actorId });
    }
    const id = String(body?.channel_id ?? "");
    if (!id) return json({ error: "channel_id required" }, 400);
    const { data, error } = await admin.rpc("recompute_channel_trust", { _channel_id: id });
    if (error) throw error;
    return json({ ok: true, channel_id: id, score: data, actor_id: actorId });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});

async function safeJson(req: Request): Promise<Record<string, unknown> | null> {
  try { return await req.json(); } catch { return null; }
}
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
