// image-proxy — signed-URL image CDN indirection.
//
// Fronts approved upstream hosts (YouTube thumbnails, Supabase Storage,
// SearchTruth Mushaf pages) behind a short-lived HMAC-signed URL. This
// gives us a single choke point for:
//   * Cache-Control tuning per surface (immutable for Mushaf pages, 1h
//     for YouTube thumbnails, per-object for Supabase Storage).
//   * SSRF protection: only hosts in ALLOWED_HOSTS are ever fetched.
//   * Format negotiation later (webp/avif) without redeploying the app.
//
// Signature: HMAC-SHA256(secret, `${url}|${expires}`) → hex, first 32 chars.
// Client: GET /functions/v1/image-proxy?u=<encoded>&e=<epoch>&s=<sig>
//
// The signing key lives in IMAGE_PROXY_SIGNING_KEY (edge-function secret).
// Frontend helper: src/lib/imageProxy.ts.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("image-proxy");

const ALLOWED_HOSTS = new Set([
  "i.ytimg.com",
  "yt3.ggpht.com",
  "storage.googleapis.com",
  "www.searchtruth.com",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const secret = Deno.env.get("IMAGE_PROXY_SIGNING_KEY");
  if (!secret) {
    log.error("missing signing key");
    return new Response("misconfigured", { status: 500, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const target = url.searchParams.get("u");
  const expires = url.searchParams.get("e");
  const sig = url.searchParams.get("s");
  if (!target || !expires || !sig) return new Response("bad request", { status: 400, headers: corsHeaders });

  const exp = Number(expires);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) {
    return new Response("expired", { status: 410, headers: corsHeaders });
  }

  const expected = await hmacHex(secret, `${target}|${expires}`);
  if (!timingSafeEqual(expected, sig)) {
    return new Response("invalid signature", { status: 403, headers: corsHeaders });
  }

  let parsed: URL;
  try { parsed = new URL(target); } catch { return new Response("bad url", { status: 400, headers: corsHeaders }); }
  if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
    log.warn("blocked host", { host: parsed.hostname });
    return new Response("host not allowed", { status: 403, headers: corsHeaders });
  }

  try {
    const upstream = await fetch(parsed.toString(), { redirect: "follow" });
    if (!upstream.ok || !upstream.body) {
      return new Response("upstream error", { status: 502, headers: corsHeaders });
    }
    const headers = new Headers(corsHeaders);
    headers.set("Content-Type", upstream.headers.get("content-type") ?? "image/jpeg");
    // Cache tuned per surface via query hint (?ttl=), default 1h.
    const ttl = Number(url.searchParams.get("ttl") ?? "3600");
    headers.set("Cache-Control", `public, max-age=${Math.max(60, Math.min(ttl, 31536000))}, immutable`);
    return new Response(upstream.body, { headers, status: 200 });
  } catch (err) {
    log.error("fetch failed", { err: err instanceof Error ? err.message : String(err) });
    return new Response("upstream fetch failed", { status: 502, headers: corsHeaders });
  }
});
