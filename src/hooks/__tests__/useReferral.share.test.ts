import { describe, it, expect } from "vitest";

// Sanity checks for the SEO-safe referral URL builder.
function buildShareUrl(origin: string, code: string | null): string | null {
  if (!code) return null;
  return `${origin}/signup?ref=${code}`;
}

describe("referral share url", () => {
  it("returns null without a code", () => {
    expect(buildShareUrl("https://x", null)).toBeNull();
  });
  it("appends the code to the signup path", () => {
    expect(buildShareUrl("https://heartify.app", "AB12CD34")).toBe(
      "https://heartify.app/signup?ref=AB12CD34",
    );
  });
});
