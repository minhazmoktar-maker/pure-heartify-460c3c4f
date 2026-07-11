/**
 * Embedding helper — routes text through the Lovable AI Gateway.
 *
 * Uses openai/text-embedding-3-small (1536 dims) to match the
 * curated_videos.embedding column shape.
 *
 * Never called from the browser: consumers are edge functions with access to
 * LOVABLE_API_KEY.
 */
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "openai/text-embedding-3-small";
export const EMBED_DIMS = 1536;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await p;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Embed one or many strings. Returns null on failure — callers should treat
 * embedding as opportunistic (semantic recall is additive to lexical search).
 */
export async function embedTexts(
  inputs: string | string[],
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<number[][] | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) {
    console.warn("[embed] LOVABLE_API_KEY missing — skipping embedding call");
    return null;
  }
  const arr = Array.isArray(inputs) ? inputs : [inputs];
  const clean = arr
    .map((s) => (typeof s === "string" ? s.trim().slice(0, 8000) : ""))
    .filter((s) => s.length > 0);
  if (clean.length === 0) return null;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Lovable-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, input: clean }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[embed] gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const json = await res.json() as { data?: Array<{ embedding: number[]; index: number }> };
    if (!json.data?.length) return null;
    // Sort by index just in case provider re-orders.
    const sorted = json.data.slice().sort((a, b) => a.index - b.index);
    return sorted.map((d) => d.embedding);
  } catch (e) {
    console.error("[embed] failed:", (e as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function embedOne(text: string): Promise<number[] | null> {
  const vecs = await embedTexts(text);
  return vecs?.[0] ?? null;
}

/**
 * Postgres vector literal serializer — pgvector accepts the string form
 * `[0.1,0.2,...]` when passed as an RPC/insert value.
 */
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

// Silence unused warning when only some helpers are imported.
void withTimeout;
