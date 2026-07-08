import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/**
 * AdminRoute is the single choke-point for admin/owner MFA enforcement.
 * These tests verify:
 *   - Children never render until useRequireAdminMfa reports OK.
 *   - Every /admin/* and /owner route in App.tsx is wrapped by AdminRoute
 *     (parses the source once — cheap regression insurance against a future
 *     PR that forgets the wrapper).
 */

const mfaOk = vi.fn();
vi.mock("@/hooks/useRequireAdminMfa", () => ({
  useRequireAdminMfa: () => mfaOk(),
}));

import AdminRoute from "@/components/AdminRoute";

describe("<AdminRoute />", () => {
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
    // Shows an accessible loading indicator instead.
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

// -------- Regression guard: every admin/owner route is wrapped ------------

import fs from "node:fs";
import path from "node:path";

describe("App routing regression: every privileged route uses <AdminRoute>", () => {
  const appSource = fs.readFileSync(
    path.resolve(__dirname, "../../App.tsx"),
    "utf8",
  );

  const privilegedPaths = [
    "/admin/moderation",
    "/admin/audit",
    "/admin/console",
    "/admin/review",
    "/owner",
    "/admin/channel-trust",
    "/admin/analytics",
    "/admin/audio-integrity",
  ];

  it.each(privilegedPaths)(
    "route %s is wrapped in <AdminRoute>",
    (routePath) => {
      // Match: <Route path="/admin/foo" element={<AdminRoute>...</AdminRoute>} />
      const re = new RegExp(
        `path=["']${routePath.replace(/\//g, "\\/")}["'][^>]*element=\\{<AdminRoute>`,
      );
      expect(appSource).toMatch(re);
    },
  );

  it("public routes are NOT wrapped in <AdminRoute>", () => {
    // Sanity: home/login/watch remain unprotected.
    expect(appSource).toMatch(/path="\/"\s+element=\{<Index/);
    expect(appSource).toMatch(/path="\/login"\s+element=\{<Login/);
    expect(appSource).not.toMatch(/path="\/"[^>]*<AdminRoute/);
  });
});
