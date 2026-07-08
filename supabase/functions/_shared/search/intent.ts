/**
 * AI-powered query intent detection via Lovable AI Gateway.
 * Fails open — if the model errors or is slow, we return null and the
 * search still runs with the raw query.
 */
import type { SearchIntent } from "./types.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `You classify Islamic-content video search queries.
Return STRICT JSON with keys:
  rewrittenQuery (string, corrected & normalized, keep language),
  topic          (string, one of: quran, hadith, seerah, dua, salah, ramadan,
                  finance, family, dawah, nasheed, kids, lecture, general),
  category       (string or null, best guess of catalog category),
  channel        (string or null, if a channel/scholar is named),
  entities       (string[], e.g. ["Mufti Menk"]),
  language       (ISO code, e.g. "en", "ar", "ur").
No prose. JSON only.`;

export async function detectIntent(query: string): Promise<SearchIntent | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || !query || query.length < 3 || query.length > 200) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 1200);
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: query },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      rewrittenQuery: typeof parsed.rewrittenQuery === "string" ? parsed.rewrittenQuery : undefined,
      topic: typeof parsed.topic === "string" ? parsed.topic : undefined,
      category: parsed.category ?? undefined,
      channel: parsed.channel ?? undefined,
      entities: Array.isArray(parsed.entities) ? parsed.entities.slice(0, 8) : undefined,
      language: typeof parsed.language === "string" ? parsed.language : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
