/**
 * gsc — Google Search Console management for the app.
 * Owner-only. Calls Google via the Lovable connector gateway.
 *
 * Actions (POST { action, ...params }):
 *   - status: connector reachability + list of sites in user's GSC account
 *   - verify_meta: request a META verification token for a site
 *   - verify_site: tell Google to verify (assumes meta tag deployed)
 *   - add_site: PUT site into user's GSC properties
 *   - list_sitemaps(siteUrl): existing sitemaps for a property
 *   - submit_sitemap(siteUrl, feedpath): submit sitemap URL
 *   - performance(siteUrl, days?): search analytics totals for last N days
 *   - inspect_url(siteUrl, inspectionUrl): URL inspection result
 */

import { authorize, CORS_HEADERS } from "../_shared/authz.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY")!;
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function gsc(path: string, init: RequestInit = {}) {
  if (!LOVABLE_API_KEY || !GSC_KEY) {
    throw new Error("GSC connector not configured");
  }
  const r = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GSC_KEY,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  const data = text ? safeJson(text) : null;
  return { status: r.status, ok: r.ok, data, raw: text };
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

function enc(u: string) { return encodeURIComponent(u); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const auth = await authorize(req, "manage_platform_settings");
  if (auth instanceof Response) return auth;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const action = String(body.action || "");

  try {
    switch (action) {
      case "status": {
        const configured = !!(LOVABLE_API_KEY && GSC_KEY);
        if (!configured) return json({ configured: false, sites: [] });
        const r = await gsc(`/webmasters/v3/sites`);
        return json({
          configured: true,
          reachable: r.ok,
          status: r.status,
          sites: (r.data as { siteEntry?: unknown[] })?.siteEntry ?? [],
          error: r.ok ? null : r.data,
          checkedAt: new Date().toISOString(),
        });
      }
      case "verify_meta": {
        const site = String(body.site);
        const r = await gsc(`/siteVerification/v1/token`, {
          method: "POST",
          body: JSON.stringify({
            site: { identifier: site, type: "SITE" },
            verificationMethod: "META",
          }),
        });
        return json({ status: r.status, ok: r.ok, ...(r.data as object) });
      }
      case "verify_site": {
        const site = String(body.site);
        const r = await gsc(`/siteVerification/v1/webResource?verificationMethod=META`, {
          method: "POST",
          body: JSON.stringify({ site: { identifier: site, type: "SITE" } }),
        });
        return json({ status: r.status, ok: r.ok, data: r.data });
      }
      case "add_site": {
        const site = String(body.site);
        const r = await gsc(`/webmasters/v3/sites/${enc(site)}`, { method: "PUT" });
        return json({ status: r.status, ok: r.ok, data: r.data });
      }
      case "list_sitemaps": {
        const site = String(body.siteUrl);
        const r = await gsc(`/webmasters/v3/sites/${enc(site)}/sitemaps`);
        return json({ status: r.status, ok: r.ok, sitemap: (r.data as { sitemap?: unknown[] })?.sitemap ?? [], raw: r.data });
      }
      case "submit_sitemap": {
        const site = String(body.siteUrl);
        const feed = String(body.feedpath);
        const r = await gsc(`/webmasters/v3/sites/${enc(site)}/sitemaps/${enc(feed)}`, { method: "PUT" });
        return json({ status: r.status, ok: r.ok, data: r.data });
      }
      case "performance": {
        const site = String(body.siteUrl);
        const days = Math.min(Number(body.days) || 28, 90);
        const end = new Date();
        const start = new Date(Date.now() - days * 86400000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const r = await gsc(`/webmasters/v3/sites/${enc(site)}/searchAnalytics/query`, {
          method: "POST",
          body: JSON.stringify({
            startDate: fmt(start),
            endDate: fmt(end),
            dimensions: ["date"],
            rowLimit: days,
          }),
        });
        const rows = (r.data as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> })?.rows || [];
        const totals = rows.reduce((acc, r) => ({
          clicks: acc.clicks + r.clicks,
          impressions: acc.impressions + r.impressions,
        }), { clicks: 0, impressions: 0 });
        // top queries
        const q = await gsc(`/webmasters/v3/sites/${enc(site)}/searchAnalytics/query`, {
          method: "POST",
          body: JSON.stringify({
            startDate: fmt(start),
            endDate: fmt(end),
            dimensions: ["query"],
            rowLimit: 10,
          }),
        });
        return json({
          ok: r.ok, status: r.status,
          days, totals, rows,
          topQueries: (q.data as { rows?: unknown[] })?.rows || [],
          error: r.ok ? null : r.data,
        });
      }
      case "inspect_url": {
        const site = String(body.siteUrl);
        const inspectionUrl = String(body.inspectionUrl);
        const r = await gsc(`/v1/urlInspection/index:inspect`, {
          method: "POST",
          body: JSON.stringify({ inspectionUrl, siteUrl: site }),
        });
        return json({ status: r.status, ok: r.ok, data: r.data });
      }
      case "validate_sitemap": {
        // Fetches the deployed sitemap.xml and validates URLs against Google's list.
        const site = String(body.siteUrl);
        const sitemapUrl = `${site}sitemap.xml`;
        const sitemapRes = await fetch(sitemapUrl);
        const xml = await sitemapRes.text();
        const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
        const google = await gsc(`/webmasters/v3/sites/${enc(site)}/sitemaps`);
        const googleSitemaps = (google.data as { sitemap?: Array<Record<string, unknown>> })?.sitemap ?? [];
        const problems: string[] = [];
        if (!sitemapRes.ok) problems.push(`sitemap.xml returned HTTP ${sitemapRes.status}`);
        if (urls.length === 0) problems.push("no <loc> entries found");
        urls.forEach(u => { if (!u.startsWith(site.replace(/\/$/, ""))) problems.push(`URL outside site scope: ${u}`); });
        googleSitemaps.forEach((sm) => {
          const errors = Number((sm as { errors?: string | number }).errors ?? 0);
          const warnings = Number((sm as { warnings?: string | number }).warnings ?? 0);
          if (errors) problems.push(`Google reports ${errors} error(s) on ${(sm as {path?: string}).path}`);
          if (warnings) problems.push(`Google reports ${warnings} warning(s) on ${(sm as {path?: string}).path}`);
        });
        return json({
          ok: problems.length === 0,
          sitemapUrl,
          fetchStatus: sitemapRes.status,
          urlCount: urls.length,
          urls: urls.slice(0, 200),
          googleSitemaps,
          problems,
        });
      }
      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    console.error("gsc error:", e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
