/**
 * Audio integrity check
 * ---------------------
 * POSTs a list of tracks (or uses the built-in default seed) and validates that
 * every URL loads correctly. Writes one row per track to
 * `audio_integrity_reports` and returns a summary. Admin-only.
 */
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface TrackIn {
  id: string;
  title?: string;
  url?: string;
  comingSoon?: boolean;
}

interface Row {
  run_id: string;
  track_id: string;
  track_title: string | null;
  url: string | null;
  status:
    | "ok" | "unreachable" | "wrong_type" | "forbidden"
    | "too_small" | "timeout" | "coming_soon" | "error";
  http_status: number | null;
  content_type: string | null;
  content_length: number | null;
  latency_ms: number | null;
  error: string | null;
}

const TIMEOUT_MS = 12_000;
const MIN_BYTES = 32_000;

async function probe(url: string): Promise<Partial<Row>> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // HEAD first — most CDNs support it and it's cheapest.
    let res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Range: "bytes=0-1023" },
        redirect: "follow",
      });
      try { await res.body?.cancel(); } catch { /* noop */ }
    }
    const latency_ms = Math.round(performance.now() - started);
    const content_type = res.headers.get("content-type");
    const lenHeader = res.headers.get("content-length");
    const content_length = lenHeader ? Number(lenHeader) : null;

    if (res.status === 401 || res.status === 403) {
      return { status: "forbidden", http_status: res.status, content_type, content_length, latency_ms };
    }
    if (!res.ok && res.status !== 206) {
      return { status: "unreachable", http_status: res.status, content_type, content_length, latency_ms };
    }
    if (content_type && !/audio\/|mpegurl|octet-stream/i.test(content_type)) {
      return { status: "wrong_type", http_status: res.status, content_type, content_length, latency_ms };
    }
    if (content_length !== null && content_length < MIN_BYTES) {
      return { status: "too_small", http_status: res.status, content_type, content_length, latency_ms };
    }
    return { status: "ok", http_status: res.status, content_type, content_length, latency_ms };
  } catch (err: any) {
    const latency_ms = Math.round(performance.now() - started);
    if (err?.name === "AbortError") return { status: "timeout", latency_ms, error: "timeout" };
    return { status: "error", latency_ms, error: String(err?.message ?? err) };
  } finally {
    clearTimeout(timer);
  }
}

async function pmap<T, R>(items: T[], concurrency: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth: require caller to be admin/owner.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await asUser.auth.getUser(jwt);
  if (userErr || !userRes.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const admin = createClient(url, service);
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userRes.user.id, _role: "admin",
  });
  const { data: isOwner } = await admin.rpc("is_owner", { _user_id: userRes.user.id });
  if (!isAdmin && !isOwner) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { tracks?: TrackIn[]; concurrency?: number } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const tracks = body.tracks ?? [];
  if (!Array.isArray(tracks) || tracks.length === 0) {
    return new Response(JSON.stringify({ error: "no tracks provided" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const concurrency = Math.min(Math.max(body.concurrency ?? 6, 1), 12);
  const run_id = crypto.randomUUID();

  const results = await pmap<TrackIn, Row>(tracks, concurrency, async (t) => {
    const base: Row = {
      run_id, track_id: t.id, track_title: t.title ?? null, url: t.url ?? null,
      status: "error", http_status: null, content_type: null,
      content_length: null, latency_ms: null, error: null,
    };
    if (t.comingSoon) return { ...base, status: "coming_soon" };
    if (!t.url) return { ...base, status: "error", error: "missing url" };
    const p = await probe(t.url);
    return { ...base, ...p };
  });

  // Insert results (chunked for safety).
  for (let i = 0; i < results.length; i += 100) {
    const chunk = results.slice(i, i + 100);
    const { error } = await admin.from("audio_integrity_reports").insert(chunk);
    if (error) {
      return new Response(JSON.stringify({ error: error.message, run_id }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const summary = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1; return acc;
  }, {});

  return new Response(
    JSON.stringify({
      run_id,
      total: results.length,
      summary,
      broken: results.filter((r) => !["ok", "coming_soon"].includes(r.status)),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
