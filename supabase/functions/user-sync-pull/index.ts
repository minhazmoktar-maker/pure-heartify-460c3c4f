// Delta sync — returns rows updated after `since` across cross-device tables.
// Designed for watch/widget refresh: caller passes a cursor, gets small payload back.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData } = await client.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: corsHeaders });

  const since = new URL(req.url).searchParams.get("since") ?? "1970-01-01T00:00:00Z";
  const limit = 200;

  const [dhikr, salah, reading, favorites, prefs, streaks] = await Promise.all([
    client.from("dhikr_sessions").select("*").eq("user_id", userId).gt("updated_at", since).order("updated_at").limit(limit),
    client.from("salah_log").select("*").eq("user_id", userId).gt("updated_at", since).order("updated_at").limit(limit),
    client.from("reading_progress").select("*").eq("user_id", userId).gt("updated_at", since).order("updated_at").limit(limit),
    client.from("favorites").select("*").eq("user_id", userId).gt("created_at", since).order("created_at").limit(limit),
    client.from("user_preferences_v2").select("*").eq("user_id", userId).gt("updated_at", since).order("updated_at").limit(limit),
    client.from("streaks").select("*").eq("user_id", userId).limit(1),
  ]);

  const body = {
    server_time: new Date().toISOString(),
    since,
    dhikr_sessions: dhikr.data ?? [],
    salah_log: salah.data ?? [],
    reading_progress: reading.data ?? [],
    favorites: favorites.data ?? [],
    preferences: prefs.data ?? [],
    streaks: streaks.data ?? [],
  };
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });
});
