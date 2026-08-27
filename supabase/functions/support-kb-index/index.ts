/**
 * support-kb-index — chunks and embeds published support KB documents so the
 * help assistant can retrieve them semantically.
 *
 * Idempotent: a document is re-chunked only when its content hash changed
 * (tracked implicitly by version) or when chunks/embeddings are missing.
 *
 * Auth: admin/owner JWT, or the automation cron secret.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { embedTexts, toPgVector } from "../_shared/embed.ts";

const EMBED_MODEL = "openai/text-embedding-3-small";
const MAX_CHARS = 1400;
const OVERLAP = 180;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Paragraph-aware chunking with a small overlap so answers keep context. */
export function chunkDocument(title: string, body: string): string[] {
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if (current.length + p.length + 2 <= MAX_CHARS) {
      current = current ? `${current}\n\n${p}` : p;
      continue;
    }
    if (current) chunks.push(current);
    if (p.length <= MAX_CHARS) {
      current = current.length > OVERLAP ? `${current.slice(-OVERLAP)}\n\n${p}` : p;
      if (current.length > MAX_CHARS) current = p;
    } else {
      for (let i = 0; i < p.length; i += MAX_CHARS - OVERLAP) {
        chunks.push(p.slice(i, i + MAX_CHARS));
      }
      current = "";
    }
  }
  if (current) chunks.push(current);
  // Prefix every chunk with the title so isolated chunks stay self-describing.
  return chunks.map((c) => `${title}\n\n${c}`.slice(0, MAX_CHARS + title.length + 2));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const CRON_SECRET = Deno.env.get("CRON_SECRET");
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return json({ error: "server misconfigured" }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- authz --------------------------------------------------------------
  const cronHeader = req.headers.get("X-Cron-Secret");
  const viaCron = !!CRON_SECRET && cronHeader === CRON_SECRET;
  if (!viaCron) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: userRes } = await admin.auth.getUser(token);
    const uid = userRes.user?.id;
    if (!uid) return json({ error: "unauthorized" }, 401);
    const { data: allowed } = await admin.rpc("has_min_role", { _user_id: uid, _min: "admin" });
    if (!allowed) return json({ error: "forbidden" }, 403);
  }

  const { force = false, slug = null } = await req.json().catch(() => ({}));

  let query = admin
    .from("support_kb_documents")
    .select("id, slug, title, body, status")
    .eq("status", "published");
  if (slug) query = query.eq("slug", slug);
  const { data: docs, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const results: Array<{ slug: string; chunks: number; embedded: boolean; skipped?: boolean }> = [];

  for (const doc of docs ?? []) {
    if (!force) {
      const { count } = await admin
        .from("support_kb_chunks")
        .select("id", { count: "exact", head: true })
        .eq("document_id", doc.id)
        .not("embedding", "is", null);
      if ((count ?? 0) > 0) {
        results.push({ slug: doc.slug, chunks: count ?? 0, embedded: true, skipped: true });
        continue;
      }
    }

    const pieces = chunkDocument(doc.title, doc.body);
    if (!pieces.length) continue;

    const vectors = await embedTexts(pieces);
    await admin.from("support_kb_chunks").delete().eq("document_id", doc.id);

    const rows = pieces.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      token_estimate: Math.ceil(content.length / 4),
      embedding: vectors?.[i] ? toPgVector(vectors[i]) : null,
      embedding_model: vectors?.[i] ? EMBED_MODEL : null,
    }));

    const { error: insertErr } = await admin.from("support_kb_chunks").insert(rows);
    if (insertErr) {
      console.error(`[support-kb-index] insert failed for ${doc.slug}: ${insertErr.message}`);
      results.push({ slug: doc.slug, chunks: 0, embedded: false });
      continue;
    }
    results.push({ slug: doc.slug, chunks: rows.length, embedded: !!vectors });
  }

  return json({ ok: true, documents: results.length, results });
});
