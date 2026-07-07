/**
 * Daily section refresh:
 *  - Caps each section to MAX_PER_SECTION videos (keep newest + highest score).
 *  - Caps each creator to MAX_PER_CREATOR_PER_SECTION videos (drop oldest extras).
 *  - Deletes videos older than MAX_AGE_DAYS that aren't from trusted channels with view_count>0.
 *
 * Designed to run once per day via pg_cron, after the ingestion runs.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_PER_SECTION = 800;
const MAX_PER_CREATOR_PER_SECTION = 3;
// No age-based pruning — we want a million-video catalog over time.

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
  });
}

interface Row {
  id: string;
  video_id: string;
  channel_title: string;
  section_id: string | null;
  halal_score: number;
  view_count: number;
  ingested_at: string;
  published_at: string | null;
  is_trusted_channel: boolean;
}

async function fetchSection(sectionId: string): Promise<Row[]> {
  const url = `curated_videos?section_id=eq.${encodeURIComponent(sectionId)}&select=id,video_id,channel_title,section_id,halal_score,view_count,ingested_at,published_at,is_trusted_channel&order=published_at.desc.nullslast,ingested_at.desc&limit=5000`;
  const res = await rest(url);
  if (!res.ok) return [];
  return (await res.json()) as Row[];
}

async function deleteIds(ids: string[]) {
  if (!ids.length) return 0;
  // chunk to avoid URL bloat
  let total = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const inList = chunk.map((s) => `"${s}"`).join(",");
    const res = await rest(`curated_videos?id=in.(${inList})`, { method: "DELETE" });
    if (res.ok) total += chunk.length;
  }
  return total;
}

async function refreshSection(sectionId: string) {
  const rows = await fetchSection(sectionId);
  if (!rows.length) return { sectionId, kept: 0, dropped: 0 };

  const toDelete: string[] = [];
  const perCreator = new Map<string, number>();

  // Already sorted newest -> oldest. Walk in order; keep up to caps; delete the rest.
  let kept = 0;
  for (const r of rows) {
    const creatorKey = (r.channel_title || "unknown").toLowerCase().trim();
    const creatorCount = perCreator.get(creatorKey) ?? 0;

    if (
      kept >= MAX_PER_SECTION ||
      creatorCount >= MAX_PER_CREATOR_PER_SECTION
    ) {
      toDelete.push(r.id);
      continue;
    }
    perCreator.set(creatorKey, creatorCount + 1);
    kept++;
  }

  const dropped = await deleteIds(toDelete);
  return { sectionId, kept, dropped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Missing config" }, 500);

  // Authorize: shared cron token or admin JWT
  const cronToken = Deno.env.get("AUDIT_CRON_TOKEN");
  const cronHeader = req.headers.get("x-cron-token") ?? "";
  let allowed = !!cronToken && cronHeader === cronToken;
  if (!allowed) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const { createClient } = await import("npm:@supabase/supabase-js@2");
        const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
        const sb = createClient(SUPABASE_URL, anon, { global: { headers: { Authorization: authHeader } } });
        const { data: userData } = await sb.auth.getUser();
        if (userData?.user) {
          const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
          const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
          allowed = !!isAdmin;
        }
      } catch { /* fallthrough */ }
    }
  }
  if (!allowed) return json({ error: "unauthorized" }, 401);


  try {
    // Get all distinct section_ids currently in DB
    const res = await rest(`curated_videos?select=section_id&limit=10000`);
    const all = (await res.json()) as { section_id: string | null }[];
    const sections = Array.from(new Set(all.map((r) => r.section_id).filter(Boolean) as string[]));

    const results = [];
    let totalDropped = 0;
    for (const sid of sections) {
      const r = await refreshSection(sid);
      results.push(r);
      totalDropped += r.dropped;
    }

    return json({
      success: true,
      sectionsProcessed: results.length,
      totalDropped,
      results,
      message: `Refreshed ${results.length} sections, pruned ${totalDropped} stale/excess videos.`,
    });
  } catch (e) {
    console.error("refresh-sections error", e);
    return json({ error: String(e) }, 500);
  }
});
