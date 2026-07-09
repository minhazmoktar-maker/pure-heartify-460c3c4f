// Dispatches production alerts to Resend (email) and Slack (webhook).
// Called fire-and-forget from src/lib/alerts.ts after a row is inserted
// into public.production_alerts. Reads:
//   RESEND_API_KEY, ALERT_EMAIL_TO, ALERT_EMAIL_FROM (optional), SLACK_WEBHOOK_URL
// All are optional individually — missing ones are simply skipped.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Payload {
  kind: string;
  severity: string;
  message: string;
  route?: string | null;
  context?: Record<string, unknown>;
  alert_id?: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_EMAIL_TO = Deno.env.get("ALERT_EMAIL_TO");
const ALERT_EMAIL_FROM = Deno.env.get("ALERT_EMAIL_FROM") ?? "alerts@resend.dev";
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL");

const SEV_EMOJI: Record<string, string> = {
  info: "ℹ️", warn: "⚠️", error: "🔴", critical: "🚨",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

  const emoji = SEV_EMOJI[p.severity] ?? "•";
  const title = `${emoji} [${p.severity?.toUpperCase() ?? "ALERT"}] ${p.kind}`;
  const route = p.route ? `\nRoute: ${p.route}` : "";
  const ctx = p.context && Object.keys(p.context).length
    ? `\n\nContext:\n\`\`\`${JSON.stringify(p.context, null, 2).slice(0, 1500)}\`\`\``
    : "";
  const plain = `${title}\n${p.message}${route}${ctx}`;

  const results: Record<string, unknown> = {};

  // Slack
  if (SLACK_WEBHOOK_URL) {
    try {
      const r = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plain }),
      });
      results.slack = { status: r.status, ok: r.ok };
      await r.text();
    } catch (e) {
      results.slack = { error: String(e) };
    }
  } else results.slack = "skipped";

  // Resend email
  if (RESEND_API_KEY && ALERT_EMAIL_TO) {
    try {
      const html = `<h2>${title}</h2><p>${p.message}</p>${
        p.route ? `<p><strong>Route:</strong> ${p.route}</p>` : ""
      }${
        p.context ? `<pre style="background:#f4f4f5;padding:8px;border-radius:4px;overflow:auto">${
          JSON.stringify(p.context, null, 2).replace(/</g, "&lt;")
        }</pre>` : ""
      }`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: ALERT_EMAIL_FROM,
          to: [ALERT_EMAIL_TO],
          subject: title.slice(0, 120),
          html,
        }),
      });
      const body = await r.text();
      results.email = { status: r.status, ok: r.ok, body: r.ok ? undefined : body.slice(0, 300) };
    } catch (e) {
      results.email = { error: String(e) };
    }
  } else results.email = "skipped";

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
