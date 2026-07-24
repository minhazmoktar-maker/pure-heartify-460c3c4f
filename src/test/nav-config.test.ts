import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { MAIN_NAV_ITEMS, ADMIN_NAV_ITEMS, navPath } from "@/config/nav";

const appSrc = fs.readFileSync(path.resolve(__dirname, "../App.tsx"), "utf8");

// Extract every `path="..."` declared in App.tsx
const declaredPaths = new Set<string>();
for (const m of appSrc.matchAll(/path=["']([^"']+)["']/g)) {
  declaredPaths.add(m[1]);
}

const routeMatches = (to: string): boolean => {
  const p = navPath({ to });
  if (declaredPaths.has(p)) return true;
  // Also accept parameterized matches like /video/:id when nav uses concrete /video/xyz.
  for (const decl of declaredPaths) {
    if (!decl.includes(":")) continue;
    const re = new RegExp("^" + decl.replace(/:[^/]+/g, "[^/]+") + "$");
    if (re.test(p)) return true;
  }
  return false;
};

describe("nav config resolves to real routes", () => {
  it.each([...MAIN_NAV_ITEMS])("main → $to", (item) => {
    expect(routeMatches(item.to), `${item.to} not in App.tsx routes`).toBe(true);
  });

  it.each([...ADMIN_NAV_ITEMS])("admin → $to", (item) => {
    expect(routeMatches(item.to), `${item.to} not in App.tsx routes`).toBe(true);
  });

  it("has no duplicate paths in the main menu", () => {
    const keys = MAIN_NAV_ITEMS.map((i) => i.to);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
