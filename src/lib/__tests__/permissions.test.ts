import { describe, it, expect } from "vitest";
import {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  can,
  canAll,
  canAny,
  hasMinRole,
  requirePermission,
  AuthorizationError,
  ANONYMOUS,
  type Principal,
  type Permission,
} from "@/lib/permissions";

const P = (role: (typeof ROLES)[number]): Principal => ({
  id: `${role}-uid`,
  role,
});

describe("permission matrix", () => {
  it("owner has every permission", () => {
    for (const p of PERMISSIONS) expect(can(P("owner"), p)).toBe(true);
  });

  it("user has no privileged permissions", () => {
    for (const p of PERMISSIONS) expect(can(P("user"), p)).toBe(false);
  });

  it("moderator can moderate but not administrate", () => {
    expect(can(P("moderator"), "hide_video")).toBe(true);
    expect(can(P("moderator"), "approve_content")).toBe(true);
    expect(can(P("moderator"), "delete_video")).toBe(false);
    expect(can(P("moderator"), "manage_users")).toBe(false);
    expect(can(P("moderator"), "access_owner_dashboard")).toBe(false);
  });

  it("admin inherits moderator permissions", () => {
    for (const p of ROLE_PERMISSIONS.moderator) {
      expect(can(P("admin"), p)).toBe(true);
    }
  });

  it("admin cannot access owner-only actions", () => {
    const ownerOnly: Permission[] = [
      "manage_roles",
      "manage_owners",
      "manage_platform_settings",
      "manage_feature_flags",
      "manage_api_keys",
      "access_owner_dashboard",
      "view_audit_logs",
    ];
    for (const p of ownerOnly) expect(can(P("admin"), p)).toBe(false);
  });

  it("owner inherits admin permissions", () => {
    for (const p of ROLE_PERMISSIONS.admin) {
      expect(can(P("owner"), p)).toBe(true);
    }
  });
});

describe("default deny", () => {
  it("anonymous is denied every permission", () => {
    for (const p of PERMISSIONS) expect(can(ANONYMOUS, p)).toBe(false);
  });

  it("null principal is denied every permission", () => {
    for (const p of PERMISSIONS) expect(can(null, p)).toBe(false);
  });

  it("principal without id is denied", () => {
    expect(can({ id: null, role: "owner" }, "delete_video")).toBe(false);
  });
});

describe("canAll / canAny", () => {
  it("canAll requires every permission", () => {
    expect(canAll(P("owner"), ["delete_video", "manage_users"])).toBe(true);
    expect(canAll(P("admin"), ["delete_video", "access_owner_dashboard"])).toBe(
      false,
    );
  });

  it("canAny accepts any match", () => {
    expect(
      canAny(P("moderator"), ["delete_video", "hide_video"]),
    ).toBe(true);
    expect(canAny(P("user"), ["delete_video", "hide_video"])).toBe(false);
  });
});

describe("hasMinRole (legacy tier check)", () => {
  it("respects hierarchy", () => {
    expect(hasMinRole(P("user"), "moderator")).toBe(false);
    expect(hasMinRole(P("moderator"), "moderator")).toBe(true);
    expect(hasMinRole(P("admin"), "moderator")).toBe(true);
    expect(hasMinRole(P("owner"), "admin")).toBe(true);
    expect(hasMinRole(P("admin"), "owner")).toBe(false);
  });

  it("denies anonymous", () => {
    expect(hasMinRole(ANONYMOUS, "user")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("throws AuthorizationError when denied", () => {
    expect(() => requirePermission(P("user"), "delete_video")).toThrowError(
      AuthorizationError,
    );
  });

  it("passes silently when allowed", () => {
    expect(() =>
      requirePermission(P("owner"), "delete_video"),
    ).not.toThrow();
  });
});

describe("role inheritance regression", () => {
  it("every role's permission set is a superset of the one below (except moderator vs admin/owner exclusive perms)", () => {
    // moderator ⊆ admin ⊆ owner
    for (const p of ROLE_PERMISSIONS.moderator)
      expect(ROLE_PERMISSIONS.admin.has(p)).toBe(true);
    for (const p of ROLE_PERMISSIONS.admin)
      expect(ROLE_PERMISSIONS.owner.has(p)).toBe(true);
  });

  it("no unknown permissions leak into the matrix", () => {
    const known = new Set<string>(PERMISSIONS);
    for (const role of ROLES) {
      for (const p of ROLE_PERMISSIONS[role]) {
        expect(known.has(p)).toBe(true);
      }
    }
  });
});
