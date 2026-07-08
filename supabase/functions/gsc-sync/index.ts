/**
 * gsc-sync — Scheduled Google Search Console sync.
 * Runs from pg_cron via pg_net. Authorized by a shared secret header,
 * NOT by user auth. Writes results to public.gsc_sync_snapshots so the
 * admin UI reads the latest state instantly.
 *
 * Also gated by _internal_config key `gsc_hourly_sync_enabled` — when
 * set to "false" the job returns early without hitting Google. Manual
 * runs from the admin UI bypass this gate by passing ?force=1.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("GSC_CRON_SECRET") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const GSC_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY")!;
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
const SITE = "https://pure-heartify.lovable.app/";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

async function gsc(path: string, init: RequestInit = {}) {
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
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: r.ok, status: r.status, data };
}

async function snapshot(kind: string, siteUrl: string | null, ok: boolean, data: unknown, error?: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/gsc_sync_snapshots`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ kind, site_url: siteUrl, ok, data, error: error ?? null }),
  });
}

async function getConfig(key: string): Promise<string | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_internal_config`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ _key: key }),
  });
  if (!r.ok) return null;
  const val = await r.json();
  return typeof val === "string" ? val : (val?.value ?? null);
}

const enc = (u: string) => encodeURIComponent(u);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Validate shared secret: env var first, then DB fallback (rotation without redeploy)
  const providedSecret = req.headers.get("x-cron-secret") ?? "";
  let expectedSecret = CRON_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    expectedSecret = (await getConfig("gsc_cron_secret")) ?? "";
  }
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  // Check enable flag — manual runs (?force=1) bypass
  if (!force) {
    const enabled = (await getConfig("gsc_hourly_sync_enabled")) ?? "true";
    if (enabled.toLowerCase() === "false") {
      return json({ skipped: true, reason: "gsc_hourly_sync_enabled=false" });
    }
  }

  const startedAt = Date.now();
  const results: Record<string, unknown> = {};

  // 1) Connection status
  try {
    const r = await gsc(`/webmasters/v3/sites`);
    const sites = (r.data as { siteEntry?: unknown[] })?.siteEntry ?? [];
    await snapshot("status", null, r.ok, { status: r.status, sites, error: r.ok ? null : r.data }, r.ok ? undefined : `HTTP ${r.status}`);
    results.status = { ok: r.ok, sites: sites.length };
  } catch (e) {
    await snapshot("status", null, false, {}, String(e));
    results.status = { ok: false, error: String(e) };
  }

  // 2) Sitemap list (Google-reported)
  try {
    const r = await gsc(`/webmasters/v3/sites/${enc(SITE)}/sitemaps`);
    await snapshot("sitemaps", SITE, r.ok, r.data ?? {}, r.ok ? undefined : `HTTP ${r.status}`);
    results.sitemaps = { ok: r.ok };
  } catch (e) {
    await snapshot("sitemaps", SITE, false, {}, String(e));
    results.sitemaps = { ok: false, error: String(e) };
  }

  // 3) Sitemap URL contents (for diffing)
  try {
    const smUrl = `${SITE}sitemap.xml`;
    const smRes = await fetch(smUrl);
    const xml = await smRes.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
    const ok = smRes.ok && urls.length > 0;
    await snapshot("sitemap_urls", SITE, ok, { fetchStatus: smRes.status, sitemapUrl: smUrl, urls, urlCount: urls.length }, ok ? undefined : `sitemap fetch ${smRes.status} / ${urls.length} urls`);
    results.sitemap_urls = { ok, urlCount: urls.length };
  } catch (e) {
    await snapshot("sitemap_urls", SITE, false, {}, String(e));
    results.sitemap_urls = { ok: false, error: String(e) };
  }

  // 4) Performance (last 28 days)
  try {
    const end = new Date();
    const start = new Date(Date.now() - 28 * 86400000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const [byDate, byQuery] = await Promise.all([
      gsc(`/webmasters/v3/sites/${enc(SITE)}/searchAnalytics/query`, {
        method: "POST",
        body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: ["date"], rowLimit: 28 }),
      }),
      gsc(`/webmasters/v3/sites/${enc(SITE)}/searchAnalytics/query`, {
        method: "POST",
        body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions: ["query"], rowLimit: 10 }),
      }),
    ]);
    const rows = (byDate.data as { rows?: Array<{ clicks: number; impressions: number }> })?.rows || [];
    const totals = rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
    await snapshot("performance", SITE, byDate.ok, {
      totals, rows, topQueries: (byQuery.data as { rows?: unknown[] })?.rows || [], days: 28,
    }, byDate.ok ? undefined : `HTTP ${byDate.status}`);
    results.performance = { ok: byDate.ok, clicks: totals.clicks, impressions: totals.impressions };
  } catch (e) {
    await snapshot("performance", SITE, false, {}, String(e));
    results.performance = { ok: false, error: String(e) };
  }

  return json({ ran: new Date().toISOString(), durationMs: Date.now() - startedAt, force, results });
});
