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
    // Anti-pattern: comparing the header straight to `Deno.env.get(...)` with no
    // truthiness guard and no non-empty fallback — if the secret is missing,
    // both sides are undefined and an unauthenticated caller gets in.
    const UNGUARDED =
      /(?<![!&|]\s?)\b(\w+)\s*===\s*Deno\.env\.get\(\s*["'][A-Z_]*CRON[A-Z_]*["']\s*\)\s*(?![)\s]*\?\?)/;
    for (const name of listFunctions()) {
      const src = readFunction(name);
      // Only functions that authenticate with the header matter here; some
      // functions merely forward it to another worker.
      if (!/headers\.get\(\s*["']x-cron-token["']\s*\)/i.test(src)) continue;
      for (const line of src.split("\n")) {
        const match = UNGUARDED.exec(line);
        if (!match) continue;
        // Guarded when the same line asserts the header is non-empty.
        const guarded = new RegExp(`!!\\s*${match[1]}\\b|\\b${match[1]}\\s*&&`).test(line) ||
          /!!cronToken|!expected/.test(line);
        expect(guarded, `${name} compares a cron token without a guard: ${line.trim()}`)
          .toBe(true);
      }
    }
  });

});
