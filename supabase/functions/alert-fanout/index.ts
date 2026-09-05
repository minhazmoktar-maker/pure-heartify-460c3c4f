/**
 * alert-fanout — server-side notification fan-out for DB-raised alerts.
 *
 * `production_alerts` rows inserted by pg_cron checks (dedup lag, canonical lag,
 * feed-quality dips, serve-throughput watchdog, worker SLA) never pass through
 * the client, so `dispatch-alert` never sees them. This cron worker picks up
 * un-notified rows, routes each by severity using `alert_routing_config`, and
 * sends Slack and/or email. Delivery outcome is written back onto the alert
 * (`notified_at`, `notify_result`) so the admin UI can show it.
 *
 * Auth: x-cron-token (INGEST_CRON_TOKEN) or x-cron-secret (CRON_SECRET).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SEV_RANK: Record<string, number> = {
  info: 0, warn: 1, warning: 1, error: 2, critical: 3,
};
const SEV_COLOR: Record<string, string> = {
  info: "#3b82f6", warn: "#f59e0b", warning: "#f59e0b", error: "#ef4444", critical: "#b91c1c",
};
const ADMIN_BASE = Deno.env.get("ADMIN_ALERTS_URL")?.replace(/\/admin\/alerts$/, "") ??
  "https://www.heartifyapp.com";

type Alert = {
  id: string;
  kind: string;
  severity: string;
  message: string;
  route: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
};

type Route = {
  kind: string | null;
  min_severity: string;
  slack: boolean;
  email: boolean;
  enabled: boolean;
};

function pickRoute(routes: Route[], kind: string): Route | null {
  return routes.find((r) => r.kind === kind) ?? routes.find((r) => r.kind === null) ?? null;
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendSlack(webhook: string, a: Alert) {
  const link = a.route ? `${ADMIN_BASE}${a.route}` : `${ADMIN_BASE}/admin/alerts`;
  const remediation = (a.context as { remediation?: unknown } | null)?.remediation;
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `[${a.severity.toUpperCase()}] ${a.kind}: ${a.message}`,
      attachments: [{
        color: SEV_COLOR[a.severity.toLowerCase()] ?? "#6b7280",
        fields: [
          { title: "Alert", value: a.kind, short: true },
          { title: "Severity", value: a.severity, short: true },
          ...(remediation
            ? [{
              title: "Auto-remediation",
              value: `\`\`\`${JSON.stringify(remediation).slice(0, 900)}\`\`\``,
              short: false,
            }]
            : []),
          { title: "Dashboard", value: link, short: false },
        ],
        footer: `Heartify · ${new Date(a.created_at).toISOString()}`,
      }],
    }),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? "" : (await res.text()).slice(0, 300) };
}

async function sendEmail(key: string, to: string[], a: Alert) {
  const color = SEV_COLOR[a.severity.toLowerCase()] ?? "#111827";
  const link = a.route ? `${ADMIN_BASE}${a.route}` : `${ADMIN_BASE}/admin/alerts`;
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827">
<table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:${color};padding:16px 24px;color:#fff">
<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">${esc(a.severity)} alert</div>
<div style="font-size:20px;font-weight:600;margin-top:4px">${esc(a.kind)}</div></td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">${esc(a.message)}</p>
<pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;white-space:pre-wrap;word-break:break-word">${
    esc(JSON.stringify(a.context ?? {}, null, 2).slice(0, 4000))
  }</pre>
<div style="margin-top:24px;text-align:center">
<a href="${esc(link)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">Open dashboard →</a>
</div></td></tr></table></body></html>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("ALERT_EMAIL_FROM") ?? "alerts@resend.dev",
      to,
      subject: `[${a.severity.toUpperCase()}] ${a.kind}`,
      html,
    }),
  });
  return { ok: res.ok, status: res.status, body: res.ok ? "" : (await res.text()).slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server misconfigured" }, 500);

  const cronSecret = req.headers.get("x-cron-secret");
  const cronToken = req.headers.get("x-cron-token");
  const authorized = (!!cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) ||
    (!!cronToken && cronToken === Deno.env.get("INGEST_CRON_TOKEN"));
  if (!authorized) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const emailTo = (Deno.env.get("ALERT_EMAIL_TO") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  const { data: routeRows } = await admin
    .from("alert_routing_config")
    .select("kind,min_severity,slack,email,enabled");
  const routes = ((routeRows ?? []) as Route[]).filter((r) => r.enabled);

  const { data: alertRows, error } = await admin
    .from("production_alerts")
    .select("id,kind,severity,message,route,context,created_at")
    .is("notified_at", null)
    .gte("created_at", new Date(Date.now() - 24 * 3600_000).toISOString())
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) return json({ error: error.message }, 500);

  const alerts = (alertRows ?? []) as Alert[];
  const results: Array<Record<string, unknown>> = [];

  for (const a of alerts) {
    const route = pickRoute(routes, a.kind);
    const sev = SEV_RANK[a.severity.toLowerCase()] ?? 1;
    const min = SEV_RANK[(route?.min_severity ?? "warning").toLowerCase()] ?? 1;
    const outcome: Record<string, unknown> = {
      routed_by: route ? (route.kind ?? "default") : "none",
      severity_rank: sev,
      min_severity: route?.min_severity ?? null,
    };

    if (!route || sev < min) {
      outcome.skipped = "below_threshold";
    } else {
      if (route.slack) {
        outcome.slack = slackWebhook
          ? await sendSlack(slackWebhook, a)
          : { ok: false, skipped: "SLACK_WEBHOOK_URL missing" };
      }
      if (route.email) {
        outcome.email = resendKey && emailTo.length
          ? await sendEmail(resendKey, emailTo, a)
          : { ok: false, skipped: "RESEND_API_KEY or ALERT_EMAIL_TO missing" };
      }
    }

    await admin.from("production_alerts")
      .update({ notified_at: new Date().toISOString(), notify_result: outcome })
      .eq("id", a.id);
    results.push({ id: a.id, kind: a.kind, ...outcome });
  }

  return json({ processed: alerts.length, results }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
