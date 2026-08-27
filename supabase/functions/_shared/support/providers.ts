/**
 * Provider-agnostic inference layer for Heartify Support AI.
 *
 * Heartify's production support path must NOT depend on the Lovable runtime AI
 * gateway. This module talks to independent providers (or a self-hosted
 * OpenAI-compatible endpoint) configured purely through environment variables,
 * with automatic primary -> secondary failover and health recording.
 *
 * Env (server-only, never exposed to the browser):
 *   SUPPORT_AI_PROVIDER        openai | anthropic | google | openai_compatible
 *   SUPPORT_AI_API_KEY
 *   SUPPORT_AI_BASE_URL        optional (required for openai_compatible/self-hosted)
 *   SUPPORT_AI_MODEL           standard-tier model id
 *   SUPPORT_AI_MODEL_CHEAP     optional cheap-tier model id (defaults to MODEL)
 *   SUPPORT_AI_MODEL_CAPABLE   optional capable-tier model id (defaults to MODEL)
 *   SUPPORT_AI_PRICE_IN        USD per 1M input tokens (optional, for telemetry)
 *   SUPPORT_AI_PRICE_OUT       USD per 1M output tokens (optional, for telemetry)
 *   SUPPORT_AI_FALLBACK_*      same keys for the secondary provider
 *   SUPPORT_EMBED_PROVIDER/_API_KEY/_BASE_URL/_MODEL   embeddings (optional)
 */

export type ProviderKind = "openai" | "anthropic" | "google" | "openai_compatible";
export type ModelTier = "cheap" | "standard" | "capable";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  provider: string;
  model: string;
  costUsd: number;
}

export interface ProviderConfig {
  name: string;
  kind: ProviderKind;
  apiKey: string;
  baseUrl: string;
  models: Record<ModelTier, string>;
  priceIn: number; // USD per 1M input tokens
  priceOut: number; // USD per 1M output tokens
}

const DEFAULT_BASE_URL: Record<ProviderKind, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  openai_compatible: "",
};

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

function num(name: string, fallback: number): number {
  const v = env(name);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function readConfig(prefix: string, label: string): ProviderConfig | null {
  const kind = (env(`${prefix}PROVIDER`) ?? "").toLowerCase() as ProviderKind;
  const apiKey = env(`${prefix}API_KEY`);
  const model = env(`${prefix}MODEL`);
  if (!kind || !apiKey || !model) return null;
  if (!["openai", "anthropic", "google", "openai_compatible"].includes(kind)) return null;
  const baseUrl = env(`${prefix}BASE_URL`) ?? DEFAULT_BASE_URL[kind];
  if (!baseUrl) return null;
  return {
    name: label,
    kind,
    apiKey,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    models: {
      cheap: env(`${prefix}MODEL_CHEAP`) ?? model,
      standard: model,
      capable: env(`${prefix}MODEL_CAPABLE`) ?? model,
    },
    priceIn: num(`${prefix}PRICE_IN`, 0.15),
    priceOut: num(`${prefix}PRICE_OUT`, 0.6),
  };
}

/** Ordered provider chain: primary first, then the configured secondary. */
export function getProviderChain(): ProviderConfig[] {
  const chain: ProviderConfig[] = [];
  const primary = readConfig("SUPPORT_AI_", "primary");
  const secondary = readConfig("SUPPORT_AI_FALLBACK_", "secondary");
  if (primary) chain.push(primary);
  if (secondary) chain.push(secondary);
  return chain;
}

export function isInferenceConfigured(): boolean {
  return getProviderChain().length > 0;
}

function estimateCost(cfg: ProviderConfig, inTok: number, outTok: number): number {
  return (inTok / 1_000_000) * cfg.priceIn + (outTok / 1_000_000) * cfg.priceOut;
}

async function callOpenAiCompatible(
  cfg: ProviderConfig,
  model: string,
  messages: ChatMessage[],
  opts: { maxTokens: number; timeoutMs: number; jsonMode: boolean },
): Promise<ChatResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: opts.maxTokens,
    };
    if (opts.jsonMode) body.response_format = { type: "json_object" };
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${cfg.kind} ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content ?? "";
    const inTok = json.usage?.prompt_tokens ?? 0;
    const outTok = json.usage?.completion_tokens ?? 0;
    return {
      text,
      promptTokens: inTok,
      completionTokens: outTok,
      provider: cfg.kind,
      model,
      costUsd: estimateCost(cfg, inTok, outTok),
    };
  } finally {
    clearTimeout(t);
  }
}

async function callAnthropic(
  cfg: ProviderConfig,
  model: string,
  messages: ChatMessage[],
  opts: { maxTokens: number; timeoutMs: number },
): Promise<ChatResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    const res = await fetch(`${cfg.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, system, messages: turns, max_tokens: opts.maxTokens }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    const inTok = json.usage?.input_tokens ?? 0;
    const outTok = json.usage?.output_tokens ?? 0;
    return {
      text,
      promptTokens: inTok,
      completionTokens: outTok,
      provider: "anthropic",
      model,
      costUsd: estimateCost(cfg, inTok, outTok),
    };
  } finally {
    clearTimeout(t);
  }
}

async function callProvider(
  cfg: ProviderConfig,
  tier: ModelTier,
  messages: ChatMessage[],
  opts: { maxTokens?: number; timeoutMs?: number; jsonMode?: boolean } = {},
): Promise<ChatResult> {
  const model = cfg.models[tier];
  const maxTokens = opts.maxTokens ?? 900;
  const timeoutMs = opts.timeoutMs ?? 25_000;
  if (cfg.kind === "anthropic") {
    return await callAnthropic(cfg, model, messages, { maxTokens, timeoutMs });
  }
  // openai, google (OpenAI-compatible endpoint) and self-hosted all share this shape.
  return await callOpenAiCompatible(cfg, model, messages, {
    maxTokens,
    timeoutMs,
    jsonMode: opts.jsonMode ?? false,
  });
}

export interface HealthRecorder {
  (provider: string, ok: boolean, error?: string): Promise<void>;
}

export class ProviderFailure extends Error {
  constructor(public readonly attempts: Array<{ provider: string; error: string }>) {
    super("all_providers_failed");
  }
}

/**
 * Run a chat completion against the provider chain with automatic failover.
 * Provider-level errors never reach the user; the caller renders a safe
 * fallback when this throws ProviderFailure.
 */
export async function chatWithFailover(
  tier: ModelTier,
  messages: ChatMessage[],
  opts: {
    maxTokens?: number;
    timeoutMs?: number;
    jsonMode?: boolean;
    recordHealth?: HealthRecorder;
  } = {},
): Promise<ChatResult & { providerLabel: string }> {
  const chain = getProviderChain();
  const attempts: Array<{ provider: string; error: string }> = [];
  for (const cfg of chain) {
    try {
      const result = await callProvider(cfg, tier, messages, opts);
      if (!result.text.trim()) throw new Error("empty_completion");
      await opts.recordHealth?.(cfg.kind, true);
      return { ...result, providerLabel: cfg.name };
    } catch (e) {
      const msg = (e as Error).message?.slice(0, 300) ?? "unknown";
      console.error(`[support-ai] provider ${cfg.name}/${cfg.kind} failed: ${msg}`);
      attempts.push({ provider: cfg.kind, error: msg });
      await opts.recordHealth?.(cfg.kind, false, msg);
    }
  }
  throw new ProviderFailure(attempts);
}

// ---------------------------------------------------------------------------
// Embeddings (semantic cache + KB retrieval), also provider-independent.
// ---------------------------------------------------------------------------

export const SUPPORT_EMBED_DIMS = 1536;

interface EmbedConfig {
  kind: "openai" | "openai_compatible";
  apiKey: string;
  baseUrl: string;
  model: string;
}

function readEmbedConfig(): EmbedConfig | null {
  const apiKey = env("SUPPORT_EMBED_API_KEY") ?? env("SUPPORT_AI_API_KEY");
  if (!apiKey) return null;
  const kind = (env("SUPPORT_EMBED_PROVIDER") ?? "openai").toLowerCase();
  if (kind !== "openai" && kind !== "openai_compatible") return null;
  const baseUrl = (env("SUPPORT_EMBED_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  return {
    kind,
    apiKey,
    baseUrl,
    model: env("SUPPORT_EMBED_MODEL") ?? "text-embedding-3-small",
  };
}

export function isEmbeddingConfigured(): boolean {
  return readEmbedConfig() !== null;
}

/**
 * Embed text through the independent provider. Returns null on any failure —
 * semantic recall is additive; lexical FAQ matching keeps working without it.
 */
export async function embedSupportText(
  input: string,
  { timeoutMs = 8000 }: { timeoutMs?: number } = {},
): Promise<number[] | null> {
  const cfg = readEmbedConfig();
  if (!cfg) return null;
  const clean = (input ?? "").trim().slice(0, 8000);
  if (!clean) return null;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${cfg.baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, input: clean, dimensions: SUPPORT_EMBED_DIMS }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[support-ai] embed ${res.status}: ${(await res.text()).slice(0, 160)}`);
      return null;
    }
    const json = await res.json() as { data?: Array<{ embedding: number[] }> };
    const vec = json.data?.[0]?.embedding;
    return Array.isArray(vec) && vec.length === SUPPORT_EMBED_DIMS ? vec : null;
  } catch (e) {
    console.error("[support-ai] embed failed:", (e as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
