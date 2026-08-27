/**
 * The support assistant's action catalogue exists twice: server-side (the
 * authority, used to resolve model output) and client-side (used to refuse
 * anything unrecognised). Drift between them would silently drop valid
 * actions or, worse, render a route the server never vetted.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { SUPPORT_ACTIONS, sanitizeActions } from "../actions";

const SERVER_FILE = resolve(process.cwd(), "supabase/functions/_shared/support/routes.ts");

function parseServerActions() {
  const src = readFileSync(SERVER_FILE, "utf8");
  const block = src.slice(src.indexOf("SUPPORT_ACTIONS"), src.indexOf("] as const;"));
  const entries = [...block.matchAll(/\{\s*id:\s*"([^"]+)",\s*label:\s*"((?:[^"\\]|\\.)+)",\s*route:\s*"([^"]+)"(,\s*authOnly:\s*true)?\s*\}/g)];
  return entries.map((m) => ({
    id: m[1],
    label: m[2].replace(/\\'/g, "'"),
    route: m[3],
    authOnly: Boolean(m[4]),
  }));
}

describe("support action catalogue parity", () => {
  const server = parseServerActions();

  it("parses a non-trivial server catalogue", () => {
    expect(server.length).toBeGreaterThan(10);
  });

  it("matches the client catalogue exactly (ids, labels, routes, auth flags)", () => {
    expect(server.map((a) => a.id)).toEqual(SUPPORT_ACTIONS.map((a) => a.id));
    expect(server.map((a) => a.route)).toEqual(SUPPORT_ACTIONS.map((a) => a.route));
    expect(server.map((a) => a.label)).toEqual(SUPPORT_ACTIONS.map((a) => a.label));
    expect(server.map((a) => a.authOnly)).toEqual(SUPPORT_ACTIONS.map((a) => Boolean(a.authOnly)));
  });

  it("contains only in-app absolute paths — never external links", () => {
    for (const a of SUPPORT_ACTIONS) {
      expect(a.route.startsWith("/")).toBe(true);
      expect(a.route).not.toMatch(/^\/\//);
      expect(a.route).not.toMatch(/https?:/i);
    }
  });
});

describe("sanitizeActions", () => {
  it("keeps whitelisted routes and caps at three", () => {
    const out = sanitizeActions([
      { id: "open_help", label: "Help", route: "/help" },
      { id: "open_trust", label: "Trust", route: "/trust" },
      { id: "open_contact", label: "Contact", route: "/contact" },
      { id: "open_status", label: "Status", route: "/status" },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0].route).toBe("/help");
  });

  it("rejects off-app, protocol-relative and javascript routes", () => {
    expect(sanitizeActions([
      { id: "x", label: "Free money", route: "https://evil.example/phish" },
      { id: "y", label: "Also evil", route: "//evil.example" },
      { id: "z", label: "Script", route: "javascript:alert(1)" },
      { id: "w", label: "Unknown", route: "/not-a-real-route" },
    ])).toEqual([]);
  });

  it("de-duplicates repeated routes and ignores malformed entries", () => {
    const out = sanitizeActions([
      { id: "open_trust", label: "Trust", route: "/trust" },
      { id: "open_trust", label: "Trust again", route: "/trust" },
      null,
      "nope",
      { id: 5, label: "bad", route: "/settings" },
    ]);
    expect(out).toHaveLength(1);
  });

  it("returns an empty list for non-array input", () => {
    expect(sanitizeActions(undefined)).toEqual([]);
    expect(sanitizeActions({} as unknown)).toEqual([]);
  });
});
