// Magic-link admin review endpoint. Bypasses in-app AAL2/2FA gate by
// authenticating callers with a hashed one-off token minted by a platform
// owner via the mint_admin_review_token RPC.
//
// Routes (via ?op=... or JSON body { op }):
//   op=queue   → GET pending Tier B/C candidates (paginated)
//   op=action  → POST { id, action: "approve" | "reject" | "escalate" }
//
// Token is passed either as ?token=... or `X-Review-Token` header.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function verifyToken(token: string, ip: string) {
  if (!token || token.length < 32) return null;
  const { data, error } = await admin.rpc("verify_admin_review_token", { _token: token });
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  await admin.rpc("log_admin_review_use", { _id: row.id, _ip: ip });
  return row as { id: string; purpose: string; created_by: string; expires_at: string };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token =
    url.searchParams.get("token") ??
    req.headers.get("x-review-token") ??
    "";
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";

  const session = await verifyToken(token, ip);
  if (!session) return json({ error: "invalid_or_expired_token" }, 401);

  const op = url.searchParams.get("op") ?? (req.method === "POST" ? "action" : "queue");

  try {
    if (op === "queue") {
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);
      const { data, error } = await admin
        .from("channel_candidates")
        .select(
          "id, youtube_channel_id, title, handle, description, category, language_detected, subscriber_count, risk_score, tier, confidence, moderation_summary, tier_reason",
        )
        .in("tier", ["B", "C"])
        .eq("status", "pending")
        .order("subscriber_count", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (error) return json({ error: error.message }, 500);
      return json({ session: { expires_at: session.expires_at }, items: data ?? [] });
    }

    if (op === "action") {
      const body = await req.json().catch(() => ({}));
      const id: string = body.id;
      const action: string = body.action;
      if (!id || !["approve", "reject", "escalate"].includes(action)) {
        return json({ error: "invalid_input" }, 400);
      }

      const { data: rows, error: fetchErr } = await admin
        .from("channel_candidates")
        .select("id, youtube_channel_id, title, handle, category, tier, status, confidence, cluster_id")
        .eq("id", id)
        .limit(1);
      if (fetchErr) return json({ error: fetchErr.message }, 500);
      const c = rows?.[0];
      if (!c) return json({ error: "not_found" }, 404);

      // Safety invariant: never approve a Tier D row via magic link.
      if (action === "approve" && c.tier === "D") {
        return json({ error: "tier_d_blocked" }, 403);
      }

      const newStatus =
        action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";

      await admin.from("channel_candidates").update({
        status: newStatus,
        promoted_at: action === "approve" ? new Date().toISOString() : null,
        auto_action: action === "escalate" ? "queued_full" : undefined,
        updated_at: new Date().toISOString(),
      }).eq("id", c.id);

      if (action === "approve") {
        const { data: ownerKeyRow } = await admin.rpc("compute_owner_key", {
          _name: c.handle ?? c.title,
        });
        await admin.from("approved_channels").upsert(
          {
            youtube_channel_id: c.youtube_channel_id,
            title: c.title,
            handle: c.handle,
            category: c.category,
            owner_key: ownerKeyRow ?? "",
            approved_by: session.created_by,
            last_rechecked_at: new Date().toISOString(),
            consistency_score: c.confidence ?? 90,
          },
          { onConflict: "youtube_channel_id" },
        );
      }

      await admin.from("channel_moderation_decisions").insert({
        candidate_id: c.id,
        youtube_channel_id: c.youtube_channel_id,
        tier: c.tier,
        action,
        actor: session.created_by,
        is_bulk: false,
        cluster_id: c.cluster_id,
        reason: `magic_link:${session.id}`,
        previous_status: c.status,
        new_status: newStatus,
        reversible: true,
      });

      return json({ ok: true, id: c.id, status: newStatus });
    }

    return json({ error: "unknown_op" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
