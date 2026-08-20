/**
 * Shared fixture for specs under `tests/e2e/`.
 *
 * The Lovable harness provides `lovable-agent-playwright-config/fixture`, but
 * that package is not installed in local/CI checkouts, which made the whole
 * suite fail at collection time (one unresolved import aborts every spec, not
 * just its own file). We prefer the harness fixture when it is present and fall
 * back to the plain Playwright test/expect otherwise, so the suite always runs.
 */
import * as base from "@playwright/test";

let test = base.test;
let expect = base.expect;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const harness = require("lovable-agent-playwright-config/fixture");
  if (harness?.test) test = harness.test;
  if (harness?.expect) expect = harness.expect;
} catch {
  /* harness fixture unavailable — plain Playwright is a valid superset here */
}

export { test, expect };
export type { Page, Locator, BrowserContext } from "@playwright/test";
