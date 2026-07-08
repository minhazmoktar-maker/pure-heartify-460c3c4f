import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

// ---- Mocks --------------------------------------------------------------

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", email: "test@example.com" }, loading: false }),
}));

const listFactors = vi.fn();
const enroll = vi.fn();
const challenge = vi.fn();
const verify = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: (...a: unknown[]) => listFactors(...a),
        enroll: (...a: unknown[]) => enroll(...a),
        challenge: (...a: unknown[]) => challenge(...a),
        verify: (...a: unknown[]) => verify(...a),
      },
    },
  },
}));

vi.mock("@/components/Navbar", () => ({ default: () => <nav /> }));
vi.mock("@/components/ui/use-toast", () => ({ toast: vi.fn() }));

// Component under test — imported *after* mocks are registered.
import MfaEnroll from "@/pages/MfaEnroll";

const renderPage = () =>
  render(
    <MemoryRouter>
      <MfaEnroll />
    </MemoryRouter>,
  );

// ---- Tests --------------------------------------------------------------

describe("<MfaEnroll />", () => {
  beforeEach(() => {
    navigate.mockReset();
    listFactors.mockReset();
    enroll.mockReset();
    challenge.mockReset();
    verify.mockReset();
  });

  it("shows the QR code + secret when the user has no verified TOTP factor", async () => {
    listFactors.mockResolvedValue({ data: { totp: [] } });
    enroll.mockResolvedValue({
      data: { id: "f1", totp: { qr_code: "data:image/png;base64,AAA", secret: "JBSWY3DPEHPK3PXP" } },
      error: null,
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByAltText(/TOTP QR code/i)).toBeInTheDocument(),
    );
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    expect(enroll).toHaveBeenCalledWith(
      expect.objectContaining({ factorType: "totp" }),
    );
  });

  it("shows the enrolled state and skips enrollment if a verified factor exists", async () => {
    listFactors.mockResolvedValue({
      data: { totp: [{ id: "f0", status: "verified" }] },
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/TOTP is enabled on your account/i)).toBeInTheDocument(),
    );
    expect(enroll).not.toHaveBeenCalled();
  });

  it("verifies the code by chaining challenge → verify with the same factor", async () => {
    listFactors.mockResolvedValue({ data: { totp: [] } });
    enroll.mockResolvedValue({
      data: { id: "f1", totp: { qr_code: "data:image/png;base64,x", secret: "SECRET" } },
      error: null,
    });
    challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    verify.mockResolvedValue({ data: {}, error: null });

    renderPage();
    const input = await screen.findByPlaceholderText("123456");
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /verify/i }));

    await waitFor(() => expect(verify).toHaveBeenCalled());
    expect(challenge).toHaveBeenCalledWith({ factorId: "f1" });
    expect(verify).toHaveBeenCalledWith({
      factorId: "f1",
      challengeId: "c1",
      code: "123456",
    });
  });

  it("redirects to /login when there is no user", async () => {
    vi.doMock("@/contexts/AuthContext", () => ({
      useAuth: () => ({ user: null, loading: false }),
    }));
    vi.resetModules();
    const Fresh = (await import("@/pages/MfaEnroll")).default;
    render(
      <MemoryRouter>
        <Fresh />
      </MemoryRouter>,
    );
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/login"));
  });
});
