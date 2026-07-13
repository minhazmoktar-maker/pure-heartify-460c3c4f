// k6 smoke + load test for Heartify public endpoints.
// Run locally: `k6 run tests/load/k6-smoke.js`
// CI runs this in `.github/workflows/load-tests.yml` with BASE_URL from vars.
//
// Thresholds encode the capacity plan: p95 < 800ms on landing, feed anon,
// and search anon under a 20 VU / 60s smoke. Bump VUs in nightly runs.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "https://pure-heartify.lovable.app";

export const options = {
  scenarios: {
    smoke: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 20),
      duration: __ENV.DURATION || "60s",
    },
  },
  thresholds: {
    // Fail the run if p95 exceeds 800ms or any endpoint's error rate > 1%.
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.01"],
  },
};

const paths = ["/", "/about", "/trust", "/browse", "/sitemap.xml"];

export default function () {
  for (const p of paths) {
    const res = http.get(`${BASE}${p}`, { tags: { path: p } });
    check(res, {
      [`${p} status is 2xx/3xx`]: (r) => r.status >= 200 && r.status < 400,
    });
    sleep(0.3);
  }
}
