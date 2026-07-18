// Resolves channel_candidates rows flagged with evidence.needs_resolution=true
// by looking up YouTube metadata via the Data API (forHandle / forUsername).
// Then optionally triggers batch-classify-candidates.
//
// Auth: admin JWT OR x-cron-secret. Idempotent per row.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const YT_KEYS = [
  Deno.env.get("YOUTUBE_API_KEY"),
  Deno.env.get("YOUTUBE_API_KEY_2"),
].filter(Boolean) as string[];

async function ytFetch(path: string): Promise<any> {
  let lastErr: unknown = null;
  for (const key of YT_KEYS) {
    const url = `https://www.googleapis.com/youtube/v3/${path}${path.includes("?") ? "&" : "?"}key=${key}`;
    const res = await fetch(url);
    if (res.ok) return res.json();
    if (res.status === 403 || res.status === 429) { lastErr = await res.text(); continue; }
    throw new Error(`YT ${res.status}: ${await res.text()}`);
  }
  throw new Error(`YT quota/keys exhausted: ${lastErr}`);
}

async function resolveHandle(rawHandle: string): Promise<any | null> {
  const h = rawHandle.replace(/^@/, "");
  // Try forHandle first (modern), then forUsername (legacy)
  try {
    const j = await ytFetch(`channels?part=snippet,statistics,brandingSettings&forHandle=${encodeURIComponent(h)}`);
    if (j?.items?.[0]) return j.items[0];
  } catch (_) { /* fall through */ }
  try {
    const j = await ytFetch(`channels?part=snippet,statistics,brandingSettings&forUsername=${encodeURIComponent(h)}`);
    if (j?.items?.[0]) return j.items[0];
  } catch (_) { /* fall through */ }
  // Fallback: search
  try {
    const s = await ytFetch(`search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent("@" + h)}`);
    const chId = s?.items?.[0]?.snippet?.channelId;
    if (!chId) return null;
    const j = await ytFetch(`channels?part=snippet,statistics,brandingSettings&id=${chId}`);
    return j?.items?.[0] ?? null;
  } catch (_) { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (YT_KEYS.length === 0) {
      return new Response(JSON.stringify({ error: "YOUTUBE_API_KEY not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // auth
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");
    if (!isCron) {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
      );
      const { data: u } = await sb.auth.getUser();
      if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(100, Number(body.limit ?? 50));
    const autoClassify: boolean = body.classify !== false;

    const { data: pending, error: fetchErr } = await admin
      .from("channel_candidates")
      .select("id, youtube_channel_id, handle, title, evidence, category, halal_topic_hint, language_detected")
      .like("youtube_channel_id", "handle:%")
      .eq("status", "pending")
      .limit(limit);
    if (fetchErr) throw fetchErr;

    const stats = { processed: 0, resolved: 0, duplicates: 0, not_found: 0, errors: 0 };
    const results: any[] = [];

    for (const row of pending ?? []) {
      stats.processed++;
      const handle = (row.handle ?? row.youtube_channel_id.replace(/^handle:/, "")) as string;
      try {
        const ch = await resolveHandle(handle);
        if (!ch?.id) {
          stats.not_found++;
          await admin.from("channel_candidates")
            .update({ evidence: { ...(row.evidence ?? {}), resolution: "not_found", needs_resolution: false } })
            .eq("id", row.id);
          results.push({ id: row.id, handle, status: "not_found" });
          continue;
        }

        // Dedupe: if the real ID already exists, drop this row.
        const { data: dupe } = await admin
          .from("channel_candidates")
          .select("id")
          .eq("youtube_channel_id", ch.id)
          .neq("id", row.id)
          .maybeSingle();
        const { data: approvedDupe } = await admin
          .from("approved_channels")
          .select("id")
          .eq("youtube_channel_id", ch.id)
          .maybeSingle();
        if (dupe || approvedDupe) {
          stats.duplicates++;
          await admin.from("channel_candidates")
            .update({ status: "rejected", evidence: { ...(row.evidence ?? {}), resolution: "duplicate", resolved_to: ch.id } })
            .eq("id", row.id);
          results.push({ id: row.id, handle, status: "duplicate", resolved_to: ch.id });
          continue;
        }

        const snip = ch.snippet ?? {};
        const stat = ch.statistics ?? {};
        const evidence = {
          ...(row.evidence ?? {}),
          resolution: "ok",
          resolved_from_handle: handle,
          country: snip.country ?? null,
          published_at: snip.publishedAt ?? null,
          view_count: stat.viewCount ? Number(stat.viewCount) : null,
          video_count: stat.videoCount ? Number(stat.videoCount) : null,
        };
        (evidence as any).needs_resolution = false;

        await admin.from("channel_candidates").update({
          youtube_channel_id: ch.id,
          title: snip.title ?? row.title,
          handle: snip.customUrl ?? row.handle,
          description: snip.description ?? null,
          subscriber_count: stat.subscriberCount ? Number(stat.subscriberCount) : null,
          language_detected: snip.defaultLanguage ?? row.language_detected ?? null,
          country: snip.country ?? null,
          evidence,
          confidence: 55, // baseline; classifier will refine
          last_verified_at: new Date().toISOString(),
        }).eq("id", row.id);

        stats.resolved++;
        results.push({ id: row.id, handle, status: "resolved", channel_id: ch.id, subs: stat.subscriberCount });
      } catch (e) {
        stats.errors++;
        results.push({ id: row.id, handle, status: "error", error: String(e) });
      }
    }

    // Kick off classifier asynchronously so newly-enriched rows get tiered.
    if (autoClassify && stats.resolved > 0) {
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/batch-classify-candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "",
        },
        body: JSON.stringify({ dry_run: false, limit: 100 }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, stats, sample: results.slice(0, 20) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("resolve-channel-handles error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
