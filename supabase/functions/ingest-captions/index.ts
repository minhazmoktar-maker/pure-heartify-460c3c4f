/**
 * Captions / transcript ingestion worker.
 *
 * POST /ingest-captions
 *   { video_ids?: string[], limit?: number }
 *   headers: x-cron-token: <INGEST_CRON_TOKEN>   (cron / admin only)
 *
 * Two sources, tried in order per video:
 *   1. YouTube timedtext (free, exact timings). Frequently blocked from
 *      datacenter IPs, so it is best-effort and never fatal.
 *   2. Gemini transcription of the public YouTube URL (paid, always works for
 *      public videos, returns coarse but usable segment timings).
 *
 * Results land in video_transcripts (+ transcript_segments) and the job row is
 * closed out. Failures are retried with exponential backoff up to 5 attempts,
 * after which the job parks in `failed` (queryable DLQ) instead of spinning.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const MAX_ATTEMPTS = 5;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

type Segment = { start_ms: number; end_ms: number | null; text: string };
type Transcript = { language: string; source: string; model: string | null; segments: Segment[] };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanSegments(raw: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of raw) {
    const text = (s.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const start = Math.max(0, Math.round(s.start_ms));
    if (!Number.isFinite(start)) continue;
    out.push({ start_ms: start, end_ms: s.end_ms && s.end_ms > start ? Math.round(s.end_ms) : null, text: text.slice(0, 600) });
  }
  out.sort((a, b) => a.start_ms - b.start_ms);
  // Drop duplicate consecutive lines (rolling ASR captions repeat heavily).
  return out.filter((s, i) => i === 0 || s.text !== out[i - 1].text).slice(0, 4000);
}

/** Source 1 — YouTube timedtext via the watch page's signed caption track. */
async function fromTimedText(videoId: string): Promise<Transcript | null> {
  try {
    const page = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en" },
    });
    if (!page.ok) return null;
    const html = await page.text();
    const m = html.match(/"captionTracks":(\[.*?\])/);
    if (!m) return null;
    const tracks = JSON.parse(m[1].replace(/\\u0026/g, "&").replace(/\\"/g, '"')) as Array<{
      baseUrl: string;
      languageCode?: string;
    }>;
    const track = tracks[0];
    if (!track?.baseUrl) return null;
    const res = await fetch(`${track.baseUrl}&fmt=json3`, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const body = await res.text();
    if (!body.trim()) return null; // Blocked / empty — fall through to AI.
    const data = JSON.parse(body) as {
      events?: Array<{ tStartMs: number; dDurationMs?: number; segs?: Array<{ utf8?: string }> }>;
    };
    const segments = cleanSegments(
      (data.events ?? [])
        .filter((e) => Array.isArray(e.segs))
        .map((e) => ({
          start_ms: e.tStartMs,
          end_ms: e.dDurationMs ? e.tStartMs + e.dDurationMs : null,
          text: (e.segs ?? []).map((s) => s.utf8 ?? "").join(""),
        })),
    );
    if (segments.length < 3) return null;
    return { language: (track.languageCode ?? "en").slice(0, 8), source: "youtube_timedtext", model: null, segments };
  } catch (err) {
    console.warn("timedtext failed", videoId, (err as Error).message);
    return null;
  }
}

/** Source 2 — Gemini transcription of the public video URL. */
async function fromGemini(videoId: string, languageHint: string | null): Promise<Transcript | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  const model = "gemini-2.5-flash";
  const prompt =
    "Transcribe the spoken audio of this video. Return ONLY JSON of the shape " +
    '{"language":"<ISO 639-1 code of the spoken language>","segments":[{"start":<seconds as number>,"text":"<verbatim words>"}]} ' +
    "Use one segment per sentence or natural pause, ordered by time, covering the whole video. " +
    "Do not translate, summarise, or add commentary." +
    (languageHint ? ` The speaker is expected to speak ${languageHint}.` : "");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}` } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 32768 },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const payload = await res.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini returned no text");
  const parsed = JSON.parse(text) as { language?: string; segments?: Array<{ start?: number; text?: string }> };
  const segments = cleanSegments(
    (parsed.segments ?? []).map((s, i, arr) => ({
      start_ms: Math.round(Number(s.start ?? 0) * 1000),
      end_ms: arr[i + 1]?.start != null ? Math.round(Number(arr[i + 1].start) * 1000) : null,
      text: String(s.text ?? ""),
    })),
  );
  if (segments.length < 3) throw new Error("gemini transcript too short");
  return {
    language: (parsed.language ?? languageHint ?? "en").toLowerCase().slice(0, 8),
    source: "ai_gemini",
    model,
    segments,
  };
}

async function persist(admin: SupabaseClient, videoId: string, t: Transcript) {
  const fullText = t.segments.map((s) => s.text).join(" ").slice(0, 200_000);
  const durationMs = t.segments.length
    ? (t.segments[t.segments.length - 1].end_ms ?? t.segments[t.segments.length - 1].start_ms)
    : null;

  const { error: upErr } = await admin.from("video_transcripts").upsert(
    {
      video_id: videoId,
      language: t.language,
      source: t.source,
      model: t.model,
      segment_count: t.segments.length,
      duration_ms: durationMs,
      full_text: fullText,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "video_id" },
  );
  if (upErr) throw new Error(`transcript upsert: ${upErr.message}`);

  await admin.from("transcript_segments").delete().eq("video_id", videoId);
  const rows = t.segments.map((s) => ({
    video_id: videoId,
    language: t.language,
    start_ms: s.start_ms,
    end_ms: s.end_ms,
    text: s.text,
  }));
  // Chunked insert keeps each statement well inside the DB timeout.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from("transcript_segments").insert(rows.slice(i, i + 500));
    if (error) throw new Error(`segment insert: ${error.message}`);
  }
}

async function processVideo(
  admin: SupabaseClient,
  videoId: string,
  languageHint: string | null,
): Promise<{ video_id: string; ok: boolean; source?: string; segments?: number; error?: string }> {
  try {
    const t = (await fromTimedText(videoId)) ?? (await fromGemini(videoId, languageHint));
    if (!t) throw new Error("no transcript source available");
    await persist(admin, videoId, t);
    await admin
      .from("transcript_jobs")
      .update({ status: "done", error: null, updated_at: new Date().toISOString() })
      .eq("video_id", videoId);
    return { video_id: videoId, ok: true, source: t.source, segments: t.segments.length };
  } catch (err) {
    const message = (err as Error).message.slice(0, 500);
    const { data: job } = await admin
      .from("transcript_jobs")
      .select("attempts")
      .eq("video_id", videoId)
      .maybeSingle();
    const attempts = ((job?.attempts as number | undefined) ?? 0) + 1;
    const backoffMinutes = Math.min(6 * 60, 5 * 2 ** (attempts - 1));
    await admin.from("transcript_jobs").upsert(
      {
        video_id: videoId,
        attempts,
        status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
        error: message,
        next_attempt_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "video_id" },
    );
    console.error("transcript failed", videoId, message);
    return { video_id: videoId, ok: false, error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const expected = Deno.env.get("INGEST_CRON_TOKEN") ?? Deno.env.get("CRON_SECRET");
  const token = req.headers.get("x-cron-token") ?? "";
  if (!expected || token !== expected) return json({ error: "unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit ?? 3), 1), 10);
  const explicit: string[] = Array.isArray(body.video_ids)
    ? (body.video_ids as unknown[]).filter((v): v is string => typeof v === "string" && v.length <= 32).slice(0, 10)
    : [];

  let targets: Array<{ video_id: string; language_hint: string | null }> = [];
  if (explicit.length) {
    // Explicit run: make sure a job row exists so retries and status are tracked.
    await admin
      .from("transcript_jobs")
      .upsert(explicit.map((video_id) => ({ video_id, priority: 100 })), { onConflict: "video_id" });
    targets = explicit.map((video_id) => ({ video_id, language_hint: null }));
  } else {
    const { data } = await admin
      .from("transcript_jobs")
      .select("video_id, language_hint")
      .eq("status", "queued")
      .lte("next_attempt_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("next_attempt_at", { ascending: true })
      .limit(limit);
    targets = (data ?? []) as Array<{ video_id: string; language_hint: string | null }>;
  }

  if (!targets.length) return json({ processed: 0, results: [] });

  await admin
    .from("transcript_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .in("video_id", targets.map((t) => t.video_id));

  // Sequential on purpose: Gemini video transcription is heavy, and serial work
  // keeps this worker inside its CPU/wall budget at any queue depth.
  const results = [];
  for (const t of targets) {
    results.push(await processVideo(admin, t.video_id, t.language_hint));
  }

  return json({ processed: results.length, results });
});
