import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/**
 * Nightly retention purge.
 *
 * Trigger via a cron scheduler (Supabase Scheduled Functions or GitHub Action)
 * with header `x-cron-token: <AUDIT_CRON_TOKEN>`. Uses the service role to
 * invoke enforce_retention_policies() which respects the tunable TTLs stored
 * in public.retention_policies.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-cron-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const token = req.headers.get("x-cron-token");
  const expected = Deno.env.get("AUDIT_CRON_TOKEN");
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  const { data, error } = await supabase.rpc("enforce_retention_policies");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ ok: true, purged: data }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
