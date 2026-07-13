#!/usr/bin/env node
/**
 * GSC monitoring — daily run.
 *
 * Uses the google_search_console connector gateway to:
 *   1. List verified sites.
 *   2. For the primary site (SITE_URL env, default https://pure-heartify.lovable.app/):
 *      - Fetch sitemap submission status.
 *      - Inspect the homepage indexing state.
 *   3. Fail (exit 1) if any sitemap has errors > 0 OR homepage isn't INDEXED.
 *
 * A failing exit triggers whatever alert the CI job is wired to (Slack, email, GitHub issue).
 */
const KEY = process.env.LOVABLE_API_KEY;
const CONN = process.env.GOOGLE_SEARCH_CONSOLE_API_KEY;
const SITE = process.env.SITE_URL ?? "https://pure-heartify.lovable.app/";

if (!KEY || !CONN) {
  console.error("Missing LOVABLE_API_KEY or GOOGLE_SEARCH_CONSOLE_API_KEY");
  process.exit(2);
}

const base = "https://connector-gateway.lovable.dev/google_search_console";
const H = { Authorization: `Bearer ${KEY}`, "X-Connection-Api-Key": CONN };

async function g(path, init = {}) {
  const r = await fetch(`${base}${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  const t = await r.text();
  return { status: r.status, body: t };
}

const errors = [];

const sites = await g("/webmasters/v3/sites");
if (sites.status !== 200) {
  errors.push(`sites list failed: ${sites.status} ${sites.body}`);
} else {
  const list = JSON.parse(sites.body).siteEntry ?? [];
  const match = list.find((s) => s.siteUrl === SITE);
  if (!match) errors.push(`SITE_URL ${SITE} not verified in GSC (verified: ${list.map((s) => s.siteUrl).join(", ")})`);
  else console.log(`✓ verified: ${match.siteUrl} (${match.permissionLevel})`);
}

const enc = encodeURIComponent(SITE);
const sm = await g(`/webmasters/v3/sites/${enc}/sitemaps`);
if (sm.status === 200) {
  const items = JSON.parse(sm.body).sitemap ?? [];
  for (const s of items) {
    const errCount = Number(s.errors ?? 0);
    const warnCount = Number(s.warnings ?? 0);
    const msg = `${s.path}: errors=${errCount}, warnings=${warnCount}, lastSubmitted=${s.lastSubmitted}`;
    if (errCount > 0) errors.push(`sitemap errors: ${msg}`);
    else console.log(`✓ ${msg}`);
  }
  if (items.length === 0) errors.push(`no sitemaps submitted for ${SITE}`);
} else {
  errors.push(`sitemaps fetch failed: ${sm.status} ${sm.body}`);
}

const insp = await g("/v1/urlInspection/index:inspect", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ inspectionUrl: SITE, siteUrl: SITE }),
});
if (insp.status === 200) {
  const idx = JSON.parse(insp.body).inspectionResult?.indexStatusResult;
  console.log(`homepage verdict=${idx?.verdict} coverageState="${idx?.coverageState}"`);
  if (idx?.verdict && idx.verdict !== "PASS") errors.push(`homepage indexing verdict=${idx.verdict}`);
} else {
  errors.push(`URL inspection failed: ${insp.status} ${insp.body}`);
}

if (errors.length) {
  console.error("\nGSC monitoring failures:");
  for (const e of errors) console.error(" -", e);
  process.exit(1);
}
console.log("\nGSC monitoring: all clear.");
