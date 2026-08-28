/**
 * Brand-mark + AuthField layout regression.
 *
 * Guards two shipped bugs from recurring:
 *  1. Auth screens rendering a placeholder glyph instead of the official
 *     Heartify mark (`src/assets/heartify-mark.png` via <Logomark />).
 *  2. AuthField leading icons / password toggle overlapping the input text
 *     (icon present without the `!ps-10` inset, or toggle without `pe-10`).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Mail, Lock } from "lucide-react";
import Logomark from "@/components/Logomark";
import { AuthField } from "@/components/auth/AuthField";

describe("Logomark — official brand mark only", () => {
  it("renders the heartify mark asset with an accessible name", () => {
    render(<Logomark size={40} />);
    const img = screen.getByRole("img", { name: "Heartify" });
    expect(img.getAttribute("src")).toMatch(/heartify-mark/);
    expect(img.getAttribute("width")).toBe("40");
    expect(img.getAttribute("height")).toBe("40");
    // Square + non-distorting: prevents the squashed-mark regression.
    expect(img.className).toContain("object-contain");
  });
});

describe("AuthField — icon/text overlap contract", () => {
  it("insets the input when a leading icon is present", () => {
    render(<AuthField icon={Mail} label="Email" placeholder="you@example.com" />);
    const input = screen.getByPlaceholderText("you@example.com");
    expect(input.className).toContain("!ps-10");
  });

  it("reserves room for the password toggle and keeps a 44px tap target", () => {
    render(<AuthField icon={Lock} passwordToggle placeholder="Password" />);
    const input = screen.getByPlaceholderText("Password");
    expect(input.className).toContain("pe-10");
    expect(input.className).toContain("!ps-10");

    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle.className).toContain("h-11");
    expect(toggle.className).toContain("w-11");
  });

  it("keeps the label wired to the input so the icon never sits over label text", () => {
    render(<AuthField icon={Mail} label="Email address" placeholder="email" />);
    const input = screen.getByPlaceholderText("email");
    const label = screen.getByText("Email address");
    expect(label.getAttribute("for")).toBe(input.id);
  });
});
