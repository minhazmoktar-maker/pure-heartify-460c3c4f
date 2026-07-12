// Generic push fan-out. Sends a title/body to every device_token for a user_id.
// Requires FCM_SERVER_KEY for actual delivery; without it, records intent only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tokens, error } = await supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", user_id);
    if (error) throw error;

    const results: unknown[] = [];
    if (FCM_SERVER_KEY && tokens?.length) {
      for (const t of tokens) {
        const res = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify({
            to: t.token,
            notification: { title, body: body ?? "" },
            data: data ?? {},
          }),
        });
        results.push({ token: t.token.slice(0, 8), status: res.status });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        recipients: tokens?.length ?? 0,
        delivered: !!FCM_SERVER_KEY,
        results,
      }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
