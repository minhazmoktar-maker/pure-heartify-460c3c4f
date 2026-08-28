import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Every scheduled worker is invoked by pg_cron with the shared internal cron
 * token. When a function only accepts a subset of the tokens the scheduler
 * uses, it returns 401 forever and the feature silently stops working — this is
 * exactly how push notifications went dark. These tests pin the contract.
 */

const FUNCTIONS_DIR = join(process.cwd(), "supabase", "functions");

function readFunction(name: string): string {
  return readFileSync(join(FUNCTIONS_DIR, name, "index.ts"), "utf8");
}

function listFunctions(): string[] {
  return readdirSync(FUNCTIONS_DIR).filter((entry) => {
    if (entry.startsWith("_")) return false;
    try {
      return statSync(join(FUNCTIONS_DIR, entry, "index.ts")).isFile();
    } catch {
      return false;
    }
  });
}

describe("cron token parity", () => {
  it("personalized-push accepts the scheduler's ingest cron token", () => {
    const src = readFunction("personalized-push");
    expect(src).toContain("INGEST_CRON_TOKEN");
  });

  it("personalized-push still requires some credential", () => {
    const src = readFunction("personalized-push");
    expect(src).toContain("Unauthorized");
    expect(src).toContain("has_role");
  });

  it("cron-invoked workers read the x-cron-token header", () => {
    for (const name of ["personalized-push", "sweep-embeddable", "alert-fanout"]) {
      const src = readFunction(name);
      expect(src.toLowerCase(), `${name} must read x-cron-token`).toContain("x-cron-token");
    }
  });

  it("no function trusts a cron token that is unset in the environment", () => {
    // `token === Deno.env.get("X")` is true when both sides are undefined only
    // if the header is absent, but a truthiness guard is still required.
    for (const name of listFunctions()) {
      const src = readFunction(name);
      // Only functions that authenticate with the header matter here; some
      // functions merely forward it to another worker.
      if (!/headers\.get\(\s*["']x-cron-token["']\s*\)/i.test(src)) continue;
      const guardsEmptyToken =
        /!!cronToken|cronToken &&|!expected|CRON_TOKEN &&|\?\?\s*"\\u0000"|\?\? "\u0000"/
          .test(src);
      expect(guardsEmptyToken, `${name} must guard against an empty cron token`).toBe(true);
    }
  });
});
