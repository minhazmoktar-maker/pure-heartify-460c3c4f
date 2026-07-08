import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import fs from "node:fs";
import path from "node:path";

/**
 * AdminRoute is the single choke-point for admin/owner MFA enforcement.
 *
 * Tests fall into two groups:
 *   1. Runtime behavior — AdminRoute must gate children on `useRequireAdminMfa`.
 *   2. Regression guard — parse App.tsx and AUTO-DETECT every privileged
 *      route (`/admin/*`, `/owner`, `/owner/*`). CI fails if any privileged
 *      route is added without wrapping <AdminRoute>. This is the safety net
 *      that keeps future PRs from silently shipping an unguarded admin page.
 */

const mfaOk = vi.fn();
vi.mock("@/hooks/useRequireAdminMfa", () => ({
  useRequireAdminMfa: () => mfaOk(),
}));

import AdminRoute from "@/components/AdminRoute";

describe("<AdminRoute /> runtime behavior", () => {
  beforeEach(() => mfaOk.mockReset());

  it("does NOT render children while MFA guard is pending (returns false)", () => {
    mfaOk.mockReturnValue(false);
    render(
      <MemoryRouter>
        <AdminRoute>
          <div data-testid="protected">Secret admin content</div>
        </AdminRoute>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("protected")).toBeNull();
    expect(screen.getByLabelText(/verifying access/i)).toBeInTheDocument();
  });

  it("renders children only after the MFA guard returns true", async () => {
    mfaOk.mockReturnValue(true);
    render(
      <MemoryRouter>
        <AdminRoute>
          <div data-testid="protected">Secret admin content</div>
        </AdminRoute>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("protected")).toBeInTheDocument(),
    );
  });

  it("blocks children in the context of an admin route path", () => {
    mfaOk.mockReturnValue(false);
    render(
      <MemoryRouter initialEntries={["/admin/console"]}>
        <Routes>
          <Route
            path="/admin/console"
            element={
              <AdminRoute>
                <div data-testid="console">Console UI</div>
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId("console")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Regression guard: EVERY privileged route in App.tsx must be MFA-wrapped.
// This auto-detects new routes — no manual list to maintain.
// ---------------------------------------------------------------------------

const APP_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../../App.tsx"),
  "utf8",
);

/**
 * A route is "privileged" if its path begins with `/admin/` or is
 * exactly `/owner` (or a `/owner/...` sub-route). Extend this predicate
 * when new privileged prefixes are introduced (e.g. `/moderator`).
 */
function isPrivilegedPath(p: string): boolean {
  return p.startsWith("/admin/") || p === "/owner" || p.startsWith("/owner/");
}

/**
 * Extract every <Route path="..." element={...} /> declaration.
 * Uses a tolerant regex — enough for the App.tsx style, not a full JSX parser.
 */
function extractRoutes(source: string): Array<{ path: string; element: string }> {
  const routes: Array<{ path: string; element: string }> = [];
  const re = /<Route\s+path=["']([^"']+)["']\s+element=\{([\s\S]*?)\}\s*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    routes.push({ path: match[1], element: match[2] });
  }
  return routes;
}

const ALL_ROUTES = extractRoutes(APP_SOURCE);
const PRIVILEGED_ROUTES = ALL_ROUTES.filter((r) => isPrivilegedPath(r.path));
const PUBLIC_ROUTES = ALL_ROUTES.filter((r) => !isPrivilegedPath(r.path));

describe("App routing regression: privileged routes are auto-detected", () => {
  it("sanity: parser finds a non-trivial number of routes in App.tsx", () => {
    // Guards against regex breakage — if App.tsx is restructured and the
    // parser stops finding routes, every downstream assertion becomes
    // vacuously true. Fail loudly instead.
    expect(ALL_ROUTES.length).toBeGreaterThanOrEqual(10);
  });

  it("sanity: at least one privileged route exists (otherwise the guard is a no-op)", () => {
    expect(PRIVILEGED_ROUTES.length).toBeGreaterThan(0);
  });

  if (PRIVILEGED_ROUTES.length > 0) {
    it.each(PRIVILEGED_ROUTES.map((r) => [r.path, r.element]))(
      "privileged route %s is wrapped in <AdminRoute>",
      (routePath, element) => {
        // The element expression must start with <AdminRoute> and close with
        // </AdminRoute>. This catches:
        //   - New /admin/* pages missing the wrapper
        //   - Someone unwrapping an existing one
        //   - Using a sibling guard instead of AdminRoute
        expect(
          element.trim().startsWith("<AdminRoute>"),
          `Route ${routePath} must start its element with <AdminRoute>. ` +
            `Got: ${element.trim().slice(0, 120)}`,
        ).toBe(true);
        expect(
          element.includes("</AdminRoute>"),
          `Route ${routePath} must close with </AdminRoute>.`,
        ).toBe(true);
      },
    );
  }

  it("public routes are NOT wrapped in <AdminRoute>", () => {
    for (const r of PUBLIC_ROUTES) {
      expect(
        r.element.includes("<AdminRoute>"),
        `Public route ${r.path} unexpectedly wraps <AdminRoute>. ` +
          `If this is now a privileged route, rename its path to /admin/... ` +
          `or /owner/... so the auto-detector picks it up.`,
      ).toBe(false);
    }
  });
});
