/**
 * Root fixture. Prefers the Lovable harness fixture when the package is
 * installed, and falls back to plain Playwright otherwise so a missing
 * harness package can never abort suite collection.
 */
export { test, expect } from "./tests/playwright-fixture";
