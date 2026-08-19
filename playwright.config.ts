import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ?? "8080";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // `chrome-headless-shell` is the default headless binary since Playwright
    // 1.49 and must be installed explicitly in CI alongside `chromium`
    // (see .github/workflows/*: `playwright install --with-deps chromium
    // chromium-headless-shell`). Set PLAYWRIGHT_CHANNEL=chromium to force the
    // full browser build on hosts where the shell's system libraries are
    // unavailable — scripts/playwright.sh does this automatically.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],


  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        port: Number(PORT),
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
