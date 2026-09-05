/**
 * Portable AI gateway resolver.
 *
 * Every AI call in Heartify (moderation reasoning, thumbnail vision checks,
 * captioning, transcript translation, embeddings) speaks the OpenAI-compatible
 * `/v1/chat/completions` + `/v1/embeddings` wire format. The default provider
 * is the Lovable AI gateway, but nothing in the code is bound to it: set
 *
 *   AI_GATEWAY_BASE_URL  e.g. https://api.openai.com/v1
 *   AI_GATEWAY_API_KEY   the key for that provider
 *
 * and every AI-backed function moves to the new provider with no code change.
 * This is what makes the production system operable independently of Lovable
 * (see docs/EXIT_LOVABLE.md).
 */

const DEFAULT_BASE_URL = "https://ai.gateway.lovable.dev/v1";

/** Base URL for the OpenAI-compatible provider, never trailing-slashed. */
export function aiBaseUrl(): string {
  const raw = Deno.env.get("AI_GATEWAY_BASE_URL")?.trim();
  return (raw && raw.length > 0 ? raw : DEFAULT_BASE_URL).replace(/\/+$/, "");
}

/** API key for the resolved provider, or null when AI is not configured. */
export function aiApiKey(): string | null {
  return (
    Deno.env.get("AI_GATEWAY_API_KEY")?.trim() ||
    Deno.env.get("LOVABLE_API_KEY")?.trim() ||
    null
  );
}

export function chatCompletionsUrl(): string {
  return `${aiBaseUrl()}/chat/completions`;
}

export function embeddingsUrl(): string {
  return `${aiBaseUrl()}/embeddings`;
}

/** True when an AI provider is usable. Callers must degrade gracefully. */
export function aiConfigured(): boolean {
  return aiApiKey() !== null;
}
