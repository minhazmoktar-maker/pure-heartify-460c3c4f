import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  type Permission,
  type Role,
} from "@/lib/permissions";

/**
 * Parity regression: the edge-side matrix in
 * `supabase/functions/_shared/authz.ts` must stay in lock-step with the
 * client-side matrix in `src/lib/permissions.ts`. Deno cannot import from
 * `src/`, so the edge file duplicates the data by hand — this test is the
 * mechanical guardrail that catches drift.
 */

const AUTHZ_PATH = resolve(__dirname, "../../../supabase/functions/_shared/authz.ts");
const AUTHZ_SRC = readFileSync(AUTHZ_PATH, "utf8");

function parseStringArray(source: string, name: string): string[] {
  // Matches `const NAME: Permission[] = [ "a", "b", ... ];`
  const re = new RegExp(
    `const\\s+${name}\\s*:\\s*Permission\\[\\]\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*;`,
    "m",
  );
  const m = source.match(re);
  if (!m) throw new Error(`could not locate ${name} in authz.ts`);
  return Array.from(m[1].matchAll(/"([^"]+)"/g)).map((x) => x[1]);
}

function parseUnion(source: string): string[] {
  const m = source.match(
    /export\s+type\s+Permission\s*=\s*([\s\S]*?);/m,
  );
  if (!m) throw new Error("could not locate Permission union in authz.ts");
  return Array.from(m[1].matchAll(/"([^"]+)"/g)).map((x) => x[1]);
}

describe("authz.ts parity with permissions.ts", () => {
  const edgeUnion = parseUnion(AUTHZ_SRC);
  const edgeOwnerOnly = parseStringArray(AUTHZ_SRC, "OWNER_ONLY");
  const edgeAdminPlus = parseStringArray(AUTHZ_SRC, "ADMIN_PLUS");
  const edgeModeratorPlus = parseStringArray(AUTHZ_SRC, "MODERATOR_PLUS");

  it("Permission union matches PERMISSIONS list (same set)", () => {
    expect(new Set(edgeUnion)).toEqual(new Set(PERMISSIONS));
  });

  it("moderator additive set matches client", () => {
    // Everything moderator has that user does not.
    const expected = [...ROLE_PERMISSIONS.moderator].filter(
      (p) => !ROLE_PERMISSIONS.user.has(p),
    );
    expect(new Set(edgeModeratorPlus)).toEqual(new Set(expected));
  });

  it("admin additive set matches client", () => {
    // Everything admin has that moderator does not.
    const expected = [...ROLE_PERMISSIONS.admin].filter(
      (p) => !ROLE_PERMISSIONS.moderator.has(p),
    );
    expect(new Set(edgeAdminPlus)).toEqual(new Set(expected));
  });

  it("owner-only set matches client", () => {
    // Everything owner has that admin does not.
    const expected = [...ROLE_PERMISSIONS.owner].filter(
      (p) => !ROLE_PERMISSIONS.admin.has(p),
    );
    expect(new Set(edgeOwnerOnly)).toEqual(new Set(expected));
  });

  it("expanded edge role sets match client role sets", () => {
    const edgeModerator = new Set<string>(edgeModeratorPlus);
    const edgeAdmin = new Set<string>([...edgeModeratorPlus, ...edgeAdminPlus]);
    const edgeOwner = new Set<string>([
      ...edgeModeratorPlus,
      ...edgeAdminPlus,
      ...edgeOwnerOnly,
    ]);

    const clientToSet = (r: Role) => new Set<string>([...ROLE_PERMISSIONS[r]]);
    expect(edgeModerator).toEqual(clientToSet("moderator"));
    expect(edgeAdmin).toEqual(clientToSet("admin"));
    expect(edgeOwner).toEqual(clientToSet("owner"));
  });

  it("authorize() resolves moderator role (regression: F1)", () => {
    // Sanity: authz.ts must contain a moderator branch. Guards against a
    // regression where the role query drops `moderator` again.
    expect(AUTHZ_SRC).toMatch(/role=in\.\(admin,moderator\)/);
    expect(AUTHZ_SRC).toMatch(/return "moderator"/);
  });

  // Keep TS happy on the imported types.
  it("Permission type is consistent", () => {
    const p: Permission = "delete_video";
    expect(PERMISSIONS).toContain(p);
  });
});
