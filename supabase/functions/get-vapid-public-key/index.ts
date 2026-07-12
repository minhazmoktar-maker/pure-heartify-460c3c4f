// Public endpoint: returns the VAPID public key so browser clients can
// subscribe to Web Push. Returns 404 when unset so the client gracefully
// degrades to "push unavailable" without throwing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  if (!publicKey) {
    return new Response(JSON.stringify({ error: "vapid_not_configured" }), {
      status: 404,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ publicKey }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      "cache-control": "public, max-age=3600",
    },
  });
});
