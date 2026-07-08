import type { AiReasoningProvider, AiVerdict, VideoContext } from "../types.ts";

/**
 * Lovable AI Gateway provider (google/gemini-3-flash-preview by default).
 * No user-managed key — uses LOVABLE_API_KEY.
 */
export function lovableProvider(model = "google/gemini-3-flash-preview"): AiReasoningProvider {
  return {
    name: "lovable:" + model,
    async analyze(ctx: VideoContext): Promise<AiVerdict> {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("LOVABLE_API_KEY not configured");

      const prompt = buildPrompt(ctx);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Lovable AI ${res.status}: ${body.slice(0, 200)}`);
      }

      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "{}";
      return parseVerdict(raw, json);
    },
  };
}

const SYSTEM_PROMPT = `You are an Islamic content moderator for a strict halal video platform.
Return ONLY JSON with keys: confidence (0-100 how safely halal), risk (0-100 harm risk),
category (short label), reasoning (2-3 sentences citing evidence), flags (array of specific concerns).
Be conservative — err toward higher risk and lower confidence when uncertain.`;

function buildPrompt(ctx: VideoContext): string {
  return JSON.stringify({
    title: ctx.title,
    description: (ctx.description ?? "").slice(0, 1200),
    channel: ctx.channel_title,
    tags: (ctx.tags ?? []).slice(0, 20),
    category: ctx.category,
    language: ctx.language,
    duration_seconds: ctx.duration_seconds,
  });
}

function parseVerdict(text: string, raw: unknown): AiVerdict {
  try {
    const j = JSON.parse(text);
    return {
      confidence: clamp(Number(j.confidence ?? 0)),
      risk: clamp(Number(j.risk ?? 100)),
      category: j.category,
      reasoning: String(j.reasoning ?? "").slice(0, 2000),
      flags: Array.isArray(j.flags) ? j.flags.slice(0, 20).map(String) : [],
      raw,
    };
  } catch {
    return { confidence: 0, risk: 100, reasoning: "unparseable model output", raw };
  }
}
function clamp(n: number) { return Math.max(0, Math.min(100, isFinite(n) ? n : 0)); }
