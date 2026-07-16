// Dispatches production alerts to Resend (email) and Slack (webhook).
// Called fire-and-forget from src/lib/alerts.ts after a row is inserted
// into public.production_alerts.
//
// Env:
//   RESEND_API_KEY           required for email
//   ALERT_EMAIL_TO           required for email
//   ALERT_EMAIL_FROM         optional, defaults to alerts@resend.dev
//   ALERT_EMAIL_MIN_SEVERITY optional, default "error" (info|warn|error|critical)
//   SLACK_WEBHOOK_URL        optional
//   ADMIN_ALERTS_URL         optional, deep link shown in emails
//                            defaults to https://pure-heartify.lovable.app/admin/alerts

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";

interface Payload {
  kind: string;
  severity: string;
  message: string;
  route?: string | null;
  context?: Record<string, unknown>;
  alert_id?: string;
  user_id?: string | null;
  persist?: boolean;
  test?: boolean;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function persistAlert(p: Payload): Promise<{ ok: boolean; status: number; body: string }> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/production_alerts`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      kind: p.kind,
      severity: p.severity,
      message: p.message,
      route: p.route ?? null,
      context: p.context ?? {},
      user_id: p.user_id ?? null,
    }),
  });
  return { ok: r.ok, status: r.status, body: r.ok ? "" : await r.text() };
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_EMAIL_TO = Deno.env.get("ALERT_EMAIL_TO");
const ALERT_EMAIL_FROM = Deno.env.get("ALERT_EMAIL_FROM") ?? "alerts@resend.dev";
const ALERT_EMAIL_MIN_SEVERITY =
  (Deno.env.get("ALERT_EMAIL_MIN_SEVERITY") ?? "error").toLowerCase();
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");
const ADMIN_ALERTS_URL =
  Deno.env.get("ADMIN_ALERTS_URL") ?? "https://pure-heartify.lovable.app/admin/alerts";

const SEV_RANK: Record<string, number> = { info: 0, warn: 1, error: 2, critical: 3 };
const SEV_EMOJI: Record<string, string> = {
  info: "ℹ️", warn: "⚠️", error: "🔴", critical: "🚨",
};
const SEV_COLOR: Record<string, string> = {
  info: "#3b82f6", warn: "#f59e0b", error: "#ef4444", critical: "#b91c1c",
};

const KIND_LABEL: Record<string, string> = {
  permission_denied: "Permission Denied",
  watch_playback_failure: "Watch Playback Failure",
  watch_iframe_error: "Watch Iframe Error",
  network_error: "Network Error",
  unexpected_error: "Unexpected Error",
};

/** fetch with retry + exponential backoff. Logs each attempt. */
async function fetchWithRetry(
  label: string,
  url: string,
  init: RequestInit,
  { attempts = 3, baseDelayMs = 500, timeoutMs = 10_000 } = {},
): Promise<{ ok: boolean; status: number; body: string; attempts: number; error?: string }> {
  let lastErr: string | undefined;
  for (let i = 1; i <= attempts; i++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const started = Date.now();
    try {
      const r = await fetch(url, { ...init, signal: ctl.signal });
      const body = await r.text();
      clearTimeout(t);
      const dur = Date.now() - started;
      if (r.ok) {
        console.log(`[dispatch-alert] ${label} attempt ${i}/${attempts} ok (${r.status}) in ${dur}ms`);
        return { ok: true, status: r.status, body, attempts: i };
      }
      lastErr = `HTTP ${r.status}: ${body.slice(0, 300)}`;
      console.warn(`[dispatch-alert] ${label} attempt ${i}/${attempts} failed ${lastErr} in ${dur}ms`);
      // Do not retry non-retriable client errors
      if (r.status >= 400 && r.status < 500 && r.status !== 408 && r.status !== 429) {
        return { ok: false, status: r.status, body, attempts: i, error: lastErr };
      }
    } catch (e) {
      clearTimeout(t);
      const dur = Date.now() - started;
      lastErr = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      console.warn(`[dispatch-alert] ${label} attempt ${i}/${attempts} threw ${lastErr} in ${dur}ms`);
    }
    if (i < attempts) {
      const delay = baseDelayMs * 2 ** (i - 1);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  console.error(`[dispatch-alert] ${label} exhausted ${attempts} attempts: ${lastErr}`);
  return { ok: false, status: 0, body: "", attempts, error: lastErr };
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmailHtml(p: Payload, title: string, timestamp: string): string {
  const color = SEV_COLOR[p.severity] ?? "#111827";
  const kindLabel = KIND_LABEL[p.kind] ?? p.kind;
  const ctxBlock = p.context && Object.keys(p.context).length
    ? `<h3 style="margin:24px 0 8px;font-size:14px;color:#374151">Context</h3>
       <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;line-height:1.5;overflow:auto;white-space:pre-wrap;word-break:break-word">${
      escapeHtml(JSON.stringify(p.context, null, 2).slice(0, 4000))
    }</pre>`
    : "";
  const routeBlock = p.route
    ? `<tr><td style="padding:6px 0;color:#6b7280;width:110px">Route</td><td style="padding:6px 0;color:#111827;font-family:monospace;font-size:13px">${
      escapeHtml(p.route)
    }</td></tr>`
    : "";
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06)">
    <tr><td style="background:${color};padding:16px 24px;color:#ffffff">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;opacity:.85">${escapeHtml(p.severity)} alert</div>
      <div style="font-size:20px;font-weight:600;margin-top:4px">${escapeHtml(title)}</div>
    </td></tr>
    <tr><td style="padding:24px">
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6">${escapeHtml(p.message)}</p>
      <table role="presentation" style="width:100%;font-size:13px;border-top:1px solid #e5e7eb;margin-top:8px">
        <tr><td style="padding:6px 0;color:#6b7280;width:110px">Type</td><td style="padding:6px 0;color:#111827">${escapeHtml(kindLabel)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Status</td><td style="padding:6px 0;color:${color};font-weight:600">${escapeHtml(p.severity.toUpperCase())}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Time</td><td style="padding:6px 0;color:#111827">${escapeHtml(timestamp)}</td></tr>
        ${routeBlock}
      </table>
      ${ctxBlock}
      <div style="margin-top:28px;text-align:center">
        <a href="${escapeHtml(ADMIN_ALERTS_URL)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600;font-size:14px">
          Open Admin Alerts →
        </a>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;text-align:center">
        You receive this email because it matches the severity threshold
        (<code>${escapeHtml(ALERT_EMAIL_MIN_SEVERITY)}</code>+). Change with the <code>ALERT_EMAIL_MIN_SEVERITY</code> secret.
      </p>
    </td></tr>
  </table>
</body></html>`;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // 60 alerts/min per identity. Client fire-and-forgets on frontend errors —
  // a bug loop or malicious page could spam Slack/email/DB otherwise.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const limited = await enforceRateLimit(admin, {
    identity: getClientIdentity(req, null),
    action: "dispatch-alert", limit: 60, windowSeconds: 60,
  });
  if (limited) return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });


  let p: Payload;
  try {
    p = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!p?.kind || !p?.message) {
    return new Response(JSON.stringify({ error: "kind and message required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Restrict kind to a known allow-list so anonymous callers can't inject
  // arbitrary text into admin email/Slack fan-out.
  const ALLOWED_KINDS = new Set(Object.keys(KIND_LABEL));
  if (!ALLOWED_KINDS.has(p.kind)) {
    return new Response(JSON.stringify({ error: "unknown kind" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // Cap free-text fields to reasonable lengths.
  p.message = String(p.message).slice(0, 500);
  if (p.route) p.route = String(p.route).slice(0, 200);
  p.severity = (p.severity ?? "warn").toLowerCase();

  const emoji = SEV_EMOJI[p.severity] ?? "•";
  const kindLabel = KIND_LABEL[p.kind] ?? p.kind;
  const title = `${emoji} [${p.severity.toUpperCase()}] ${kindLabel}`;
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const results: Record<string, unknown> = {};

  // Persist to production_alerts when requested (service-role only)
  if (p.persist) {
    try {
      const r = await persistAlert(p);
      results.persist = r.ok ? "ok" : `failed ${r.status}: ${r.body.slice(0, 200)}`;
    } catch (e) {
      results.persist = `error: ${(e as Error).message}`;
    }
  }


  // ── Slack ────────────────────────────────────────────────
  if (SLACK_WEBHOOK_URL) {
    const routeLine = p.route ? `\nRoute: ${p.route}` : "";
    const ctxLine = p.context && Object.keys(p.context).length
      ? `\n\`\`\`${JSON.stringify(p.context, null, 2).slice(0, 1500)}\`\`\``
      : "";
    const text = `${title}\n${p.message}${routeLine}${ctxLine}\n<${ADMIN_ALERTS_URL}|Open admin alerts>`;
    results.slack = await fetchWithRetry("slack", SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } else results.slack = "skipped";

  // ── Email (Resend) with severity filter ─────────────────
  const minRank = SEV_RANK[ALERT_EMAIL_MIN_SEVERITY] ?? SEV_RANK.error;
  const thisRank = SEV_RANK[p.severity] ?? 0;
  if (!RESEND_API_KEY || !ALERT_EMAIL_TO) {
    results.email = "skipped_missing_config";
  } else if (thisRank < minRank && !p.test) {
    console.log(
      `[dispatch-alert] email skipped: severity ${p.severity} < ${ALERT_EMAIL_MIN_SEVERITY}`,
    );
    results.email = { skipped: true, reason: "below_min_severity", min: ALERT_EMAIL_MIN_SEVERITY };
  } else {
    const subject = `${title}${p.test ? " (test)" : ""}`.slice(0, 120);
    const html = renderEmailHtml(p, `${kindLabel}${p.test ? " · test" : ""}`, timestamp);
    results.email = await fetchWithRetry("resend", "https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: ALERT_EMAIL_FROM,
        to: [ALERT_EMAIL_TO],
        subject,
        html,
      }),
    });
  }

  const anyFailed = Object.values(results).some(
    (r) => typeof r === "object" && r !== null && (r as { ok?: boolean }).ok === false,
  );
  if (anyFailed) console.error("[dispatch-alert] one or more channels failed", results);

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
