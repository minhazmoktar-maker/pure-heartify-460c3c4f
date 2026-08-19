/**
 * Embeddability sweep.
 *
 * Videos whose owner disabled off-site playback render as
 * "Playback on other websites has been disabled by the video owner" inside
 * Heartify's player. This worker walks the approved corpus in batches, asks
 * YouTube `videos.list?part=status` (1 quota unit per 50 ids) and hides every
 * video that is not embeddable, not public, or has been removed.
 *
 * Designed for pg_cron. Cursor-free: it always picks the oldest
 * `embed_checked_at` rows, so repeated runs eventually cover everything and
 * then keep re-verifying the corpus.
 */
const YOUTUBE_API_KEYS: string[] = [
  Deno.env.get("YOUTUBE_API_KEY"),
  Deno.env.get("YOUTUBE_API_KEY_2"),
].filter((k): k is string => !!k);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sbFetch = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY!,
      ...(init.headers ?? {}),
    },
  });

async function ytStatus(ids: string[]): Promise<Map<string, boolean> | null> {
  for (const key of YOUTUBE_API_KEYS) {
    const url =
      `https://www.googleapis.com/youtube/v3/videos?part=status&id=${ids.join(",")}&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[sweep-embeddable] youtube ${res.status}: ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    const data = await res.json() as {
      items?: Array<{ id: string; status?: Record<string, unknown> }>;
    };
    const map = new Map<string, boolean>();
    // Missing ids = deleted/private videos → not playable.
    for (const id of ids) map.set(id, false);
    for (const it of data.items ?? []) {
      const ok = it.status?.embeddable !== false &&
        it.status?.privacyStatus === "public" &&
        it.status?.uploadStatus !== "rejected";
      map.set(it.id, ok);
    }
    return map;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!YOUTUBE_API_KEYS.length || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "missing_configuration" }, 500);
  }

  // Auth: internal cron secret/token OR verified admin JWT (same gate as the
  // other pipeline workers). Never let anonymous callers burn YouTube quota.
  const cronSecret = req.headers.get("x-cron-secret");
  const cronToken = req.headers.get("x-cron-token");
  const isCron =
    (!!cronSecret && cronSecret === (Deno.env.get("CRON_SECRET") ?? "\u0000")) ||
    (!!cronToken && (cronToken === (Deno.env.get("INGEST_CRON_TOKEN") ?? "\u0000") ||
      cronToken === (Deno.env.get("AUDIT_CRON_TOKEN") ?? "\u0000")));

  if (!isCron) {
    const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userRes } = await admin.auth.getUser(jwt);
    const uid = userRes?.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  const url = new URL(req.url);
  const batches = Math.min(Number(url.searchParams.get("batches") ?? 40) || 40, 200);

  let checked = 0;
  let hidden = 0;

  for (let b = 0; b < batches; b++) {
    const res = await sbFetch(
      "curated_videos?select=video_id" +
        "&embeddable=eq.true&is_archived=eq.false&is_hidden=eq.false" +
        "&order=embed_checked_at.asc.nullsfirst&limit=50",
    );
    if (!res.ok) {
      console.error(`[sweep-embeddable] fetch failed ${res.status}`);
      break;
    }
    const rows = await res.json() as Array<{ video_id: string }>;
    if (!rows.length) break;
    const ids = rows.map((r) => r.video_id);

    const status = await ytStatus(ids);
    if (!status) break; // all keys failed / quota exhausted

    const bad = ids.filter((id) => status.get(id) === false);
    const good = ids.filter((id) => status.get(id) !== false);
    checked += ids.length;

    if (good.length) {
      await sbFetch(`curated_videos?video_id=in.(${good.join(",")})`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ embed_checked_at: new Date().toISOString() }),
      });
    }
    if (bad.length) {
      const r = await sbFetch(`curated_videos?video_id=in.(${bad.join(",")})`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          embeddable: false,
          is_hidden: true,
          embed_checked_at: new Date().toISOString(),
        }),
      });
      if (r.ok) hidden += bad.length;
      else console.error(`[sweep-embeddable] hide failed ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
  }

  console.log(`[sweep-embeddable] checked=${checked} hidden=${hidden}`);
  return json({ ok: true, checked, hidden });
});
