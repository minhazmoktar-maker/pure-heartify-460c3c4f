/**
 * log-privileged-action — writes to privileged_actions_log with the caller's
 * request IP and user-agent captured server-side (values the client cannot
 * spoof). Only authenticated Owners and Admins may write; entries are
 * always attributed to the caller's own user_id.
 *
 * POST body:
 *   {
 *     action: string,
 *     target_type?: string,
 *     target_id?: string,
 *     previous_state?: any,
 *     new_state?: any,
 *     success?: boolean,
 *     failure_reason?: string,
 *     metadata?: any
 *   }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  // Verify caller
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: authHeader },
  });
  if (!userRes.ok) return json({ error: "unauthorized" }, 401);
  const user = await userRes.json();
  if (!user?.id) return json({ error: "unauthorized" }, 401);

  // Determine effective role via server-side checks
  const [ownerRes, adminRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/platform_owners?user_id=eq.${user.id}&select=user_id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    }),
    fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${user.id}&role=eq.admin&select=role`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    ),
  ]);
  const isOwner = ownerRes.ok && ((await ownerRes.json()) as unknown[]).length > 0;
  const isAdmin = adminRes.ok && ((await adminRes.json()) as unknown[]).length > 0;

  if (!isOwner && !isAdmin) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const action = typeof body.action === "string" ? body.action.slice(0, 128) : null;
  if (!action) return json({ error: "action required" }, 400);

  const payload = {
    user_id: user.id,
    user_email: user.email ?? null,
    actor_role: isOwner ? "owner" : "admin",
    action,
    target_type: (body.target_type as string | null) ?? null,
    target_id: (body.target_id as string | null) ?? null,
    previous_state: body.previous_state ?? null,
    new_state: body.new_state ?? null,
    success: body.success === undefined ? true : !!body.success,
    failure_reason: (body.failure_reason as string | null) ?? null,
    metadata: body.metadata ?? null,
    ip_address: clientIp(req),
    user_agent: req.headers.get("user-agent"),
    session_id: req.headers.get("x-client-info"),
  };

  const insRes = await fetch(`${SUPABASE_URL}/rest/v1/privileged_actions_log`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!insRes.ok) {
    const text = await insRes.text();
    return json({ error: "insert failed", detail: text.slice(0, 200) }, 500);
  }

  return json({ ok: true });
});
