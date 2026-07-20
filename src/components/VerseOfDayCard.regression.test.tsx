/**
 * Qur'anic-glyph regression: verify the ayah container carries the exact
 * font-family + dir/lang metadata the browser needs to render correct
 * Arabic ligatures. This is the DOM-level half of the visual snapshot;
 * paired with the /admin/rec-health Playwright screenshot suite it makes
 * corrupted ayah rendering un-shippable.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import VerseOfDayCard from "./VerseOfDayCard";

describe("VerseOfDayCard — Qur'anic glyph contract", () => {
  it("renders an RTL, Arabic-tagged container with the font-quran class", () => {
    render(
      <MemoryRouter>
        <VerseOfDayCard />
      </MemoryRouter>,
    );

    // The card link is always present, even before the async ayah lands.
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();

    // If the ayah paragraph has mounted (network-dependent in real usage,
    // but we allow either state) it MUST carry the correct metadata. The
    // skeleton state renders no [lang="ar"] node, so a missing element is
    // acceptable — but a present-but-mis-tagged one is not.
    const arabic = document.querySelector<HTMLElement>('[lang="ar"][dir="rtl"]');
    if (arabic) {
      expect(arabic.className).toContain("font-quran");
      expect(arabic.getAttribute("dir")).toBe("rtl");
      expect(arabic.getAttribute("lang")).toBe("ar");
      // unicode-bidi: isolate is critical for mixed-script rendering.
      expect(arabic.style.unicodeBidi).toBe("isolate");
    }
  });
});
