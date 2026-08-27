/**
 * geo-country — resolves the caller's country from edge request headers.
 *
 * A signed-out visitor has no stored preferences, so the only way their very
 * first feed can feel local is to know roughly where they are. The browser's
 * timezone is a decent guess but wrong for travellers and unmapped zones, so
 * this function reads the country the CDN already attached to the request and
 * returns just the ISO code.
 *
 * Privacy: nothing is stored and no IP address is logged or returned — only a
 * two-letter country code derived from headers the request already carried.
 * Public on purpose (no JWT): it must answer before sign-in.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/** Headers CDNs/proxies use for the resolved country, best first. */
const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country",
  "fly-client-country",
  "x-appengine-country",
];

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (new URL(req.url).searchParams.get("debug") === "headers") {
    return new Response(JSON.stringify({ names: [...req.headers.keys()] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  let country: string | null = null;
  let source: string | null = null;
  for (const h of COUNTRY_HEADERS) {
    const raw = req.headers.get(h)?.trim().toUpperCase();
    // "XX"/"T1" are CDN placeholders for unknown / Tor exit nodes.
    if (raw && /^[A-Z]{2}$/.test(raw) && raw !== "XX" && raw !== "T1") {
      country = raw;
      source = h;
      break;
    }
  }

  return new Response(JSON.stringify({ country, source }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      // Per-visitor answer; let the browser reuse it briefly, never a shared cache.
      "Cache-Control": "private, max-age=900",
    },
  });
});
