/**
 * Question normalisation + cacheability rules for the Heartify support agent.
 *
 * Pure, dependency-free and runtime-agnostic on purpose: the same module is
 * executed by the edge function (Deno) and by the Vitest suite (Node), so the
 * cache key the server writes is provably the key the tests assert on.
 */
import { canonicalizeQuestion } from "./multilingual.ts";



/** Common typos / spelling variants folded before hashing the cache key. */
const SPELLING: Array<[RegExp, string]> = [
  [/\bacct\b/g, "account"],
  [/\bacount\b/g, "account"],
  [/\bpassowrd\b|\bpasword\b|\bpwd\b/g, "password"],
  [/\bcancle\b/g, "cancel"],
  [/\bsubscribtion\b|\bsubcription\b/g, "subscription"],
  [/\bpremiun\b/g, "premium"],
  [/\bfavourite(s?)\b/g, "favorite$1"],
  [/\bdelete?ing\b/g, "delete"],
  [/\bhowto\b/g, "how to"],
  [/\bu\b/g, "you"],
  [/\bur\b/g, "your"],
  [/\bpls\b|\bplz\b/g, "please"],
];

/** Filler words that never change the intent of a support question. */
const STOPWORDS = new Set([
  "a", "an", "the", "please", "kindly", "hey", "hi", "hello", "salam",
  "assalamualaikum", "can", "could", "would", "you", "your", "me", "my",
  "i", "do", "does", "did", "is", "are", "am", "to", "of", "for", "on",
  "in", "at", "and", "so", "just", "tell", "help",
  // Grammatical filler left behind after multilingual canonicalisation
  // (romanised Bengali/Urdu verb endings, Indonesian/Malay/Turkish particles).
  "korbo", "korte", "kori", "kore", "korchi", "karu", "karun", "karna", "kar",
  "kya", "hai", "hain", "ho", "hoy", "cara", "bisa", "boleh", "untuk", "yang",
  "apakah", "nasil", "nas", "mi", "mu", "ki", "ke", "je", "ne", "que", "como",
  "wie", "ich", "kann", "el", "la", "le", "les", "un", "una", "der", "die",
  "das", "how",
]);

/**
 * Fold a question into a stable cache key: case, whitespace, punctuation,
 * diacritics, spelling variants and filler words are all collapsed, and the
 * remaining tokens are sorted so word order does not fragment the cache.
 *
 * Non-English questions are canonicalised into English support vocabulary
 * first, so "কিভাবে ভিডিও সেভ করবো" and "how do I save a video" share one key.
 */
export function normalizeQuestion(input: string): string {
  const { canonical } = canonicalizeQuestion(input ?? "");
  let s = canonical.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  for (const [re, to] of SPELLING) s = s.replace(re, to);
  const tokens = s.split(" ").filter((t) => t.length > 0 && !STOPWORDS.has(t));
  if (tokens.length === 0) return s.slice(0, 200);
  return Array.from(new Set(tokens)).sort().join(" ").slice(0, 300);
}


/**
 * Words that make an answer account-specific. A question containing any of
 * them must never be served from — or written to — the shared answer cache,
 * even when the phrasing looks generic.
 */
const PERSONAL_MARKERS = [
  // Ownership of state (a generic how-to like "how do I delete my account" is
  // still cacheable — only questions ABOUT the caller's own state are not).
  "my streak", "my plan", "my subscription", "my premium", "my payment",
  "my invoice", "my receipt", "my email address", "my video", "my videos",
  "my upload", "my channel", "my report", "my appeal", "my data", "my history",
  "my watch", "my favorites", "my favourites", "my progress", "my balance",
  "my order", "my ticket", "my session",
  // State-of-my-account phrasing.
  "why was", "why did my", "why is my", "why can't i", "why cant i",
  "was removed", "was rejected", "was banned", "was suspended",
  "i was charged", "charged twice", "double charged", "billed me",
  "refund", "suspended", "banned", "appeal",
  // Never cache anything that could carry a credential or one-time code.
  "verification code", "otp", "reset link", "my password is",
];

/** True when the question is safe to answer from a globally shared cache. */
export function isCacheable(rawQuestion: string, opts: { signedIn: boolean }): boolean {
  const raw = (rawQuestion ?? "").toLowerCase();
  // Judge both the original and the canonicalised English text, so a personal
  // question typed in Bengali or Urdu is caught by the same markers.
  const canonical = canonicalizeQuestion(rawQuestion ?? "").canonical.toLowerCase();
  const clean = (s: string) =>
    s.replace(/[^\p{L}\p{N}'\s]/gu, " ").replace(/\s+/g, " ").trim();
  const candidates = [clean(raw), clean(canonical)];
  if (candidates.every((q) => q.length < 6)) return false;
  if (candidates.some((q) => PERSONAL_MARKERS.some((m) => q.includes(m)))) return false;
  // Signed-in status alone never blocks caching — only personal phrasing does.
  void opts;
  return true;
}


/** Router tiers, cheapest first. Everything above `llm_cheap` costs nothing. */
export type ResolutionLayer =
  | "static"       // L0 self-describing / conversational, answered in-process
  | "unsupported"  // L0 out-of-scope request declined deterministically
  | "blocked"      // L0 prompt-injection or extraction attempt refused
  | "flow"         // L0 guided troubleshooting script
  | "tool"         // L0 structured action (e.g. filing a content report)
  | "exact_cache"
  | "semantic_cache"
  | "faq"
  | "llm_cheap"
  | "llm_standard"
  | "llm_capable"
  | "degraded";


export interface RouteDecision {
  tier: "cheap" | "standard" | "capable";
  reason: string;
}

const SAFETY_SENSITIVE = [
  "refund", "charge", "legal", "gdpr", "lawsuit", "police", "harass",
  "suicide", "self harm", "abuse", "child", "hack", "stolen", "fraud",
  "delete my data", "privacy request", "copyright", "dmca",
];

const COMPLEX_HINTS = [
  "why", "explain", "difference", "compare", "not working", "broken",
  "error", "steps", "appeal", "policy", "moderation", "rejected",
];

/**
 * Pick the cheapest model tier that can safely answer. Most questions land on
 * `cheap`; only safety-sensitive or genuinely ambiguous ones escalate.
 */
export function routeQuestion(rawQuestion: string, opts: {
  groundingChunks: number;
  historyTurns: number;
  personalized: boolean;
}): RouteDecision {
  const q = (rawQuestion ?? "").toLowerCase();
  if (SAFETY_SENSITIVE.some((m) => q.includes(m))) {
    return { tier: "capable", reason: "safety_sensitive" };
  }
  if (opts.groundingChunks === 0) {
    return { tier: "capable", reason: "no_grounding_available" };
  }
  if (opts.personalized || opts.historyTurns >= 4) {
    return { tier: "standard", reason: opts.personalized ? "account_specific" : "long_thread" };
  }
  if (q.length > 220 || COMPLEX_HINTS.some((m) => q.includes(m))) {
    return { tier: "standard", reason: "reasoning_required" };
  }
  return { tier: "cheap", reason: "simple_lookup" };
}

/**
 * Output validation. An answer that fails here is never shown: the caller
 * falls back to the safe, grounded-in-nothing-promised response.
 */
export interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

const FORBIDDEN_PATTERNS: Array<[RegExp, string]> = [
  [/\b(sk|pk)-[a-z0-9]{16,}/i, "looks_like_api_key"],
  [/\b(service[_ ]role|supabase_service|anon key|bearer [a-z0-9._-]{24,})/i, "credential_leak"],
  [/\byou are (a|an|the) [a-z ]*assistant\b/i, "system_prompt_leak"],
  [/\b(system prompt|my instructions are|my system message)\b/i, "system_prompt_leak"],
  [/\b(i guarantee|we guarantee|guaranteed refund|100% refund|we promise)\b/i, "unsupported_promise"],
  [/\b(select |insert into |update .* set |drop table|from public\.)/i, "raw_sql_leak"],
  [/\bhttps?:\/\/(?!(www\.)?heartifyapp\.com|pure-heartify\.lovable\.app)/i, "offsite_link"],
  [/\blovable\b/i, "vendor_disclosure"],
  [/\b(openai|anthropic|gemini|deepseek|groq|gpt-\d|claude)\b/i, "vendor_disclosure"],
];

export function validateAnswer(answer: string, opts: {
  requiresGrounding: boolean;
  sourceCount: number;
}): ValidationResult {
  const reasons: string[] = [];
  const text = (answer ?? "").trim();
  if (text.length < 2) reasons.push("empty");
  if (text.length > 4000) reasons.push("too_long");
  for (const [re, reason] of FORBIDDEN_PATTERNS) {
    if (re.test(text)) reasons.push(reason);
  }
  if (opts.requiresGrounding && opts.sourceCount === 0) reasons.push("ungrounded_policy_claim");
  return { ok: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
}

/** Heuristic: does this question make a claim about Heartify policy/pricing? */
export function requiresGrounding(rawQuestion: string): boolean {
  const q = `${(rawQuestion ?? "").toLowerCase()} ${canonicalizeQuestion(rawQuestion ?? "").canonical.toLowerCase()}`;
  return ["policy", "rule", "allowed", "halal", "price", "cost", "premium",
    "refund", "terms", "privacy", "data", "ban", "remove", "delete", "copyright"]
    .some((k) => q.includes(k));
}

/**
 * Escalation / degradation hardening.
 *
 * When the agent cannot answer it must say so in product language only. This
 * strips provider names, model ids, stack traces, internal identifiers and
 * infrastructure vocabulary from anything that could reach a user, so a
 * failure never becomes an information disclosure.
 */
const INTERNAL_PATTERNS: RegExp[] = [
  /\b(openai|anthropic|gemini|deepseek|groq|mistral|together ?ai|ollama|lovable|supabase|postgres|deno|vercel|cloudflare)\b/gi,
  /\bgpt-[\w.-]+\b|\bclaude-[\w.-]+\b|\bgemini-[\w.-]+\b|\bllama-?[\w.-]*\b/gi,
  /\b(edge function|service[_ ]role|anon key|api key|rpc|sql|embedding|vector|prompt tokens?|completion tokens?)\b/gi,
  /\b(http\s?)?(status\s?)?(4\d{2}|5\d{2})\s?(error|response)\b/gi,
  /\b[A-Za-z_]+Error\b|\bstack trace\b|\btimeout after \d+ms\b/gi,
  /\bmodel (call|tier|routing)\b/gi,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
];

export function containsInternalDetail(text: string): boolean {
  return INTERNAL_PATTERNS.some((re) => new RegExp(re.source, re.flags).test(text ?? ""));
}

export function scrubInternal(text: string): string {
  let out = text ?? "";
  for (const re of INTERNAL_PATTERNS) {
    out = out.replace(new RegExp(re.source, re.flags), "our systems");
  }
  return out.replace(/(our systems)(\W+our systems)+/gi, "$1").replace(/\s{2,}/g, " ").trim();
}

/**
 * The single user-facing message used whenever the agent must degrade or
 * escalate. Deliberately free of any internal cause.
 */
export const ESCALATION_MESSAGE =
  "I couldn't confirm that from Heartify's Help centre, so I'd rather not guess. " +
  "Here are the closest Help articles, and our team can pick this up from the Contact page.";

/** Guard applied to every outgoing answer: scrub, then verify it is clean. */
export function safeOutboundAnswer(candidate: string, fallback = ESCALATION_MESSAGE): string {
  const scrubbed = scrubInternal(candidate ?? "");
  if (!scrubbed || containsInternalDetail(scrubbed)) return fallback;
  return scrubbed;
}


/** Prompt-injection screen applied to the raw user turn before anything else. */
const INJECTION_PATTERNS = [
  /ignore (all |your |the )?(previous|prior|above) (instructions|prompts?|rules)/i,
  /disregard (your|the|all) (instructions|rules|system)/i,
  /(reveal|show|print|repeat|output) (me )?(your |the )?(system )?(prompt|instructions|rules)/i,
  /you are now (a|an|in) /i,
  /developer mode|jailbreak|DAN mode/i,
  /(show|dump|list) (the )?(database|env|environment|secrets?|api keys?)/i,
  /another user'?s? (account|data|email|profile)/i,
  // Word order varies once a question is canonicalised from another language,
  // so match the object itself — no support question needs these terms.
  /\b(system|initial|hidden) (prompt|instructions)\b/i,
];

export function detectInjection(rawQuestion: string): string | null {
  const q = `${rawQuestion ?? ""}\n${canonicalizeQuestion(rawQuestion ?? "").canonical}`;

  for (const re of INJECTION_PATTERNS) {
    if (re.test(q)) return re.source.slice(0, 60);
  }
  return null;
}
