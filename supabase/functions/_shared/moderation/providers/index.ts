import type { AiReasoningProvider } from "../types.ts";
import { lovableProvider } from "./lovable.ts";
import { geminiProvider } from "./gemini.ts";

/**
 * Provider registry. Adding a new AI provider = add one file + register here.
 * The rest of the system depends only on the `AiReasoningProvider` interface.
 */
const REGISTRY: Record<string, () => AiReasoningProvider> = {
  lovable: () => lovableProvider(),
  gemini: () => geminiProvider(),
};

export function getProvider(name: string): AiReasoningProvider | null {
  const factory = REGISTRY[name];
  return factory ? factory() : null;
}

/**
 * Resolve a provider with fallback. Tries preferred first, falls back if
 * that provider throws or is not registered. Returns null if both fail.
 */
export async function withProviderFallback<T>(
  preferred: string,
  fallback: string,
  fn: (p: AiReasoningProvider) => Promise<T>,
): Promise<{ result: T; provider: string } | { error: string }> {
  for (const name of [preferred, fallback]) {
    const p = getProvider(name);
    if (!p) continue;
    try {
      const result = await fn(p);
      return { result, provider: p.name };
    } catch (e) {
      console.warn(`[moderation] provider ${name} failed:`, (e as Error).message);
    }
  }
  return { error: "all providers failed" };
}
