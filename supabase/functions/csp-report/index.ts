// CSP violation report receiver.
// Accepts both the legacy `application/csp-report` and the modern
// `application/reports+json` payloads. Reports are logged (visible in
// edge-function logs / Sentry) with the release tag so SEO-driven traffic
// errors show up alongside runtime exceptions.
//
// This endpoint is intentionally unauthenticated (browsers cannot attach
// user JWTs to CSP reports) and rate-limited by body size.

// deno-lint-ignore-file no-explicit-any
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 32 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405, headers: corsHeaders });
  }

  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > MAX_BYTES) {
    return new Response("payload too large", { status: 413, headers: corsHeaders });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let payload: any = null;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) {
      return new Response("payload too large", { status: 413, headers: corsHeaders });
    }
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    return new Response("invalid json", { status: 400, headers: corsHeaders });
  }

  const release = Deno.env.get("APP_VERSION") ?? "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const referer = req.headers.get("referer") ?? "";

  // Normalize both report shapes into a flat log line.
  const reports: any[] = Array.isArray(payload)
    ? payload
    : payload?.["csp-report"]
    ? [payload["csp-report"]]
    : payload
    ? [payload]
    : [];

  for (const r of reports) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        kind: "csp_report",
        release,
        ua,
        referer,
        contentType,
        report: r,
        ts: new Date().toISOString(),
      })
    );
  }

  const sentryDsn = Deno.env.get("SENTRY_DSN");
  if (sentryDsn && reports.length) {
    try {
      // Minimal Sentry envelope for CSP reports — best-effort, don't block.
      await fetch(sentryDsn.replace(/^https?:\/\/[^@]+@/, "https://").replace(/\/\d+$/, "/api/security/?sentry_key=" + sentryDsn.split("@")[0].split("//")[1].split(":")[0]), {
        method: "POST",
        headers: { "content-type": "application/csp-report" },
        body: JSON.stringify({ "csp-report": reports[0] }),
      }).catch(() => undefined);
    } catch {
      // ignore
    }
  }

  return new Response(null, { status: 204, headers: corsHeaders });
});
