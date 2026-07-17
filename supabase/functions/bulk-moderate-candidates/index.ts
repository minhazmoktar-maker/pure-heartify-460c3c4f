// Bulk approve / reject / escalate / revert for channel candidates.
// Accepts an explicit list of candidate IDs OR a cluster_id.
// Every action writes to channel_moderation_decisions and updates
// active-learning signals.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

type Action = "approve" | "reject" | "escalate" | "revert";
const MAX = 500;

async function upsertLearning(admin: any, actor: string, featureType: string, featureValue: string, action: Action) {
  if (!featureValue) return;
  // Uses SECURITY DEFINER RPC which stamps `app.actor` so the guard trigger
  // on moderation_learned_signals allows the write. Human decisions only.
  await admin.rpc("record_learned_signal", {
    _actor: actor, _feature_type: featureType, _feature_value: featureValue, _action: action,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const body = await req.json();
    const action: Action = body.action;
    if (!["approve", "reject", "escalate", "revert"].includes(action)) {
      return new Response(JSON.stringify({ error: "invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clusterId: string | undefined = body.cluster_id;
    const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, MAX) : [];
    if (!clusterId && ids.length === 0) {
      return new Response(JSON.stringify({ error: "ids or cluster_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const force: boolean = body.force === true;

    let query = admin.from("channel_candidates").select("id, youtube_channel_id, title, handle, category, status, tier, language_detected, cluster_id, confidence, clean_samples, failed_samples, required_samples");
    query = clusterId ? query.eq("cluster_id", clusterId).limit(MAX) : query.in("id", ids);
    const { data: rows } = await query;
    const candidates = rows ?? [];

    let approved = 0, rejected = 0, escalated = 0, reverted = 0, skipped = 0;
    const skippedDetail: Array<{ id: string; reason: string }> = [];

    for (const c of candidates) {
      let newStatus: string | null = null;
      if (action === "approve") newStatus = "approved";
      else if (action === "reject") newStatus = "rejected";
      else if (action === "escalate") newStatus = "pending";
      else if (action === "revert") newStatus = "pending";

      // Safety invariant: never approve a Tier D row.
      if (action === "approve" && c.tier === "D") {
        skipped++; skippedDetail.push({ id: c.id, reason: "tier_D_blocked" }); continue;
      }
      // Safety invariant: Tier S / A rows must clear the video sampling pipeline
      // before a human can approve them, unless the admin explicitly forces it.
      if (action === "approve" && (c.tier === "S" || c.tier === "A") && !force) {
        const need = c.required_samples ?? 15;
        const clean = c.clean_samples ?? 0;
        const failed = c.failed_samples ?? 0;
        if (failed > 0 || clean < need) {
          skipped++;
          skippedDetail.push({ id: c.id, reason: `sampling_incomplete:${clean}/${need}${failed ? `,failed:${failed}` : ""}` });
          continue;
        }
      }

      await admin.from("channel_candidates").update({
        status: newStatus,
        auto_action: action === "escalate" ? "queued_full" : action === "revert" ? "queued_fast" : undefined,
        promoted_at: action === "approve" ? new Date().toISOString() : undefined,
      }).eq("id", c.id);

      if (action === "approve") {
        const { data: ownerKeyRow } = await admin.rpc("compute_owner_key", { _name: c.handle ?? c.title });
        await admin.from("approved_channels").upsert({
          youtube_channel_id: c.youtube_channel_id, title: c.title, handle: c.handle, category: c.category,
          owner_key: ownerKeyRow ?? "", approved_by: user.id,
          last_rechecked_at: new Date().toISOString(),
          consistency_score: c.confidence ?? 0,
        }, { onConflict: "youtube_channel_id" });
      }
      if (action === "revert") {
        await admin.from("approved_channels").delete().eq("youtube_channel_id", c.youtube_channel_id);
      }

      await admin.from("channel_moderation_decisions").insert({
        candidate_id: c.id, youtube_channel_id: c.youtube_channel_id, tier: c.tier,
        action, actor: user.id, is_bulk: candidates.length > 1, cluster_id: c.cluster_id,
        reason: clusterId ? `bulk:cluster:${clusterId}` : `bulk:ids:${candidates.length}`,
        previous_status: c.status, new_status: newStatus, reversible: true,
      });

      // Active learning — human-only (RPC enforces actor).
      if (action !== "escalate") {
        await upsertLearning(admin, user.id, "language", c.language_detected ?? "und", action);
        await upsertLearning(admin, user.id, "topic", c.category ?? "unknown", action);
      }

      if (action === "approve") approved++;
      else if (action === "reject") rejected++;
      else if (action === "escalate") escalated++;
      else reverted++;
    }

    return new Response(JSON.stringify({
      ok: true, action, total: candidates.length,
      approved, rejected, escalated, reverted, skipped,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("bulk-moderate-candidates error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
