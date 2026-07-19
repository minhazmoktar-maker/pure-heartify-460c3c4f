import { describe, it, expect } from "vitest";
import {
  SPINES,
  resolveSpine,
  isSystemRoute,
  shouldShowBottomBar,
  spinePath,
} from "@/lib/navigation";

describe("navigation spine map", () => {
  it("has exactly 5 spines", () => {
    expect(SPINES).toHaveLength(5);
  });

  it("resolves canonical routes to the expected spine", () => {
    expect(resolveSpine("/")).toBe("home");
    expect(resolveSpine("/today")).toBe("home");
    expect(resolveSpine("/search")).toBe("home");
    expect(resolveSpine("/channels")).toBe("home");
    expect(resolveSpine("/watch/abc123")).toBe("home");
    expect(resolveSpine("/shorts")).toBe("home");
    expect(resolveSpine("/quran")).toBe("quran");
    expect(resolveSpine("/quran/2")).toBe("quran");
    expect(resolveSpine("/mushaf")).toBe("quran");
    expect(resolveSpine("/khatm/groups")).toBe("quran");
    expect(resolveSpine("/prayer")).toBe("prayer");
    expect(resolveSpine("/qibla")).toBe("prayer");
    expect(resolveSpine("/mosques")).toBe("prayer");
    expect(resolveSpine("/dhikr")).toBe("dhikr");
    expect(resolveSpine("/adhkar")).toBe("dhikr");
    expect(resolveSpine("/library")).toBe("dhikr");
    expect(resolveSpine("/library/ibn-qayyim")).toBe("dhikr");
    expect(resolveSpine("/hadith")).toBe("dhikr");
    expect(resolveSpine("/profile")).toBe("you");
    expect(resolveSpine("/bookmarks")).toBe("you");
    expect(resolveSpine("/plus")).toBe("you");
  });

  it("falls back to home for unknown routes", () => {
    expect(resolveSpine("/totally-unknown-path")).toBe("home");
  });

  it("recognises system routes", () => {
    expect(isSystemRoute("/login")).toBe(true);
    expect(isSystemRoute("/admin/users")).toBe(true);
    expect(isSystemRoute("/admin")).toBe(true);
    expect(isSystemRoute("/privacy")).toBe(true);
    expect(isSystemRoute("/prayer")).toBe(false);
  });

  it("hides the bottom bar on immersive surfaces", () => {
    expect(shouldShowBottomBar("/")).toBe(true);
    expect(shouldShowBottomBar("/prayer")).toBe(true);
    expect(shouldShowBottomBar("/watch/xyz")).toBe(false);
    expect(shouldShowBottomBar("/shorts")).toBe(false);
    expect(shouldShowBottomBar("/mushaf/12")).toBe(false);
    expect(shouldShowBottomBar("/login")).toBe(false);
    expect(shouldShowBottomBar("/onboarding")).toBe(false);
  });

  it("returns canonical entry paths for each spine", () => {
    expect(spinePath("home")).toBe("/");
    expect(spinePath("quran")).toBe("/quran");
    expect(spinePath("prayer")).toBe("/prayer");
    expect(spinePath("dhikr")).toBe("/dhikr");
    expect(spinePath("you")).toBe("/profile");
  });
});
