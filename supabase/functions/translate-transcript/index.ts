/**
 * Transcript translation.
 *
 * POST /translate-transcript  { video_id: string, language: string }
 *   Authorization: Bearer <user jwt>
 *
 * Returns the cached translation when one exists, otherwise translates the
 * stored transcript segment-by-segment (timings preserved) through the Lovable
 * AI gateway and caches it in transcript_translations.
 *
 * Timings are never recomputed: the model only rewrites the text of each
 * segment, so translated captions stay clickable/seekable.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "google/gemini-2.5-flash";
const MAX_SEGMENTS = 1200;
const CHUNK = 80;

const LANGUAGES: Record<string, string> = {
  en: "English", ar: "Arabic", bn: "Bengali", ur: "Urdu", hi: "Hindi", id: "Indonesian",
  ms: "Malay", tr: "Turkish", fa: "Persian", fr: "French", es: "Spanish", pt: "Portuguese",
  de: "German", ru: "Russian", sw: "Swahili", ha: "Hausa", so: "Somali", ps: "Pashto",
  zh: "Chinese (Simplified)", ja: "Japanese", ko: "Korean", nl: "Dutch", it: "Italian",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function translateChunk(texts: string[], target: string, sourceName: string): Promise<string[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("translation is not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
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
  if (!res.ok) throw new Error(`gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const payload = await res.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) throw new Error("empty translation response");
  const parsed = JSON.parse(raw) as { lines?: unknown };
  const lines = Array.isArray(parsed.lines) ? parsed.lines.map((l) => String(l ?? "")) : [];
  if (lines.length !== texts.length) throw new Error("translation line count mismatch");
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await anon.auth.getUser();
  if (!auth?.user) return json({ error: "authentication required" }, 401);

  const body = await req.json().catch(() => ({}));
  const videoId = typeof body.video_id === "string" ? body.video_id.trim() : "";
  const language = typeof body.language === "string" ? body.language.trim().toLowerCase().slice(0, 8) : "";
  if (!videoId || videoId.length > 32) return json({ error: "invalid video_id" }, 400);
  if (!LANGUAGES[language]) return json({ error: "unsupported language" }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: cached } = await admin
    .from("transcript_translations")
    .select("language, source_language, segments, segment_count")
    .eq("video_id", videoId)
    .eq("language", language)
    .maybeSingle();
  if (cached) return json({ cached: true, ...cached });

  const { data: header } = await admin
    .from("video_transcripts")
    .select("language")
    .eq("video_id", videoId)
    .maybeSingle();
  if (!header) return json({ error: "no transcript for this video yet" }, 404);
  const sourceLanguage = (header.language ?? "en").slice(0, 8);
  if (sourceLanguage.split("-")[0] === language) {
    return json({ error: "transcript is already in that language" }, 409);
  }

  const { data: segments, error: segErr } = await admin
    .from("transcript_segments")
    .select("start_ms, end_ms, text")
    .eq("video_id", videoId)
    .order("start_ms", { ascending: true })
    .limit(MAX_SEGMENTS);
  if (segErr) return json({ error: segErr.message }, 500);
  if (!segments?.length) return json({ error: "transcript has no segments" }, 404);

  const sourceName = LANGUAGES[sourceLanguage.split("-")[0]] ?? sourceLanguage;
  const out: Array<{ start_ms: number; end_ms: number | null; text: string }> = [];
  try {
    for (let i = 0; i < segments.length; i += CHUNK) {
      const slice = segments.slice(i, i + CHUNK);
      const lines = await translateChunk(slice.map((s) => s.text), LANGUAGES[language], sourceName);
      slice.forEach((s, idx) => {
        out.push({ start_ms: s.start_ms, end_ms: s.end_ms, text: lines[idx] });
      });
    }
  } catch (err) {
    const message = (err as Error).message;
    console.error("translate failed", videoId, language, message);
    return json({ error: message }, message.includes("rate limited") ? 429 : 502);
  }

  const { error: upErr } = await admin.from("transcript_translations").upsert(
    {
      video_id: videoId,
      language,
      source_language: sourceLanguage,
      model: MODEL,
      segment_count: out.length,
      segments: out,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "video_id,language" },
  );
  if (upErr) return json({ error: upErr.message }, 500);

  return json({ cached: false, language, source_language: sourceLanguage, segment_count: out.length, segments: out });
});
