/**
 * notify-favorites: invoked daily after refresh-sections.
 * For every user that has favorite_categories rows, find new videos ingested
 * in the last 24h for those sections, then send a push via Expo Push API
 * (works for any FCM/APNs token registered through Capacitor when forwarded).
 *
 * If no Expo/FCM key is configured, this function still records what *would*
 * be sent and returns a summary, so it's safe to enable immediately.
 */
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.103.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import { canSendPush, recordPushSend } from "../_shared/pushCap.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY"); // optional

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Authorize: shared cron token or admin JWT
  const cronToken = Deno.env.get("AUDIT_CRON_TOKEN");
  const cronHeader = req.headers.get("x-cron-token") ?? "";
  let allowed = !!cronToken && cronHeader === cronToken;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  if (!allowed) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
      const sb = createClient(SUPABASE_URL, anon, { global: { headers: { Authorization: authHeader } } });
      const { data: userData } = await sb.auth.getUser();
      if (userData?.user) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
        allowed = !!isAdmin;
      }
    }
  }
  if (!allowed) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: favs } = await supabase
    .from("favorite_categories")
    .select("user_id, section_id");
  if (!favs?.length) {
    return new Response(JSON.stringify({ sent: 0, reason: "no favorites" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Group section_ids by user
  const byUser = new Map<string, string[]>();
  for (const f of favs) {
    const arr = byUser.get(f.user_id) ?? [];
    arr.push(f.section_id);
    byUser.set(f.user_id, arr);
  }

  let sent = 0;
  let queued = 0;
  for (const [userId, sectionIds] of byUser) {
    const { data: newVids } = await supabase
      .from("curated_videos")
      .select("section_id, title")
      .in("section_id", sectionIds)
      .gte("ingested_at", since)
      .limit(5);
    if (!newVids?.length) continue;

    const { data: tokens } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", userId);
    if (!tokens?.length) {
      queued++;
      continue;
    }

    const title = "New halal videos for you";
    const body = newVids.map((v) => v.title).slice(0, 3).join(" • ");

    if (!FCM_SERVER_KEY) {
      queued += tokens.length;
      continue;
    }

    // Server-side 3-per-7d cap.
    const cap = await canSendPush(supabase, userId);
    if (!cap.ok) {
      queued += tokens.length;
      continue;
    }

    let deliveredForUser = 0;
    for (const t of tokens) {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: t.token,
          notification: { title, body },
          data: { kind: "favorites_digest", sections: sectionIds.join(",") },
        }),
      });
      if (res.ok) {
        sent++;
        deliveredForUser++;
      }
    }
    if (deliveredForUser > 0) {
      await recordPushSend(supabase, {
        user_id: userId,
        kind: "favorites_digest",
        title,
        body,
        data: { sections: sectionIds.join(",") },
      });
    }
  }

  return new Response(JSON.stringify({ sent, queued, users: byUser.size }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
