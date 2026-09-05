/**
 * creator-captions — automatic subtitle generation + translation for native
 * Heartify uploads.
 *
 * POST /creator-captions
 *   { upload_id }                  → generate source-language captions (ASR)
 *   { upload_id, language: "bn" }  → translate cached captions into `language`
 *   { cron: true, limit?: number } → autonomous sweep, header x-cron-token
 *
 * Auth: the upload owner or a moderator for single-upload calls; the cron token
 * for the sweep lane. Captions land in creator_upload_captions, one row per
 * language (source `asr` for the original, `mt` for machine translation), and
 * are served straight to the player as WebVTT.
 *
 * Everything here is idempotent: a language that already exists is returned
 * from cache instead of being regenerated, so the sweep can run forever on a
 * schedule without burning spend.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { UPLOAD_BUCKET, resolveCaller } from "../_shared/creatorAuth.ts";
import { checkCaptionTrack, notifyCaptionQuality, recordCaptionAudit } from "../_shared/captionAlerts.ts";
import { aiApiKey, chatCompletionsUrl } from "../_shared/aiGateway.ts";

const GEMINI_MODEL = "gemini-2.5-flash";
const TRANSLATE_MODEL = "google/gemini-2.5-flash";
/** Files above this size are parked rather than transcribed (memory ceiling). */
const MAX_TRANSCRIBE_BYTES = 180 * 1024 * 1024;
const MAX_SEGMENTS = 4000;
const CHUNK = 80;

const LANGUAGES: Record<string, string> = {
  en: "English", ar: "Arabic", bn: "Bengali", ur: "Urdu", hi: "Hindi", id: "Indonesian",
  ms: "Malay", tr: "Turkish", fa: "Persian", fr: "French", es: "Spanish", pt: "Portuguese",
  de: "German", ru: "Russian", sw: "Swahili", ha: "Hausa", so: "Somali", ps: "Pashto",
  zh: "Chinese (Simplified)", ja: "Japanese", ko: "Korean", nl: "Dutch", it: "Italian",
};

type Segment = { start_ms: number; end_ms: number | null; text: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function admin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function cleanSegments(raw: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const s of raw) {
    const text = (s.text ?? "").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const start = Math.max(0, Math.round(s.start_ms));
    if (!Number.isFinite(start)) continue;
    out.push({
      start_ms: start,
      end_ms: s.end_ms && s.end_ms > start ? Math.round(s.end_ms) : null,
      text: text.slice(0, 600),
    });
  }
  out.sort((a, b) => a.start_ms - b.start_ms);
  return out.filter((s, i) => i === 0 || s.text !== out[i - 1].text).slice(0, MAX_SEGMENTS);
}

/** Upload the object bytes to the Gemini Files API and wait until ACTIVE. */
async function uploadToGemini(key: string, bytes: Uint8Array, mimeType: string): Promise<string> {
  const start = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${key}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: "heartify-upload" } }),
    },
  );
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) {
    throw new Error(`files start ${start.status}: ${(await start.text()).slice(0, 200)}`);
  }

  const put = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: bytes,
  });
  if (!put.ok) throw new Error(`files upload ${put.status}: ${(await put.text()).slice(0, 200)}`);
  const meta = await put.json();
  let file = meta?.file;
  if (!file?.uri) throw new Error("files upload returned no uri");

  // The file must reach ACTIVE before it can be referenced in a prompt.
  for (let i = 0; i < 30 && file.state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}?key=${key}`);
    if (!poll.ok) break;
    file = await poll.json();
  }
  if (file.state && file.state !== "ACTIVE") throw new Error(`file state ${file.state}`);
  return file.uri as string;
}

async function transcribe(
  key: string,
  fileUri: string,
  mimeType: string,
  languageHint: string | null,
): Promise<{ language: string; segments: Segment[] }> {
  const prompt =
    "Transcribe the spoken audio of this video. Return ONLY JSON of the shape " +
    '{"language":"<ISO 639-1 code of the spoken language>","segments":[{"start":<seconds as number>,"text":"<verbatim words>"}]} ' +
    "One segment per sentence or natural pause, ordered by time, covering the whole video. " +
    "Do not translate, summarise, or add commentary." +
    (languageHint ? ` The speaker is expected to speak ${LANGUAGES[languageHint] ?? languageHint}.` : "");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ fileData: { fileUri, mimeType } }, { text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 32768 },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const payload = await res.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini returned no text");
  const parsed = JSON.parse(text) as { language?: string; segments?: Array<{ start?: number; text?: string }> };
  const segments = cleanSegments(
    (parsed.segments ?? []).map((s, i, arr) => ({
      start_ms: Math.round(Number(s.start ?? 0) * 1000),
      end_ms: arr[i + 1]?.start != null ? Math.round(Number(arr[i + 1]!.start) * 1000) : null,
      text: String(s.text ?? ""),
    })),
  );
  if (segments.length < 2) throw new Error("transcript too short");
  return { language: (parsed.language ?? languageHint ?? "en").toLowerCase().slice(0, 8), segments };
}

async function translateChunk(texts: string[], target: string, sourceName: string): Promise<string[]> {
  const key = aiApiKey();
  if (!key) throw new Error("translation is not configured");
  const res = await fetch(chatCompletionsUrl(), {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TRANSLATE_MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You translate Islamic lecture captions from ${sourceName} into ${target}. ` +
            "Translate faithfully and plainly. Keep Islamic terms (Allah, ṣalāh, ḥadīth, sūrah, duʿāʾ) " +
            "transliterated rather than paraphrased. Never add commentary, never merge or split lines. " +
            'Reply ONLY with JSON: {"lines":["<translation of line 1>", ...]} with exactly the same number of lines as the input.',
        },
        { role: "user", content: JSON.stringify({ lines: texts }) },
      ],
    }),
  });
  if (res.status === 429) throw new Error("rate limited — please try again shortly");
  if (res.status === 402) throw new Error("translation credits exhausted");
  if (res.status === 403) throw new Error("translation is blocked for this workspace");
  if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("empty translation response");
  const parsed = JSON.parse(raw) as { lines?: unknown };
  const lines = Array.isArray(parsed.lines) ? parsed.lines.map((l) => String(l ?? "")) : [];
  if (lines.length !== texts.length) throw new Error("translation line count mismatch");
  return lines;
}

async function saveCaptions(
  db: SupabaseClient,
  uploadId: string,
  language: string,
  source: string,
  model: string | null,
  segments: Segment[],
) {
  const { error } = await db.from("creator_upload_captions").upsert(
    {
      upload_id: uploadId,
      language,
      source,
      model,
      segment_count: segments.length,
      segments,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "upload_id,language" },
  );
  if (error) throw new Error(`caption upsert: ${error.message}`);
}

/** Generate the source-language captions for one upload. Cached when present. */
async function generateFor(db: SupabaseClient, uploadId: string) {
  const { data: upload } = await db
    .from("creator_uploads")
    .select("id,video_path,language,detected_language,size_bytes,creator_id,title,duration_seconds")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload) throw new Error("upload not found");
  if (!upload.video_path) throw new Error("upload has no media yet");

  const { data: existing } = await db
    .from("creator_upload_captions")
    .select("language,source,segment_count,segments")
    .eq("upload_id", uploadId)
    .eq("source", "asr")
    .maybeSingle();
  if (existing) return { cached: true, ...existing };

  if (upload.size_bytes && Number(upload.size_bytes) > MAX_TRANSCRIBE_BYTES) {
    throw new Error("media is too large for automatic captions");
  }
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("captions are not configured");

  const { data: file, error: dlErr } = await db.storage.from(UPLOAD_BUCKET).download(upload.video_path);
  if (dlErr || !file) throw new Error(`media download failed: ${dlErr?.message ?? "missing"}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = file.type || "video/mp4";

  const fileUri = await uploadToGemini(key, bytes, mimeType);
  const hint = (upload.detected_language ?? upload.language ?? "en").split("-")[0];
  const result = await transcribe(key, fileUri, mimeType, hint);
  await saveCaptions(db, uploadId, result.language, "asr", GEMINI_MODEL, result.segments);
  // Quality gate: warn the creator and moderators instead of letting a drifted
  // or half-empty track reach viewers unnoticed.
  const check = checkCaptionTrack(result.segments, upload.duration_seconds as number | null);
  await recordCaptionAudit(db, {
    uploadId,
    language: result.language,
    action: "generate_requested",
    check,
    segmentCount: result.segments.length,
  });
  await notifyCaptionQuality(db, {
    uploadId,
    language: result.language,
    check,
    creatorId: upload.creator_id as string | null,
    title: upload.title as string | null,
  });
  return {
    quality: check,
    cached: false,
    language: result.language,
    source: "asr",
    segment_count: result.segments.length,
    segments: result.segments,
  };
}

/** Translate the cached source captions into `language`. Cached when present. */
async function translateFor(db: SupabaseClient, uploadId: string, language: string) {
  const { data: cached } = await db
    .from("creator_upload_captions")
    .select("language,source,segment_count,segments")
    .eq("upload_id", uploadId)
    .eq("language", language)
    .maybeSingle();
  if (cached) return { cached: true, ...cached };

  const { data: base } = await db
    .from("creator_upload_captions")
    .select("language,segments")
    .eq("upload_id", uploadId)
    .eq("source", "asr")
    .maybeSingle();
  if (!base) throw new Error("this upload has no captions to translate yet");
  const sourceLanguage = String(base.language ?? "en").split("-")[0];
  if (sourceLanguage === language) return { cached: true, ...base, source: "asr" };

  const segments = (base.segments ?? []) as Segment[];
  const out: Segment[] = [];
  for (let i = 0; i < segments.length; i += CHUNK) {
    const slice = segments.slice(i, i + CHUNK);
    const lines = await translateChunk(
      slice.map((s) => s.text),
      LANGUAGES[language]!,
      LANGUAGES[sourceLanguage] ?? sourceLanguage,
    );
    slice.forEach((s, idx) => out.push({ start_ms: s.start_ms, end_ms: s.end_ms, text: lines[idx] }));
  }
  await saveCaptions(db, uploadId, language, "mt", TRANSLATE_MODEL, out);
  const { data: meta } = await db
    .from("creator_uploads")
    .select("creator_id,title,duration_seconds")
    .eq("id", uploadId)
    .maybeSingle();
  const check = checkCaptionTrack(out, (meta?.duration_seconds ?? null) as number | null);
  await recordCaptionAudit(db, {
    uploadId,
    language,
    action: "translate_requested",
    check,
    segmentCount: out.length,
  });
  await notifyCaptionQuality(db, {
    uploadId,
    language,
    check,
    creatorId: (meta?.creator_id ?? null) as string | null,
    title: (meta?.title ?? null) as string | null,
  });
  return { cached: false, language, source: "mt", segment_count: out.length, segments: out, quality: check };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let db: SupabaseClient;
  try { db = admin(); } catch { return json({ error: "server misconfigured" }, 500); }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const cronToken = req.headers.get("x-cron-token");
  const wantsCron = body.cron === true;

  // ---- Autonomous sweep lane -------------------------------------------
  if (wantsCron) {
    const expected = Deno.env.get("INGEST_CRON_TOKEN");
    if (!expected || cronToken !== expected) return json({ error: "forbidden" }, 403);
    const limit = Math.max(1, Math.min(10, Number(body.limit ?? 3)));

    const { data: pending } = await db
      .from("creator_uploads")
      .select("id")
      .eq("status", "approved")
      .not("video_path", "is", null)
      .order("published_at", { ascending: false })
      .limit(50);

    const results: Array<{ upload_id: string; ok: boolean; error?: string }> = [];
    for (const row of pending ?? []) {
      if (results.length >= limit) break;
      const { count } = await db
        .from("creator_upload_captions")
        .select("id", { count: "exact", head: true })
        .eq("upload_id", row.id);
      if ((count ?? 0) > 0) continue;
      try {
        await generateFor(db, row.id);
        results.push({ upload_id: row.id, ok: true });
      } catch (err) {
        results.push({ upload_id: row.id, ok: false, error: (err as Error).message.slice(0, 200) });
      }
    }
    return json({ ok: true, processed: results.length, results });
  }

  // ---- Interactive lane (owner or moderator) ---------------------------
  const uploadId = typeof body.upload_id === "string" ? body.upload_id.trim() : "";
  if (!uploadId) return json({ error: "upload_id required" }, 400);

  const caller = await resolveCaller(req);
  if (!caller) return json({ error: "unauthorized" }, 401);

  const { data: upload } = await db
    .from("creator_uploads")
    .select("id,user_id,status")
    .eq("id", uploadId)
    .maybeSingle();
  if (!upload) return json({ error: "not_found" }, 404);

  if (upload.user_id !== caller.id) {
    const { data: moderator } = await db.rpc("has_role", { _user_id: caller.id, _role: "moderator" });
    const { data: adminRole } = await db.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!moderator && !adminRole && upload.status !== "approved") {
      return json({ error: "forbidden" }, 403);
    }
  }

  const language = typeof body.language === "string" ? body.language.trim().toLowerCase().slice(0, 8) : "";

  try {
    if (language) {
      if (!LANGUAGES[language]) return json({ error: "unsupported language" }, 400);
      return json(await translateFor(db, uploadId, language));
    }
    return json(await generateFor(db, uploadId));
  } catch (err) {
    const message = (err as Error).message;
    console.error("creator-captions failed", uploadId, language, message);
    const status = message.includes("rate limited")
      ? 429
      : message.includes("not found") || message.includes("no captions")
        ? 404
        : message.includes("too large") || message.includes("not configured")
          ? 422
          : 502;
    return json({ error: message }, status);
  }
});
