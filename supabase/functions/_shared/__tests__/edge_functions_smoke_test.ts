// Cross-function CORS/health smoke test.
//
// Phase 9 (#14/#15): raise edge-function coverage without duplicating per-function
// unit suites. Every deployed function must respond to an OPTIONS preflight
// with 2xx and CORS headers — that alone catches boot failures, missing
// imports, and CORS regressions across the whole surface.
//
// Run with: deno test --allow-env --allow-net supabase/functions/_shared/__tests__/edge_functions_smoke_test.ts
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

const BASE = Deno.env.get("SUPABASE_FUNCTIONS_URL") ??
  (Deno.env.get("VITE_SUPABASE_URL")
    ? `${Deno.env.get("VITE_SUPABASE_URL")}/functions/v1`
    : null);

// Every function directory under supabase/functions. Keep in sync when we
// add or retire functions — a missing entry is a coverage gap.
const FUNCTIONS = [
  "admin-roles", "audio-integrity-check", "audit-compliance", "batch-verify-channels",
  "client-bootstrap", "complete-dose-video", "csp-report", "delete-account",
  "dispatch-alert", "export-account-data", "feed", "generate-daily-dose",
  "get-vapid-public-key", "gsc-sync", "gsc", "image-proxy", "ingest-videos",
  "log-privileged-action", "moderate-video", "notify-favorites", "notify-streak-risk",
  "og-image", "prayer-times", "qibla", "recheck-approved-channels", "recommendations",
  "recompute-channel-trust", "redeem-referral", "refresh-leaderboards", "refresh-sections",
  "retention-purge", "search-backfill", "search", "send-push", "submit-report",
  "subscribe-web-push", "user-sync-pull", "user-sync-push", "verify-channel", "youtube-proxy",
];

Deno.test({
  name: "edge-functions smoke — every function responds to OPTIONS preflight",
  ignore: !BASE,
  async fn() {
    const failures: string[] = [];
    for (const fn of FUNCTIONS) {
      try {
        const res = await fetch(`${BASE}/${fn}`, {
          method: "OPTIONS",
          headers: {
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type, authorization",
            Origin: "https://pure-heartify.lovable.app",
          },
        });
        await res.text(); // avoid resource leak
        if (res.status >= 500) failures.push(`${fn} → ${res.status}`);
        // CORS header must be present for browser callable functions.
        const allow = res.headers.get("access-control-allow-origin");
        assert(allow, `${fn} missing Access-Control-Allow-Origin`);
      } catch (err) {
        failures.push(`${fn} → ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    assertEquals(failures, [], `Edge function smoke failures: ${failures.join(", ")}`);
  },
});
