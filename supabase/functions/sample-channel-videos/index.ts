/**
 * sample-channel-videos
 * ---------------------
 * Pulls a diverse sample of videos for a channel candidate (newest / oldest /
 * most-popular / Shorts / random) and records a strict-halal verdict for each
 * one into `channel_video_samples`. The DB trigger `on_channel_sample_recorded`
 * then promotes the candidate from `pre_approved` -> `approved` once enough
 * clean samples accumulate, or rejects/suspends it the moment any sample
 * violates the halal invariants.
 *
 * Auth: admin JWT OR x-cron-secret.
 * Body: { candidate_id: string, force?: boolean, size?: number }
 *
 * Safety invariants (mirrored by DB trigger):
 *   - Any music / female-presenter / prank / entertainment / etc. sample => reject.
 *   - We never auto-promote unless `moderation_config.auto_approve_enabled = true`.
 *   - False negatives are preferred over false positives (missing a good channel
 *     is fine — approving an inappropriate one is not).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const YT_API_KEYS = [
  Deno.env.get("YOUTUBE_API_KEY"),
  Deno.env.get("YOUTUBE_API_KEY_2"),
].filter((k): k is string => !!k && k.length > 0);

const EXCLUSION_KEYWORDS = [
  "music video","music","song","dance","sexy","bikini","alcohol","gambling",
  "casino","gaming","prank","reaction","meme","celebrity","gossip","instrumental",
  "beat","remix","karaoke","lofi","lo-fi","tiktok compilation","kissing",
  "romantic","dating","love story","movie trailer","stand-up","comedy special",
];

const FEMALE_PRESENTER_HINTS = [
  "with sister","hosted by sister","ustadha","actress","female host",
  "girls only","women's talkshow","she reacts","she reviews",
];

const SAMPLE_LIMIT_HARD_CAP = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Round-robin the API keys — falls back through them on quota.
async function ytFetch(path: string, params: Record<string, string>): Promise<Response> {
  let last: Response | null = null;
  for (const key of YT_API_KEYS) {
    const u = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    u.searchParams.set("key", key);
    const r = await fetch(u.toString());
    if (r.ok) return r;
    last = r;
    // quota-related — try next key
    if (r.status !== 429 && r.status !== 403) return r;
  }
  return last!;
}

function classifyVideo(v: { title: string; description: string; duration_seconds: number; is_short: boolean }) {
  const hay = `${v.title} ${v.description}`.toLowerCase();
  const reasons: string[] = [];

  for (const kw of EXCLUSION_KEYWORDS) {
    if (hay.includes(kw)) reasons.push(`keyword:${kw}`);
  }
  for (const hint of FEMALE_PRESENTER_HINTS) {
    if (hay.includes(hint)) reasons.push(`female_presenter:${hint}`);
  }
  // Very short + music/entertainment intent
  if (v.is_short && /(dance|music|beat|song)/.test(hay)) {
    reasons.push("short_with_music_signal");
  }

  const verdict: "clean" | "warn" | "violation" =
    reasons.length === 0 ? "clean"
      : reasons.some((r) => r.startsWith("female_presenter:") || r === "keyword:music" || r === "keyword:song") ? "violation"
      : "warn";
  return { verdict, reasons };
}

function parseDurationSeconds(iso: string): number {
  // PT#H#M#S
  const m = /^P?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(iso ?? "");
  if (!m) return 0;
  const [, h, min, s] = m;
  return (Number(h ?? 0) * 3600) + (Number(min ?? 0) * 60) + Number(s ?? 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: cron secret OR admin JWT.
    const isCron = req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");
    if (!isCron) {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader) return json({ error: "unauthorized" }, 401);
      const { data: u } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
      if (!u?.user) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }

    if (YT_API_KEYS.length === 0) {
      return json({ error: "youtube_key_missing" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const candidateId: string | undefined = body.candidate_id;
    if (!candidateId) return json({ error: "candidate_id required" }, 400);
    const requestedSize: number | undefined = body.size;

    const { data: cand } = await admin
      .from("channel_candidates")
      .select("id, youtube_channel_id, tier, status, subscriber_count, required_samples, title")
      .eq("id", candidateId).maybeSingle();
    if (!cand) return json({ error: "candidate_not_found" }, 404);
    if (cand.status === "rejected" || cand.status === "suspended") {
      return json({ ok: true, skipped: "candidate_already_terminal", status: cand.status });
    }

    // Pick sample size based on subscriber tier.
    const subs = cand.subscriber_count ?? 0;
    const cfgSmall = (await admin.from("moderation_config").select("value").eq("key", "sample_size_small").maybeSingle()).data?.value ?? 10;
    const cfgMed   = (await admin.from("moderation_config").select("value").eq("key", "sample_size_medium").maybeSingle()).data?.value ?? 15;
    const cfgLarge = (await admin.from("moderation_config").select("value").eq("key", "sample_size_large").maybeSingle()).data?.value ?? 25;
    const size = Math.min(
      SAMPLE_LIMIT_HARD_CAP,
      requestedSize ?? (subs > 500_000 ? Number(cfgLarge) : subs > 10_000 ? Number(cfgMed) : Number(cfgSmall)),
    );

    // Move to sampling state up front.
    await admin.from("channel_candidates").update({
      status: cand.status === "approved" ? cand.status : "sampling",
      required_samples: size,
    }).eq("id", cand.id);

    // 1. Fetch uploads playlist.
    const chRes = await ytFetch("channels", { part: "contentDetails,statistics,snippet", id: cand.youtube_channel_id });
    if (!chRes.ok) return json({ error: "youtube_channel_lookup_failed", status: chRes.status }, 502);
    const chJson = await chRes.json();
    const uploadsPlaylist = chJson?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylist) return json({ error: "no_uploads_playlist" }, 422);

    // 2. Pull recent uploads (newest first). YouTube playlistItems returns
    //    up to 50 per page.
    const upRes = await ytFetch("playlistItems", { part: "snippet,contentDetails", maxResults: "50", playlistId: uploadsPlaylist });
    const upJson = await upRes.json();
    const uploads: any[] = upJson?.items ?? [];

    // 3. Popular videos via search (order=viewCount, videoDuration=any).
    const popRes = await ytFetch("search", {
      part: "snippet", channelId: cand.youtube_channel_id, order: "viewCount",
      maxResults: "10", type: "video", safeSearch: "strict",
    });
    const popJson = await popRes.json();
    const popItems: any[] = popJson?.items ?? [];

    // 4. Shorts specifically (search + short duration).
    const shortRes = await ytFetch("search", {
      part: "snippet", channelId: cand.youtube_channel_id, order: "date",
      maxResults: "10", type: "video", safeSearch: "strict", videoDuration: "short",
    });
    const shortJson = await shortRes.json();
    const shortItems: any[] = shortJson?.items ?? [];

    // 5. Compose the sample plan: newest, oldest, most-popular, shorts, random.
    const newest = uploads.slice(0, Math.ceil(size * 0.35));
    const oldest = uploads.slice(-Math.ceil(size * 0.2));
    const popular = popItems.slice(0, Math.ceil(size * 0.2));
    const shorts = shortItems.slice(0, Math.ceil(size * 0.15));
    const remainingRandomPool = uploads.slice(Math.ceil(size * 0.35), -Math.ceil(size * 0.2));
    const random = remainingRandomPool.sort(() => Math.random() - 0.5).slice(0, Math.max(0, size - newest.length - oldest.length - popular.length - shorts.length));

    const plan: Array<{ kind: string; id: string; title: string; description: string }> = [];
    for (const it of newest) plan.push({ kind: "newest", id: it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId, title: it.snippet?.title ?? "", description: it.snippet?.description ?? "" });
    for (const it of oldest) plan.push({ kind: "oldest", id: it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId, title: it.snippet?.title ?? "", description: it.snippet?.description ?? "" });
    for (const it of popular) plan.push({ kind: "popular", id: it.id?.videoId, title: it.snippet?.title ?? "", description: it.snippet?.description ?? "" });
    for (const it of shorts) plan.push({ kind: "shorts", id: it.id?.videoId, title: it.snippet?.title ?? "", description: it.snippet?.description ?? "" });
    for (const it of random) plan.push({ kind: "random", id: it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId, title: it.snippet?.title ?? "", description: it.snippet?.description ?? "" });

    // Dedupe by video_id.
    const uniq = new Map<string, typeof plan[number]>();
    for (const p of plan) if (p.id && !uniq.has(p.id)) uniq.set(p.id, p);

    // 6. Hydrate duration (to detect Shorts reliably).
    const ids = [...uniq.keys()];
    let durations = new Map<string, number>();
    if (ids.length > 0) {
      const vRes = await ytFetch("videos", { part: "contentDetails", id: ids.join(",") });
      const vJson = await vRes.json();
      for (const it of vJson?.items ?? []) {
        durations.set(it.id, parseDurationSeconds(it.contentDetails?.duration ?? ""));
      }
    }

    // 7. Classify + record. Any 'violation' immediately triggers the DB trigger
    //    to reject the candidate — we break out early.
    const outcomes: Array<{ id: string; kind: string; verdict: string; reasons: string[] }> = [];
    let violated = false;
    for (const p of uniq.values()) {
      const dur = durations.get(p.id) ?? 0;
      const isShort = dur > 0 && dur <= 65;
      const { verdict, reasons } = classifyVideo({
        title: p.title, description: p.description,
        duration_seconds: dur, is_short: isShort,
      });

      await admin.from("channel_video_samples").insert({
        candidate_id: cand.id,
        youtube_channel_id: cand.youtube_channel_id,
        video_id: p.id,
        sample_kind: p.kind,
        verdict,
        reasons,
        evidence: { title: p.title, duration_seconds: dur, is_short: isShort },
      });
      outcomes.push({ id: p.id, kind: p.kind, verdict, reasons });

      if (verdict === "violation") { violated = true; break; }
    }

    // Refresh candidate for response.
    const { data: fresh } = await admin
      .from("channel_candidates")
      .select("id, status, tier, clean_samples, failed_samples, required_samples")
      .eq("id", cand.id).maybeSingle();

    return json({
      ok: true, candidate: fresh, sampled: outcomes.length, violated,
      breakdown: {
        clean: outcomes.filter((o) => o.verdict === "clean").length,
        warn:  outcomes.filter((o) => o.verdict === "warn").length,
        violation: outcomes.filter((o) => o.verdict === "violation").length,
      },
    });
  } catch (e) {
    console.error("sample-channel-videos error", e);
    return json({ error: String(e) }, 500);
  }
});
