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
    expect(resolveSpine("/channels")).toBe("watch");
    expect(resolveSpine("/watch/abc123")).toBe("watch");
    expect(resolveSpine("/shorts")).toBe("watch");
    expect(resolveSpine("/prayer")).toBe("practice");
    expect(resolveSpine("/quran/2")).toBe("practice");
    expect(resolveSpine("/dhikr")).toBe("practice");
    expect(resolveSpine("/khatm/groups")).toBe("practice");
    expect(resolveSpine("/learn")).toBe("learn");
    expect(resolveSpine("/library")).toBe("learn");
    expect(resolveSpine("/library/ibn-qayyim")).toBe("learn");
    expect(resolveSpine("/hadith")).toBe("learn");
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
    expect(spinePath("watch")).toBe("/channels");
    expect(spinePath("practice")).toBe("/prayer");
    expect(spinePath("learn")).toBe("/learn");
    expect(spinePath("you")).toBe("/profile");
  });
});
