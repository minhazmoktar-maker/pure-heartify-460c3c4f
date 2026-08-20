/**
 * Concurrency stress test for the verified-only halal serving floor.
 *
 * Why: `visual_state = 'clean'` gating is applied inside every retriever and
 * RPC. Under concurrency we need proof that no fallback path (cache miss,
 * degraded retriever, YouTube proxy fallback, contract backfill) ever leaks an
 * unverified, archived, hidden or nasheed-category video into a response.
 *
 * What it does:
 *   1. Fires N concurrent waves at the `feed` and `surfaces` edge functions
 *      with distinct session ids (so each request takes a different shuffle
 *      and a different diversity path).
 *   2. Collects every returned video id.
 *   3. Batch-verifies them against `curated_videos` with the anon key:
 *      visual_state must be 'clean', is_archived/is_hidden falsy, category
 *      must not be a nasheed variant.
 *   4. Reports latency percentiles + error rate and exits non-zero on any
 *      gating violation or on p95 above the budget.
 *
 * Run: node tests/load/stress-verified-gating.mjs [--waves 6] [--concurrency 12]
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://tbgxtwgliumqqtuppztu.supabase.co";
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE";

const FN = `${SUPABASE_URL}/functions/v1`;
const REST = `${SUPABASE_URL}/rest/v1`;
const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
const WAVES = arg("waves", 6);
const CONCURRENCY = arg("concurrency", 12);
const P95_BUDGET_MS = arg("p95", 3000);

// Anon-reachable surfaces only. `for_you` / `continue_watching` are
// auth-required by contract and answer 401 without a session — including them
// would measure the auth gate, not the serving floor.
const SURFACES = [
  "browse",
  "trending",
  "recently_added",
  "hidden_gems",
  "new_videos",
  "popular_this_week",
];

const latencies = [];
const errors = [];
const ids = new Set();

/** Pull video ids out of any of the response shapes the functions return. */
function collect(payload) {
  const buckets = [payload?.items, payload?.videos, payload?.data, payload?.results];
  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;
    for (const item of bucket) {
      const id = item?.video_id ?? item?.videoId ?? item?.id;
      if (typeof id === "string" && id.length >= 8) ids.add(id);
    }
  }
}

async function hit(label, url, body) {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
    const ms = Date.now() - started;
    latencies.push(ms);
    if (res.status === 429) return; // rate limiting is expected under stress
    if (res.status === 401) return; // auth-required surface reached anonymously
    if (!res.ok) {
      errors.push(`${label} → ${res.status} ${(await res.text()).slice(0, 160)}`);
      return;
    }
    collect(await res.json());
  } catch (err) {
    latencies.push(Date.now() - started);
    errors.push(`${label} → ${err.message}`);
  }
}

async function runWave(wave) {
  const jobs = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const session = `stress-${wave}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    const surface = SURFACES[(wave * CONCURRENCY + i) % SURFACES.length];
    jobs.push(hit(`surfaces:${surface}`, `${FN}/surfaces`, { surface, session_id: session }));
    jobs.push(hit("feed", `${FN}/feed`, { session_id: session, limit: 24 }));
  }
  await Promise.all(jobs);
}

async function verifyServingFloor(videoIds) {
  const violations = [];
  const missing = [];
  const CHUNK = 80;
  for (let i = 0; i < videoIds.length; i += CHUNK) {
    const chunk = videoIds.slice(i, i + CHUNK);
    const inList = chunk.map((id) => `"${id}"`).join(",");
    const res = await fetch(
      `${REST}/curated_videos?select=video_id,visual_state,is_archived,is_hidden,category&video_id=in.(${inList})`,
      { headers: HEADERS },
    );
    if (!res.ok) {
      errors.push(`verify → ${res.status} ${(await res.text()).slice(0, 160)}`);
      continue;
    }
    const rows = await res.json();
    const byId = new Map(rows.map((r) => [r.video_id, r]));
    for (const id of chunk) {
      const row = byId.get(id);
      if (!row) {
        missing.push(id);
        continue;
      }
      if (row.visual_state !== "clean") violations.push(`${id}: visual_state=${row.visual_state}`);
      if (row.is_archived) violations.push(`${id}: archived`);
      if (row.is_hidden) violations.push(`${id}: hidden`);
      if (String(row.category ?? "").toLowerCase().includes("nasheed")) {
        violations.push(`${id}: nasheed category`);
      }
    }
  }
  return { violations, missing };
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];

(async () => {
  console.log(
    `Stress: ${WAVES} waves × ${CONCURRENCY} concurrent sessions (2 requests each) → ${SUPABASE_URL}`,
  );
  const t0 = Date.now();
  for (let w = 0; w < WAVES; w++) {
    await runWave(w);
    process.stdout.write(`  wave ${w + 1}/${WAVES} done — ${ids.size} unique videos so far\n`);
  }
  const wall = Date.now() - t0;

  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = pct(sorted, 50);
  const p95 = pct(sorted, 95);
  const errorRate = latencies.length ? errors.length / latencies.length : 1;

  console.log("\n--- Load ---");
  console.log(`requests: ${latencies.length}  wall: ${wall}ms`);
  console.log(`p50: ${p50}ms  p95: ${p95}ms  max: ${sorted.at(-1)}ms`);
  console.log(`errors: ${errors.length} (${(errorRate * 100).toFixed(2)}%)`);
  for (const e of errors.slice(0, 8)) console.log(`  ! ${e}`);

  console.log("\n--- Serving-floor verification ---");
  const list = [...ids];
  console.log(`verifying ${list.length} unique served videos…`);
  const { violations, missing } = await verifyServingFloor(list);
  console.log(`violations: ${violations.length}  not-in-corpus: ${missing.length}`);
  for (const v of violations.slice(0, 20)) console.log(`  ✗ ${v}`);
  for (const m of missing.slice(0, 10)) console.log(`  ? ${m} (not found in curated_videos)`);

  const fail =
    violations.length > 0 ||
    missing.length > 0 ||
    errorRate > 0.05 ||
    (list.length > 0 && p95 > P95_BUDGET_MS);
  console.log(
    `\n${fail ? "FAIL" : "PASS"} — gating ${violations.length + missing.length === 0 ? "held" : "LEAKED"}, p95 budget ${P95_BUDGET_MS}ms`,
  );
  process.exit(fail ? 1 : 0);
})();
