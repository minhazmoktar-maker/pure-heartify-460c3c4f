import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Thin edge wrapper around the SQL RPC `redeem_referral`.
 * The RPC does all fraud/attribution work in one transaction so this
 * function stays simple, atomic, and idempotent per invitee.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "server_misconfigured" }), { status: 500, headers: jsonHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
    }
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code || code.length < 4 || code.length > 32) {
      return new Response(JSON.stringify({ error: "invalid_code" }), { status: 400, headers: jsonHeaders });
    }

    // Fraud logging: hash IP + UA and record a click as well.
    const admin = createClient(url, serviceKey);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
    const ua = req.headers.get("user-agent") ?? "";
    const enc = new TextEncoder();
    const ipHash = ip
      ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(ip))).slice(0, 12))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : null;
    const uaHash = ua
      ? Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(ua))).slice(0, 12))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
      : null;
    await admin.from("referral_clicks").insert({ code, ip_hash: ipHash, ua_hash: uaHash }).select().maybeSingle();

    // Redeem as the calling user.
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await userClient.rpc("redeem_referral", { _code: code });
    if (error) {
      const msg = error.message || "redeem_failed";
      const status = /not_authenticated/.test(msg)
        ? 401
        : /already_redeemed|self_referral|inviter_cap|account_too_new/.test(msg)
          ? 409
          : /code_not_found|invalid_code/.test(msg)
            ? 404
            : 400;
      return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders });
    }
    return new Response(JSON.stringify(data ?? { ok: true }), { headers: jsonHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message ?? err) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
