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
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 500), 2000);
      const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
      let q = admin
        .from("channel_candidates")
        .select(
          "id, youtube_channel_id, title, handle, description, category, language_detected, subscriber_count, risk_score, tier, confidence, moderation_summary, tier_reason, status",
          { count: "exact" },
        )
        .in("status", ["pending", "sampling", "pre_approved"])
        .order("subscriber_count", { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1);
      const { data, error, count } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({
        session: { expires_at: session.expires_at },
        items: data ?? [],
        total: count ?? (data?.length ?? 0),
        offset,
        limit,
      });
    }

    if (op === "action" || op === "bulk") {
      const body = await req.json().catch(() => ({}));
      const action: string = body.action;
      if (!["approve", "reject", "escalate"].includes(action)) {
        return json({ error: "invalid_input" }, 400);
      }
      const ids: string[] = op === "bulk"
        ? (Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [])
        : (body.id ? [body.id] : []);
      if (ids.length === 0) return json({ error: "no_ids" }, 400);
      if (ids.length > 500) return json({ error: "too_many_ids", max: 500 }, 400);

      const { data: rows, error: fetchErr } = await admin
        .from("channel_candidates")
        .select("id, youtube_channel_id, title, handle, category, tier, status, confidence, cluster_id")
        .in("id", ids);
      if (fetchErr) return json({ error: fetchErr.message }, 500);
      const candidates = rows ?? [];
      if (candidates.length === 0) return json({ error: "not_found" }, 404);

      const newStatus =
        action === "approve" ? "approved" : action === "reject" ? "rejected" : "pending";
      const nowIso = new Date().toISOString();
      const isBulk = candidates.length > 1;

      const updatePatch: Record<string, unknown> = {
        status: newStatus,
        updated_at: nowIso,
      };
      if (action === "approve") updatePatch.promoted_at = nowIso;
      if (action === "escalate") updatePatch.auto_action = "queued_full";

      await admin
        .from("channel_candidates")
        .update(updatePatch)
        .in("id", candidates.map((c) => c.id));

      const results: Array<{ id: string; ok: boolean; error?: string }> = [];
      const approvedYouTubeIds: string[] = [];

      for (const c of candidates) {
        try {
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
                last_rechecked_at: nowIso,
                consistency_score: c.confidence ?? 90,
              },
              { onConflict: "youtube_channel_id" },
            );
            approvedYouTubeIds.push(c.youtube_channel_id);
          }

          await admin.from("channel_moderation_decisions").insert({
            candidate_id: c.id,
            youtube_channel_id: c.youtube_channel_id,
            tier: c.tier,
            action,
            actor: session.created_by,
            is_bulk: isBulk,
            cluster_id: c.cluster_id,
            reason: `magic_link:${session.id}${isBulk ? ":bulk" : ""}`,
            previous_status: c.status,
            new_status: newStatus,
            reversible: true,
          });

          results.push({ id: c.id, ok: true });
        } catch (e) {
          results.push({ id: c.id, ok: false, error: (e as Error).message });
        }
      }

      // Fire-and-forget auto-ingest for approved channels (batched).
      if (approvedYouTubeIds.length > 0) {
        try {
          const ingestUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ingest-videos`;
          // Chunk to keep individual invocations bounded.
          const CHUNK = 25;
          for (let i = 0; i < approvedYouTubeIds.length; i += CHUNK) {
            const chunk = approvedYouTubeIds.slice(i, i + CHUNK);
            fetch(ingestUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? "",
                "X-Cron-Secret": Deno.env.get("CRON_SECRET") ?? "",
              },
              body: JSON.stringify({
                channel_ids: chunk,
                limit: 25,
                reason: isBulk ? "magic_link_bulk_ingest" : "magic_link_auto_ingest",
              }),
            }).catch((err) => console.error("auto-ingest fetch failed", err));
          }
        } catch (e) {
          console.error("auto-ingest schedule failed", e);
        }
      }

      const okCount = results.filter((r) => r.ok).length;
      if (op === "action") {
        return json({ ok: results[0]?.ok ?? false, id: results[0]?.id, status: newStatus });
      }
      return json({
        ok: true,
        processed: okCount,
        failed: results.length - okCount,
        status: newStatus,
        results,
      });
    }

    return json({ error: "unknown_op" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
