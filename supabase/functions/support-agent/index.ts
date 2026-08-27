/**
 * support-agent — Heartify's in-app AI Help & Support assistant.
 *
 * Pipeline per turn:
 *   1. Rate limit (DB-backed, per user or IP).
 *   2. Optional JWT verification — signed-out visitors are supported and
 *      tracked by an opaque client-generated anon key.
 *   3. Load / create the conversation and its recent history.
 *   4. Retrieve grounding chunks from the vetted support KB (hybrid
 *      semantic + lexical via match_support_kb).
 *   5. Build an account-fact block (only what the caller is entitled to see).
 *   6. One grounded generation call through the Lovable AI Gateway with a
 *      strict JSON envelope; sources and follow-up actions are validated
 *      against server-side whitelists.
 *   7. Persist both turns, record knowledge gaps, and open an escalation
 *      when the assistant cannot resolve the issue.
 *
 * Security notes:
 *   - Untrusted text (question, history, KB chunks) is delimiter-wrapped and
 *     escaped; the system prompt declares delimited content to be data.
 *   - The model can never emit a link: it picks an action id from a fixed
 *     catalogue which the server resolves to an in-app route.
 *   - Anonymous callers get no account facts at all.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { embedOne, toPgVector } from "../_shared/embed.ts";
import { actionCatalogue, resolveActions } from "../_shared/support/routes.ts";
import {
  buildAccountBlock,
  buildKbBlock,
  buildSystemPrompt,
  buildUserBlock,
  parseEnvelope,
  sanitizeUserText,
  SUPPORT_MODEL,
  type AccountContext,
  type KbChunk,
} from "../_shared/support/prompt.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LOW_CONFIDENCE = 0.5;

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  conversation_id: z.string().uuid().optional(),
  anon_key: z.string().min(8).max(64).optional(),
  locale: z.string().min(2).max(12).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clientIdentity(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
  return `ip:${ip}`;
}

async function loadAccountContext(
  admin: SupabaseClient,
  userId: string | null,
  locale: string,
): Promise<AccountContext> {
  if (!userId) return { signed_in: false, locale };

  const [profile, entitlement, reports, appeals, roles] = await Promise.all([
    admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    admin.from("entitlements").select("plan, expires_at").eq("user_id", userId).maybeSingle(),
    admin.from("video_reports").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "pending"),
    admin.from("appeals").select("id", { count: "exact", head: true })
      .eq("user_id", userId).in("status", ["pending", "in_review", "open"]),
    admin.from("user_roles").select("role").eq("user_id", userId),
  ]);

  return {
    signed_in: true,
    locale,
    display_name: profile.data?.display_name ?? null,
    plan: entitlement.data?.plan ?? "free",
    open_reports: reports.count ?? 0,
    open_appeals: appeals.count ?? 0,
    is_creator: (roles.data ?? []).some((r: { role: string }) => r.role === "creator"),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return json({ error: "server misconfigured" }, 500);
  if (!LOVABLE_API_KEY) return json({ error: "assistant unavailable" }, 503);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json({ error: "invalid request" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- optional auth ------------------------------------------------------
  let userId: string | null = null;
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (token && token !== ANON_KEY) {
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data } = await anon.auth.getUser();
    userId = data.user?.id ?? null;
  }

  const anonKey = userId ? null : (body.anon_key ?? null);
  if (!userId && !anonKey) return json({ error: "anon_key required for signed-out chat" }, 400);

  // --- rate limit ---------------------------------------------------------
  const limited = await enforceRateLimit(admin, {
    identity: clientIdentity(req, userId),
    action: "support_agent",
    limit: userId ? 20 : 10,
    windowSeconds: 60,
  });
  if (limited) return json({ error: "You're sending messages a bit fast. Please wait a moment." }, 429);

  const locale = (body.locale ?? "en").slice(0, 12);
  const question = sanitizeUserText(body.message);
  if (!question) return json({ error: "invalid request" }, 400);

  // --- conversation -------------------------------------------------------
  let conversationId = body.conversation_id ?? null;
  if (conversationId) {
    const { data: conv } = await admin
      .from("support_conversations")
      .select("id, user_id, anon_key")
      .eq("id", conversationId)
      .maybeSingle();
    const owns = conv && (userId ? conv.user_id === userId : conv.anon_key === anonKey);
    if (!owns) conversationId = null; // never leak or write into someone else's thread
  }
  if (!conversationId) {
    const { data: created, error } = await admin
      .from("support_conversations")
      .insert({ user_id: userId, anon_key: anonKey, locale })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[support-agent] conversation insert failed", error?.message);
      return json({ error: "could not start conversation" }, 500);
    }
    conversationId = created.id;
  }

  const { data: historyRows } = await admin
    .from("support_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(12);
  const history = (historyRows ?? []) as { role: string; content: string }[];

  // --- retrieval ----------------------------------------------------------
  const vec = await embedOne(question);
  let chunks: KbChunk[] = [];
  const { data: matches, error: matchErr } = await admin.rpc("match_support_kb", {
    _query_embedding: vec ? toPgVector(vec) : null,
    _query_text: question,
    _locale: locale.slice(0, 2),
    _limit: 8,
  });
  if (matchErr) console.error("[support-agent] retrieval failed", matchErr.message);
  else chunks = ((matches ?? []) as KbChunk[])
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
    .slice(0, 6);

  const allowedSlugs = new Set(chunks.map((c) => c.slug));

  // --- account facts ------------------------------------------------------
  const account = await loadAccountContext(admin, userId, locale);

  // --- generation ---------------------------------------------------------
  const started = Date.now();
  const systemPrompt = buildSystemPrompt({
    account,
    actionCatalogue: actionCatalogue(!!userId),
    locale,
  });
  const userContent = `${buildAccountBlock(account)}\n\n${buildKbBlock(chunks)}\n\n${buildUserBlock(question, history)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  let envelope = null as ReturnType<typeof parseEnvelope>;
  let gatewayStatus = 0;
  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SUPPORT_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });
    gatewayStatus = res.status;
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error(`[support-agent] gateway ${res.status}: ${detail}`);
      // 402/403 are terminal (credits / policy); everything else is transient.
      const message = res.status === 429
        ? "The assistant is busy right now. Please try again in a moment."
        : "The assistant is temporarily unavailable. You can still contact our team from the Contact page.";
      return json({ error: message, status: res.status, conversation_id: conversationId }, res.status === 429 ? 429 : 503);
    }
    const payload = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    envelope = parseEnvelope(payload.choices?.[0]?.message?.content ?? "", allowedSlugs);
  } catch (e) {
    console.error("[support-agent] gateway call failed", (e as Error).message, gatewayStatus);
    return json({
      error: "The assistant took too long to respond. Please try again.",
      conversation_id: conversationId,
    }, 504);
  } finally {
    clearTimeout(timeout);
  }

  const latencyMs = Date.now() - started;

  if (!envelope) {
    return json({
      error: "The assistant could not produce a reliable answer. Our team can help from the Contact page.",
      conversation_id: conversationId,
    }, 502);
  }

  const grounded = envelope.sources.length > 0 && envelope.confidence >= LOW_CONFIDENCE;
  const actions = resolveActions(envelope.action_ids, { signedIn: !!userId });
  const sourceDocs = chunks
    .filter((c) => envelope!.sources.includes(c.slug))
    .map((c) => ({ slug: c.slug, title: c.title, url: c.source_url }))
    .filter((s, i, arr) => arr.findIndex((x) => x.slug === s.slug) === i);

  const shouldEscalate = envelope.escalate || (!grounded && !envelope.clarifying_question);

  // --- persist ------------------------------------------------------------
  await admin.from("support_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: question,
    intent: envelope.topic,
  });

  const { data: assistantRow } = await admin
    .from("support_messages")
    .insert({
      conversation_id: conversationId,
      role: "assistant",
      content: envelope.answer,
      intent: envelope.topic,
      confidence: envelope.confidence,
      grounded,
      sources: sourceDocs,
      actions,
      model: SUPPORT_MODEL,
      latency_ms: latencyMs,
    })
    .select("id")
    .single();

  await admin
    .from("support_conversations")
    .update({
      topic: envelope.topic,
      locale,
      escalated: shouldEscalate,
      status: shouldEscalate ? "escalated" : "open",
      message_count: history.length + 2,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (!grounded) {
    await admin.rpc("record_support_knowledge_gap", {
      _question: question,
      _topic: envelope.topic,
      _locale: locale,
      _confidence: envelope.confidence,
    });
  }

  if (shouldEscalate) {
    await admin.from("support_escalations").insert({
      conversation_id: conversationId,
      user_id: userId,
      anon_key: anonKey,
      reason: envelope.escalation_reason || "assistant could not resolve",
      priority: envelope.topic === "billing" || envelope.topic === "account" ? "high" : "normal",
      summary: question.slice(0, 300),
    });
  }

  return json({
    conversation_id: conversationId,
    message_id: assistantRow?.id ?? null,
    answer: envelope.answer,
    topic: envelope.topic,
    confidence: envelope.confidence,
    grounded,
    sources: sourceDocs,
    actions,
    escalated: shouldEscalate,
    clarifying_question: envelope.clarifying_question || null,
    latency_ms: latencyMs,
  });
});
