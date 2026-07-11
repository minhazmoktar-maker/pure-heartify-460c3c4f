import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigate };
});

const listFactors = vi.fn();
const challenge = vi.fn();
const verify = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: (...a: unknown[]) => listFactors(...a),
        challenge: (...a: unknown[]) => challenge(...a),
        verify: (...a: unknown[]) => verify(...a),
      },
    },
  },
}));

vi.mock("@/components/ui/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/components/SEO", () => ({ default: () => null, SEO: () => null }));

import MfaVerify from "@/pages/MfaVerify";

const renderPage = () =>
  render(
    <MemoryRouter>
      <MfaVerify />
    </MemoryRouter>,
  );

describe("<MfaVerify />", () => {
  beforeEach(() => {
    navigate.mockReset();
    listFactors.mockReset();
    challenge.mockReset();
    verify.mockReset();
  });

  it("redirects home when the account has no verified TOTP factor", async () => {
    listFactors.mockResolvedValue({ data: { totp: [] } });
    renderPage();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
  });

  it("verifies the entered code and navigates to '/' on success", async () => {
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "f1", status: "verified" }] },
    });
    challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    verify.mockResolvedValue({ data: {}, error: null });

    renderPage();
    const input = await screen.findByPlaceholderText("123456");
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/"));
    expect(verify).toHaveBeenCalledWith({
      factorId: "f1",
      challengeId: "c1",
      code: "123456",
    });
  });

  it("does not navigate away when the verify call returns an error", async () => {
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "f1", status: "verified" }] },
    });
    challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    verify.mockResolvedValue({ data: null, error: { message: "invalid" } });

    renderPage();
    const input = await screen.findByPlaceholderText("123456");
    fireEvent.change(input, { target: { value: "999999" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(verify).toHaveBeenCalled());
    // First call happened during initial load check (redirect not fired
    // because factor exists). It must not have been called with '/'.
    expect(navigate).not.toHaveBeenCalledWith("/");
  });
});
