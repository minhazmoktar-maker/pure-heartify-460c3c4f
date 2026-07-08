import type { AiReasoningProvider, AiVerdict, VideoContext } from "../types.ts";

/**
 * Direct Gemini provider using the pre-existing GEMINI_API_KEY secret.
 * Kept as fallback / alternative to the Lovable gateway.
 */
export function geminiProvider(model = "gemini-2.5-flash"): AiReasoningProvider {
  return {
    name: "gemini:" + model,
    async analyze(ctx: VideoContext): Promise<AiVerdict> {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) throw new Error("GEMINI_API_KEY not configured");

      const prompt = `${SYSTEM_PROMPT}\n\nInput:\n${JSON.stringify({
        title: ctx.title,
        description: (ctx.description ?? "").slice(0, 1200),
        channel: ctx.channel_title,
        tags: (ctx.tags ?? []).slice(0, 20),
      })}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);

      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
      try {
        const j = JSON.parse(text);
        return {
          confidence: clamp(Number(j.confidence ?? 0)),
          risk: clamp(Number(j.risk ?? 100)),
          category: j.category,
          reasoning: String(j.reasoning ?? "").slice(0, 2000),
          flags: Array.isArray(j.flags) ? j.flags.slice(0, 20).map(String) : [],
          raw: json,
        };
      } catch {
        return { confidence: 0, risk: 100, reasoning: "unparseable model output", raw: json };
      }
    },
  };
}

const SYSTEM_PROMPT = `You are an Islamic content moderator for a strict halal video platform.
Return ONLY JSON: {confidence:0-100, risk:0-100, category:string, reasoning:string, flags:string[]}.
Be conservative — err toward higher risk and lower confidence when uncertain.`;

function clamp(n: number) { return Math.max(0, Math.min(100, isFinite(n) ? n : 0)); }
