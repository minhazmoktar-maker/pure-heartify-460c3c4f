// Upsert deltas from watch/widget/mobile. Small, idempotent, per-user only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const DhikrSchema = z.object({
  dhikr_key: z.string().min(1).max(120),
  count: z.number().int().min(0).max(1_000_000),
  target: z.number().int().positive().nullable().optional(),
  source: z.string().max(60).optional(),
  completed_at: z.string().datetime().nullable().optional(),
});

const SalahSchema = z.object({
  prayer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prayer: z.enum(["fajr","dhuhr","asr","maghrib","isha"]),
  prayed_at: z.string().datetime().nullable().optional(),
  on_time: z.boolean().nullable().optional(),
  source: z.string().max(60).optional(),
});

const ReadingSchema = z.object({
  resource_type: z.string().min(1).max(60),
  resource_id: z.string().min(1).max(200),
  position: z.record(z.string(), z.any()).default({}),
  percent: z.number().min(0).max(100).nullable().optional(),
});

const PrefSchema = z.object({
  key: z.string().min(1).max(120),
  value: z.any(),
});

const DeviceSchema = z.object({
  platform: z.enum(["web","ios","android","watchos","wearos","tvos","androidtv","carplay","androidauto","other"]),
  device_id: z.string().min(1).max(200),
  app_version: z.string().max(40).optional(),
  os_version: z.string().max(40).optional(),
  capabilities: z.record(z.string(), z.any()).default({}),
});

const BodySchema = z.object({
  dhikr_sessions: z.array(DhikrSchema).max(100).optional(),
  salah_log: z.array(SalahSchema).max(100).optional(),
  reading_progress: z.array(ReadingSchema).max(100).optional(),
  preferences: z.array(PrefSchema).max(50).optional(),
  device: DeviceSchema.optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: corsHeaders });

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stamp = (rows: any[]) => rows.map((r) => ({ ...r, user_id: userId, updated_at: new Date().toISOString() }));
  const results: Record<string, unknown> = {};

  if (parsed.data.dhikr_sessions?.length) {
    const r = await client.from("dhikr_sessions").upsert(stamp(parsed.data.dhikr_sessions), { onConflict: "user_id,dhikr_key" as any });
    results.dhikr_sessions = r.error?.message ?? "ok";
  }
  if (parsed.data.salah_log?.length) {
    const r = await client.from("salah_log").upsert(stamp(parsed.data.salah_log), { onConflict: "user_id,prayer_date,prayer" });
    results.salah_log = r.error?.message ?? "ok";
  }
  if (parsed.data.reading_progress?.length) {
    const r = await client.from("reading_progress").upsert(stamp(parsed.data.reading_progress), { onConflict: "user_id,resource_type,resource_id" });
    results.reading_progress = r.error?.message ?? "ok";
  }
  if (parsed.data.preferences?.length) {
    const r = await client.from("user_preferences_v2").upsert(stamp(parsed.data.preferences), { onConflict: "user_id,key" });
    results.preferences = r.error?.message ?? "ok";
  }
  if (parsed.data.device) {
    const r = await client.from("device_registrations").upsert(
      [{ ...parsed.data.device, user_id: userId, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
      { onConflict: "user_id,platform,device_id" },
    );
    results.device = r.error?.message ?? "ok";
  }

  return new Response(JSON.stringify({ ok: true, results, server_time: new Date().toISOString() }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
