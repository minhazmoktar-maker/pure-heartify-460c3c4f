/**
 * alert-simulate — dry-run preview of the alert fan-out.
 *
 * Answers "if an alert of kind X with severity Y fired right now, who would be
 * notified?" using exactly the same routing rules as `alert-fanout`
 * (`alert_routing_config` + severity ranking + configured transports), but
 * never sends anything: no Slack post, no email, no writes.
 *
 * Recipient addresses are masked (`a***@example.com`) so an admin can confirm
 * routing without the console exposing full contact details.
 *
 * Auth: admin JWT only (this is an interactive admin tool, not a cron worker).
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SEV_RANK: Record<string, number> = {
  info: 0,
  warn: 1,
  warning: 1,
  error: 2,
  critical: 3,
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

/** `alerts@heartify.app` -> `a****@heartify.app` */
function maskEmail(addr: string): string {
  const [user, domain] = addr.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 1)}${"*".repeat(Math.max(user.length - 1, 1))}@${domain}`;
}

/** Slack webhooks are secret URLs — only expose the workspace-safe tail shape. */
function maskWebhook(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}/…/${u.pathname.split("/").filter(Boolean).slice(-1)[0]?.slice(-4) ?? ""}`;
  } catch {
    return "configured";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "server misconfigured" }, 500);

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!jwt) return json({ error: "unauthorized" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes } = await admin.auth.getUser(jwt);
  const uid = userRes?.user?.id;
  if (!uid) return json({ error: "unauthorized" }, 401);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  let body: { kinds?: unknown; severities?: unknown } = {};
  try {
    body = await req.json();
  } catch { /* defaults below */ }

  const kinds = Array.isArray(body.kinds)
    ? body.kinds.filter((k): k is string => typeof k === "string" && k.length <= 120).slice(0, 40)
    : [];
  const severities = Array.isArray(body.severities)
    ? body.severities.filter((s): s is string => typeof s === "string" && s in SEV_RANK).slice(0, 4)
    : ["warning", "error", "critical"];
  if (!kinds.length) return json({ error: "kinds must be a non-empty array" }, 400);

  const { data: routeRows, error } = await admin
    .from("alert_routing_config")
    .select("kind,min_severity,slack,email,enabled");
  if (error) return json({ error: error.message }, 500);
  const routes = (routeRows ?? []) as Route[];
  const active = routes.filter((r) => r.enabled);

  const slackWebhook = Deno.env.get("SLACK_WEBHOOK_URL");
  const emailTo = (Deno.env.get("ALERT_EMAIL_TO") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const emailFrom = Deno.env.get("ALERT_EMAIL_FROM") ?? "alerts@resend.dev";
  const resendConfigured = !!Deno.env.get("RESEND_API_KEY");

  const matrix = kinds.flatMap((kind) =>
    severities.map((severity) => {
      const route = pickRoute(active, kind);
      const sev = SEV_RANK[severity] ?? 1;
      const min = SEV_RANK[(route?.min_severity ?? "warning").toLowerCase()] ?? 1;
      const disabledRow = !route && routes.some((r) => r.kind === kind && !r.enabled);

      if (!route) {
        return {
          kind,
          severity,
          would_notify: false,
          reason: disabledRow ? "routing_row_disabled" : "no_matching_route",
          matched_route: null,
          recipients: [] as Array<Record<string, unknown>>,
        };
      }
      if (sev < min) {
        return {
          kind,
          severity,
          would_notify: false,
          reason: `below_min_severity(${route.min_severity})`,
          matched_route: route.kind ?? "default",
          recipients: [],
        };
      }

      const recipients: Array<Record<string, unknown>> = [];
      if (route.slack) {
        recipients.push({
          channel: "slack",
          target: slackWebhook ? maskWebhook(slackWebhook) : null,
          deliverable: !!slackWebhook,
          blocked_reason: slackWebhook ? null : "SLACK_WEBHOOK_URL not configured",
        });
      }
      if (route.email) {
        recipients.push({
          channel: "email",
          target: emailTo.length ? emailTo.map(maskEmail).join(", ") : null,
          from: maskEmail(emailFrom),
          deliverable: resendConfigured && emailTo.length > 0,
          blocked_reason: !resendConfigured
            ? "RESEND_API_KEY not configured"
            : emailTo.length === 0
            ? "ALERT_EMAIL_TO not configured"
            : null,
        });
      }

      return {
        kind,
        severity,
        would_notify: recipients.some((r) => r.deliverable),
        reason: recipients.length === 0 ? "no_transport_enabled" : "routed",
        matched_route: route.kind ?? "default",
        recipients,
      };
    })
  );

  return json({
    mode: "simulation",
    sent: false,
    simulated_at: new Date().toISOString(),
    transports: {
      slack: !!slackWebhook,
      email: resendConfigured && emailTo.length > 0,
      email_recipient_count: emailTo.length,
    },
    results: matrix,
    would_notify_count: matrix.filter((m) => m.would_notify).length,
  }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
