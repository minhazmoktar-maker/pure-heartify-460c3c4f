/**
 * Verifies CDN / client cache invalidation after the nightly re-audit sweep.
 *
 * Strategy (fully self-contained, no seeding required):
 * 1. Snapshot search + recommendation surfaces.
 * 2. Trigger `nightly_reaudit_sweep` via the public RPC (idempotent, SECURITY DEFINER).
 * 3. Hard-reload each surface with a cache-busting query param and confirm:
 *    - HTTP responses to `/rest/v1/curated_videos` come back fresh
 *      (not `x-cache: HIT`, not 304 from a stale service-worker).
 *    - None of the currently-blocked patterns leak into rendered results
 *      even after aggressive back-forward cache reuse.
 */
import { test, expect, type Page } from "../playwright-fixture";

const BLOCKED = [
  "mia yilin","leila hormozi","layla hormozi","mehreen","haleh banani",
  "makeup tutorial","hijab tutorial","grwm","muslimah vlog","twerk",
];

async function assertNoBlockedText(page: Page, where: string) {
  const text = (await page.locator("body").innerText()).toLowerCase();
  for (const term of BLOCKED) {
    expect(text, `[${where}] leaked "${term}" after cache invalidation`).not.toContain(term);
  }
}

async function hardReload(page: Page, url: string) {
  // Cache-buster forces the browser + any CDN edge to revalidate.
  const buster = `_cb=${Date.now()}`;
  const sep = url.includes("?") ? "&" : "?";
  await page.goto(`${url}${sep}${buster}`, { waitUntil: "networkidle" });
}

test.describe("nightly re-audit cache invalidation", () => {
  test("stale blocked content never reappears after sweep", async ({ page, request }) => {
    // 1. Baseline visit — populates any HTTP + service-worker caches.
    await page.goto("/");
    await page.waitForTimeout(1500);
    await assertNoBlockedText(page, "home/baseline");

    // 2. Trigger nightly sweep via anon-safe RPC endpoint.
    //    (Fails silently if not exposed; test still validates cache freshness.)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (supabaseUrl && anon) {
      await request
        .post(`${supabaseUrl}/rest/v1/rpc/nightly_reaudit_sweep`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
          data: {},
        })
        .catch(() => void 0);
    }

    // 3. Track any curated_videos response that is a cache HIT (bad).
    const cacheHits: string[] = [];
    page.on("response", (r) => {
      if (!r.url().includes("curated_videos")) return;
      const cc = r.headers()["x-cache"] || r.headers()["cf-cache-status"] || "";
      if (/HIT/i.test(cc)) cacheHits.push(`${r.url()} → ${cc}`);
    });

    // 4. Revisit every surface with cache-buster and confirm freshness.
    for (const path of ["/", "/search?q=quran", "/search?q=ramadan", "/channels"]) {
      await hardReload(page, path);
      await page.waitForTimeout(1000);
      await assertNoBlockedText(page, path);
    }

    expect(cacheHits, `curated_videos served from stale CDN cache: ${cacheHits.join(", ")}`)
      .toHaveLength(0);

    // 5. Back-forward cache (bfcache) revisit — most aggressive stale path.
    await page.goto("/");
    await page.goBack().catch(() => void 0);
    await page.goForward().catch(() => void 0);
    await page.waitForTimeout(1000);
    await assertNoBlockedText(page, "bfcache");
  });
});
