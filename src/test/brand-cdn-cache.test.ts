/**
 * Brand asset delivery regression.
 *
 * A stale CDN copy of an unhashed logo path is invisible in code review but
 * ships the previous build's mark to real users after a rebrand. Two contracts
 * are asserted here:
 *   1. In-app marks are imported through Vite so they get a content hash and
 *      can be cached immutably.
 *   2. Every stable, unhashed brand path in /public must revalidate.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("Logomark asset pipeline", () => {
  const source = read("src/components/Logomark.tsx");

  it("imports the mark as a module so the built filename is content-hashed", () => {
    expect(source).toMatch(/import\s+\w+\s+from\s+["']@?[./\w-]*heartify-mark\.png["']/);
  });

  it("never hardcodes an unhashed public path for the mark", () => {
    expect(source).not.toMatch(/["']\/heartify-mark\.png["']/);
    expect(source).not.toMatch(/https?:\/\/[^"']*heartify-mark/);
  });
});

describe("_headers cache policy", () => {
  const headers = read("public/_headers");

  it("caches hashed build output immutably", () => {
    expect(headers).toMatch(/\/assets\/\*[\s\S]*?Cache-Control: public, max-age=31536000, immutable/);
  });

  it("forces revalidation on every stable brand path", () => {
    for (const path of ["/favicon.png", "/app-icon-1024.png", "/icons/*", "/manifest.json"]) {
      const block = headers.split("\n").findIndex((l) => l.trim() === path);
      expect(block, `${path} missing from _headers`).toBeGreaterThan(-1);
      expect(headers.slice(headers.indexOf(path)), path).toMatch(/must-revalidate/);
    }
  });

  it("never marks an unhashed brand path immutable", () => {
    const brandBlocks = headers.split(/\n(?=\/)/).filter((b) => /favicon|app-icon|icons\/|manifest/.test(b));
    expect(brandBlocks.length).toBeGreaterThan(0);
    for (const block of brandBlocks) expect(block).not.toContain("immutable");
  });
});
