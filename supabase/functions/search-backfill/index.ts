// Backfills curated_videos.search_tsv in small batches.
// Invoke repeatedly (or from cron) until { remaining: 0 } is returned.
// Admin-only.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return new Response("unauthorized", { status: 401, headers: corsHeaders });

  const { data: userRes } = await admin.auth.getUser(jwt);
  const uid = userRes?.user?.id;
  if (!uid) return new Response("unauthorized", { status: 401, headers: corsHeaders });

  const { data: isAdmin } = await admin.rpc("has_min_role", { _user_id: uid, _min_tier: "admin" });
  if (!isAdmin) return new Response("forbidden", { status: 403, headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(Math.max(Number(body.batch_size ?? 500), 50), 2000);
  const maxBatches = Math.min(Math.max(Number(body.max_batches ?? 10), 1), 100);

  let updated = 0;
  for (let i = 0; i < maxBatches; i++) {
    const { data: slice, error: selErr } = await admin
      .from("curated_videos")
      .select("id,title,channel_title,category")
      .is("search_tsv", null)
      .limit(batchSize);
    if (selErr) return new Response(JSON.stringify({ error: selErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!slice || slice.length === 0) break;

    // "Touch" each row so the BEFORE UPDATE trigger recomputes the tsv column.
    // Update by primary key one row at a time via bulk RPC isn't available, so do a
    // narrow batched update using the .in() filter, setting each field to itself.
    const ids = slice.map((r) => r.id);
    const { error: upErr } = await admin
      .from("curated_videos")
      .update({ title: null as unknown as string }) // placeholder overwritten below
      .in("id", []); // no-op guard
    void upErr;

    // Per-row update to make sure the trigger fires cleanly.
    for (const row of slice) {
      await admin
        .from("curated_videos")
        .update({ title: row.title })
        .eq("id", row.id);
    }
    updated += slice.length;
    void ids;
  }

  const { count } = await admin
    .from("curated_videos")
    .select("id", { count: "exact", head: true })
    .is("search_tsv", null);

  return new Response(JSON.stringify({ updated, remaining: count ?? null }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
