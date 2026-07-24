/**
 * audit-compliance — end-to-end audit of the live catalog.
 *
 * - Pulls a large sample (up to `limit`, default 5000) from curated_videos.
 * - Runs the SAME keyword / regex / emoji guards as ingest-videos.
 * - HEAD-checks a random thumbnail sample for liveness.
 * - Returns a structured report. If body.delete_flagged === true, removes
 *   any rows that fail the compliance check.
 *
 * POST body (all optional):
 *   { limit?: number, thumb_sample?: number, delete_flagged?: boolean }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// === Compliance lists (kept in sync with ingest-videos) ===
const HARD = [
  "music video","official song","official video","remix","mashup","cover song",
  "lyrical video","lyrics video","DJ set","beat drop","trap music","rap song",
  "hip hop song","pop song","dance music","EDM","concert","karaoke",
  "dancing","choreography","tiktok dance","viral dance","trending dance",
  "dance challenge","lip sync","lip-sync",
  "sexy","hot girl","bikini","swimsuit","lingerie","fashion show","ramp walk",
  "seductive","kissing","romance scene","love scene","couple goals",
  "girlfriend prank","boyfriend prank","valentine party","hookup","only fan",
  "alcohol","wine review","beer review","whisky","vodka","nightclub","clubbing",
  "party night","rave","casino","gambling","betting tips","poker game","lottery",
  "fuck","bitch","bastard",
  "porn","porno","pornography","nude","nudity","nudes","naked",
  "explicit","xxx","erotic","erotica","sex tape","sex scene",
  "onlyfans","only fans","thirst trap","twerk","twerking",
  "stripper","strip club","escort","brothel","intimate scene",
  "boobs","cleavage","thicc","thigh","thighs",
  "tinder date","bumble","drunk vlog","vape","weed review","marijuana","cannabis review",
];
const FEMALE_VISUAL = [
  "makeup tutorial","makeup look","hijab tutorial","hijab style","hijab fashion",
  "modest fashion","modest outfit","modest haul","outfit of the day","ootd",
  "get ready with me","grwm","beauty haul","fashion haul","lookbook",
  "skincare routine","bridal","henna design","mehndi design",
  "sister speaks","muslimah vlog","aunty vlog","sister vlog","wife vlog","mom vlog",
];
const BAD_EMOJIS = /[💃🍺🍷🎰💋👙🩱🕺💄👯👩‍🦰💅👩💄💅🤰]/;
const FEMALE_PRESENTER = [
  /\bmiss\s+[a-z]+\b/i,
  /\b(her|she)\s+(story|journey|reverted|converted)\b/i,
  /\bmuslimah\s+(vlog|diary|life)\b/i,
  /\bsisters?\s+(vlog|diary|haul|tag)\b/i,
];

interface Row {
  id: string; video_id: string; title: string;
  channel_title: string; thumbnail_url: string | null;
}

function check(r: Row): { ok: boolean; reason?: string; rule?: string } {
  const hay = `${r.title} ${r.channel_title}`.toLowerCase();
  for (const k of HARD) if (hay.includes(k)) return { ok: false, reason: "keyword", rule: k };
  for (const k of FEMALE_VISUAL) if (hay.includes(k)) return { ok: false, reason: "female_visual", rule: k };
  for (const re of FEMALE_PRESENTER) if (re.test(r.title)) return { ok: false, reason: "female_presenter", rule: re.source };
  if (BAD_EMOJIS.test(r.title)) return { ok: false, reason: "emoji" };
  return { ok: true };
}

async function pg(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  return res;
}

async function requireAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: auth },
  });
  if (!userRes.ok) return false;
  const { id } = await userRes.json();
  if (!id) return false;
  const roleRes = await pg(`user_roles?user_id=eq.${id}&role=eq.admin&select=role`);
  if (!roleRes.ok) return false;
  const rows = await roleRes.json();
  return Array.isArray(rows) && rows.length > 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!(await requireAdmin(req))) {
    return new Response(JSON.stringify({ error: "admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { limit?: number; thumb_sample?: number; delete_flagged?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }

  const limit = Math.min(body.limit ?? 5000, 20000);
  const thumbSample = Math.min(body.thumb_sample ?? 50, 200);
  const deleteFlagged = !!body.delete_flagged;

  const t0 = Date.now();

  // 1. Pull rows in pages of 1000.
  const rows: Row[] = [];
  let from = 0;
  while (rows.length < limit) {
    const to = Math.min(from + 999, limit - 1);
    const res = await pg(
      `curated_videos?select=id,video_id,title,channel_title,thumbnail_url&order=ingested_at.desc.nullslast`,
      { headers: { Range: `${from}-${to}`, "Range-Unit": "items" } },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return new Response(JSON.stringify({ error: `fetch failed: ${res.status}`, detail, from, to }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const batch = (await res.json()) as Row[];
    if (!batch.length) break;
    rows.push(...batch);
    if (batch.length < 1000) break;
    from += 1000;
  }

  // 2. Compliance scan.
  const flagged: Array<Row & { reason: string; rule?: string }> = [];
  const byReason: Record<string, number> = {};
  for (const r of rows) {
    const v = check(r);
    if (!v.ok) {
      flagged.push({ ...r, reason: v.reason!, rule: v.rule });
      byReason[v.reason!] = (byReason[v.reason!] ?? 0) + 1;
    }
  }

  // 3. Thumbnail liveness sample (HEAD).
  const sample = rows
    .filter((r) => r.thumbnail_url)
    .sort(() => Math.random() - 0.5)
    .slice(0, thumbSample);
  const thumbResults = await Promise.all(
    sample.map(async (r) => {
      try {
        const res = await fetch(r.thumbnail_url!, { method: "HEAD" });
        return { video_id: r.video_id, status: res.status, ok: res.ok };
      } catch {
        return { video_id: r.video_id, status: 0, ok: false };
      }
    }),
  );
  const brokenThumbs = thumbResults.filter((t) => !t.ok);

  // 4. Optional cleanup.
  let deleted = 0;
  if (deleteFlagged && flagged.length) {
    const ids = flagged.map((f) => f.id);
    // delete in chunks of 200 to stay under URL length
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const res = await pg(`curated_videos?id=in.(${chunk.join(",")})`, { method: "DELETE" });
      if (res.ok) deleted += chunk.length;
    }
  }

  const elapsed = Date.now() - t0;
  return new Response(
    JSON.stringify({
      ok: true,
      scanned: rows.length,
      flagged_count: flagged.length,
      flagged_pct: rows.length ? +((flagged.length / rows.length) * 100).toFixed(3) : 0,
      by_reason: byReason,
      sample_flagged: flagged.slice(0, 50),
      thumbnails_sampled: sample.length,
      thumbnails_broken: brokenThumbs.length,
      broken_thumbnails: brokenThumbs.slice(0, 20),
      deleted,
      elapsed_ms: elapsed,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
