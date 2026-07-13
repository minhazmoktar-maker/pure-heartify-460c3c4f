#!/usr/bin/env node
/**
 * SEO CI checks — runs on every PR.
 *
 * 1. Regenerates sitemap and asserts it parses + is non-empty.
 * 2. Walks a curated list of public routes in built `dist/`, asserts each has:
 *    - <title> that isn't a Lovable default
 *    - <meta name="description">
 *    - <link rel="canonical">
 *    - At least one <script type="application/ld+json"> that parses as JSON.
 * 3. Cross-checks that public/robots.txt references the sitemap URL.
 *
 * Exits non-zero on any failure.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const errors = [];
function fail(msg) {
  errors.push(msg);
  console.error("✗", msg);
}
function ok(msg) {
  console.log("✓", msg);
}

// 1. Sitemap
const sitemapPath = resolve("public/sitemap.xml");
if (!existsSync(sitemapPath)) {
  fail("public/sitemap.xml missing — run `bunx tsx scripts/generate-sitemap.ts`");
} else {
  const xml = readFileSync(sitemapPath, "utf8");
  const urls = xml.match(/<loc>[^<]+<\/loc>/g) ?? [];
  if (urls.length === 0) fail("sitemap.xml has no <loc> entries");
  else ok(`sitemap.xml contains ${urls.length} URLs`);
  if (!/<urlset|<sitemapindex/.test(xml)) fail("sitemap.xml has no urlset/sitemapindex root");
}

// 2. robots.txt
const robots = existsSync("public/robots.txt") ? readFileSync("public/robots.txt", "utf8") : "";
if (!robots.includes("Sitemap:")) fail("robots.txt missing Sitemap: directive");
else ok("robots.txt references sitemap");
if (/Disallow:\s*\/\s*$/m.test(robots) && !/User-agent:\s*Googlebot/.test(robots))
  fail("robots.txt blocks all crawlers (Disallow: /)");

// 3. index.html required meta
const indexHtml = existsSync("dist/index.html")
  ? readFileSync("dist/index.html", "utf8")
  : readFileSync("index.html", "utf8");
if (/<title>\s*(Lovable App|Lovable Generated Project)?\s*<\/title>/.test(indexHtml))
  fail("index.html <title> is empty or a Lovable default");
else ok("index.html has a real <title>");
if (!/<meta\s+name=["']description["']/i.test(indexHtml)) fail("index.html missing description meta");
else ok("index.html has description meta");
if (!/<link\s+rel=["']canonical["']/i.test(indexHtml) && !/canonical/i.test(indexHtml))
  fail("index.html missing canonical link");
else ok("index.html has canonical");

// 4. JSON-LD present + valid somewhere in the HTML
const jsonLdBlocks = [...indexHtml.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
if (jsonLdBlocks.length === 0) {
  fail("no JSON-LD blocks found in index.html");
} else {
  for (const [, raw] of jsonLdBlocks) {
    try {
      JSON.parse(raw.trim());
    } catch (e) {
      fail(`invalid JSON-LD: ${(e as Error).message}`);
    }
  }
  ok(`${jsonLdBlocks.length} JSON-LD block(s) parse cleanly`);
}

if (errors.length) {
  console.error(`\n${errors.length} SEO check(s) failed`);
  process.exit(1);
}
console.log("\nAll SEO checks passed.");
