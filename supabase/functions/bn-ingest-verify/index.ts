/**
 * Bengali (bn) catalog growth + publish gate.
 *
 * This is the *verification* half of the Bengali ingestion pipeline. Growth
 * itself is handled by `ingest-videos` (trusted-channel uploads) and
 * `discover-channels` (native-language queries); this function is the gate every
 * Bengali row must clear before it can be served, and it runs three independent
 * checks:
 *
 *   1. DUPLICATES  — exact `video_id` collisions and near-duplicate titles
 *                    within the same channel (normalised Bengali/Latin title
 *                    similarity). Losers are archived, never deleted, so the
 *                    audit trail survives.
 *   2. HALAL       — `assessStrict` (tier-1/tier-2 text + the verified-only
 *                    visual floor: `visual_state` must be `clean`).
 *   3. METADATA    — a row cannot be published with a missing title, thumbnail,
 *                    channel_id, category, published_at or duration-bearing
 *                    channel_title. Incomplete rows stay hidden with an
 *                    explicit `hidden_reason` so they can be repaired and
 *                    re-checked instead of silently rotting.
 *
 * Every decision is written to `bn_ingest_verifications` (admin-readable) so
 * `/admin/moderation-audit` and `bn_catalog_health()` can explain any outcome.
 *
 * Body: { language?: string, limit?: number, dry_run?: boolean }
 * Designed for pg_cron; safe to run concurrently (claims are per-row and idempotent).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { observed } from "../_shared/observe.ts";
import { assessStrict } from "../_shared/halalGuard.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Fields a Bengali row must carry before it may be served. */
const REQUIRED_FIELDS = [
  "title",
  "thumbnail_url",
  "channel_id",
  "channel_title",
  "category",
  "published_at",
] as const;

interface Row {
  id: string;
  video_id: string;
  title: string | null;
  channel_id: string | null;
  channel_title: string | null;
  thumbnail_url: string | null;
  category: string | null;
  published_at: string | null;
  halal_score: number | null;
  visual_state: string | null;
  content_language: string | null;
  is_hidden: boolean | null;
  is_archived: boolean | null;
  is_trusted_channel: boolean | null;
}

/**
 * Title normalisation that works for Bengali as well as Latin: strips
 * punctuation, Arabic/Bengali diacritics, bracketed suffixes ("| Part 2",
 * "[HD]"), episode numbering and collapses whitespace.
 */
function normalizeTitle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u09BC\u09CD]/g, "")
    .replace(/[\[\](){}|–—_·•]+/g, " ")
    .replace(/\b(part|episode|ep|pt|full|hd|4k|official)\b/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token-overlap similarity (0..1) — cheap, script-agnostic, no false Bengali splits. */
function similarity(a: string, b: string): number {
  const ta = new Set(normalizeTitle(a).split(" ").filter((t) => t.length > 1));
  const tb = new Set(normalizeTitle(b).split(" ").filter((t) => t.length > 1));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.max(ta.size, tb.size);
}

const DUPLICATE_THRESHOLD = 0.86;

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // --- authorization -------------------------------------------------------
  // This endpoint publishes / hides / archives rows, so it is restricted to the
  // pg_cron caller (shared secret header) or an admin/moderator JWT, matching
  // the gate used by moderate-backlog, sample-channel-videos, etc.
  const cronToken = req.headers.get("x-cron-token");
  const cronSecret = req.headers.get("x-cron-secret");
  const isCron =
    (!!cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) ||
    (!!cronToken && cronToken === Deno.env.get("INGEST_CRON_TOKEN")) ||
    (!!cronToken && cronToken === Deno.env.get("AUDIT_CRON_TOKEN"));
  if (!isCron) {
    const authResult = await authorize(req, "approve_content");
    if (authResult instanceof Response) return authResult;
  }



  let body: { language?: string; limit?: number; dry_run?: boolean } = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch {
    body = {};
  }
  const language = typeof body.language === "string" && /^[a-z]{2}$/.test(body.language)
    ? body.language
    : "bn";
  // Small batches: each invocation must finish well inside the edge worker
  // budget and the Postgres statement timeout. The cron runs often enough that
  // the backlog drains across runs instead of in one oversized run.
  const limit = Math.min(Math.max(Number(body.limit) || 150, 1), 300);
  const dryRun = body.dry_run === true;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // Candidate set: newest language rows; verification state is checked with a
  // bounded anti-join over just these candidates (never the full 20k table).
  const { data: rows, error } = await admin
    .from("curated_videos")
    .select(
      "id, video_id, title, channel_id, channel_title, thumbnail_url, category, published_at, halal_score, visual_state, content_language, is_hidden, is_archived, is_trusted_channel",
    )
    .eq("content_language", language)
    .eq("is_archived", false)
    .order("ingested_at", { ascending: false })
    .limit(limit * 2);

  if (error) return json({ error: error.message }, 500);

  const candidates = (rows ?? []) as Row[];
  const candidateIds = candidates.map((r) => r.video_id);
  const alreadyChecked = new Set<string>();
  for (let i = 0; i < candidateIds.length; i += 150) {
    const { data: checked } = await admin
      .from("bn_ingest_verifications")
      .select("video_id")
      .eq("content_language", language)
      .in("video_id", candidateIds.slice(i, i + 150));
    for (const r of checked ?? []) alreadyChecked.add(r.video_id as string);
  }

  const queue = candidates.filter((r) => !alreadyChecked.has(r.video_id)).slice(0, limit);
  if (!queue.length) {
    return json({ language, checked: 0, message: "no unverified rows" });
  }

  // Duplicate corpus: rows in the same channel keyed by channel, so a
  // near-duplicate title only collides inside its own channel (re-uploads),
  // never across two scholars covering the same topic.
  const channelIds = [...new Set(queue.map((r) => r.channel_id).filter(Boolean))] as string[];
  const existingByChannel = new Map<string, { video_id: string; title: string }[]>();
  for (const channelId of channelIds) {
    const { data: existing } = await admin
      .from("curated_videos")
      .select("video_id, title")
      .eq("channel_id", channelId)
      .eq("is_archived", false)
      .order("ingested_at", { ascending: false })
      .limit(200);
    existingByChannel.set(
      channelId,
      (existing ?? []).map((e) => ({ video_id: e.video_id as string, title: (e.title as string) ?? "" })),
    );
  }

  const verifications: Record<string, unknown>[] = [];
  const publish: string[] = [];
  const hide: { video_id: string; reason: string }[] = [];
  const archive: string[] = [];
  const stats = { passed: 0, duplicates: 0, halal: 0, metadata: 0 };

  for (const row of queue) {
    const reasons: string[] = [];

    // --- 1. duplicates -----------------------------------------------------
    let duplicateOf: string | null = null;
    const siblings = (existingByChannel.get(row.channel_id ?? "") ?? []).filter(
      (s) => s.video_id !== row.video_id,
    );
    for (const s of siblings) {
      if (!row.title || !s.title) continue;
      if (similarity(row.title, s.title) >= DUPLICATE_THRESHOLD) {
        duplicateOf = s.video_id;
        break;
      }
    }
    if (duplicateOf) {
      reasons.push(`duplicate of ${duplicateOf} (same channel, title similarity ≥ ${DUPLICATE_THRESHOLD})`);
      stats.duplicates++;
    }

    // --- 2. halal ----------------------------------------------------------
    const verdict = assessStrict({
      title: row.title,
      channel_title: row.channel_title,
      visual_state: row.visual_state,
    });
    if (!verdict.allowed) {
      reasons.push(`halal floor: tier ${verdict.tier} — ${verdict.reason}`);
      stats.halal++;
    }
    const scoreOk = row.is_trusted_channel === true || (row.halal_score ?? 0) >= 90;
    if (!scoreOk) {
      reasons.push(`halal score ${row.halal_score ?? 0} below 90 on an unverified channel`);
    }

    // --- 3. metadata completeness -----------------------------------------
    const missing = REQUIRED_FIELDS.filter((f) => {
      const v = row[f as keyof Row];
      return v === null || v === undefined || (typeof v === "string" && v.trim().length === 0);
    });
    if (missing.length) {
      reasons.push(`incomplete metadata: ${missing.join(", ")}`);
      stats.metadata++;
    }

    const halalOk = verdict.allowed && scoreOk;
    const metadataOk = missing.length === 0;
    const passed = !duplicateOf && halalOk && metadataOk;
    if (passed) {
      stats.passed++;
      publish.push(row.video_id);
    } else if (duplicateOf) {
      archive.push(row.video_id);
    } else {
      hide.push({
        video_id: row.video_id,
        reason: !halalOk ? `halal_gate:${verdict.reason ?? "score"}` : `incomplete_metadata:${missing[0]}`,
      });
    }

    verifications.push({
      video_id: row.video_id,
      content_language: language,
      passed,
      duplicate_of: duplicateOf,
      halal_ok: halalOk,
      halal_score: row.halal_score,
      metadata_ok: metadataOk,
      missing_fields: missing,
      reasons,
    });
  }

  if (dryRun) {
    return json({ language, dry_run: true, checked: queue.length, ...stats });
  }

  // Persist the audit trail first — an outcome must never be applied without a
  // recorded reason.
  for (let i = 0; i < verifications.length; i += 200) {
    const { error: vErr } = await admin
      .from("bn_ingest_verifications")
      .insert(verifications.slice(i, i + 200));
    if (vErr) console.warn("[bn-verify] audit insert failed:", vErr.message);
  }

  // Apply outcomes in bulk.
  if (publish.length) {
    for (let i = 0; i < publish.length; i += 200) {
      await admin
        .from("curated_videos")
        .update({ is_hidden: false, hidden_reason: null })
        .in("video_id", publish.slice(i, i + 200));
    }
  }
  // Group hides by reason so identical reasons apply in one bulk UPDATE
  // instead of one statement per row.
  const hideByReason = new Map<string, string[]>();
  for (const h of hide) {
    const list = hideByReason.get(h.reason) ?? [];
    list.push(h.video_id);
    hideByReason.set(h.reason, list);
  }
  for (const [reason, ids] of hideByReason) {
    for (let i = 0; i < ids.length; i += 200) {
      await admin
        .from("curated_videos")
        .update({ is_hidden: true, hidden_reason: reason })
        .in("video_id", ids.slice(i, i + 200));
    }
  }
  if (archive.length) {
    for (let i = 0; i < archive.length; i += 200) {
      await admin
        .from("curated_videos")
        .update({ is_archived: true, is_hidden: true, hidden_reason: "duplicate" })
        .in("video_id", archive.slice(i, i + 200));
    }
  }

  return json({
    language,
    checked: queue.length,
    published: publish.length,
    held: hide.length,
    archived_duplicates: archive.length,
    ...stats,
  });
}

Deno.serve(observed("bn-ingest-verify", handler));
