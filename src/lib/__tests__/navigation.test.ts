import { describe, it, expect } from "vitest";
import {
  SPINES,
  resolveSpine,
  isSystemRoute,
  shouldShowBottomBar,
  spinePath,
} from "@/lib/navigation";

describe("navigation spine map", () => {
  it("has exactly 4 spines (Home · Explore · Library · Profile)", () => {
    expect(SPINES).toHaveLength(4);
    expect(SPINES.map((s) => s.id)).toEqual(["home", "explore", "library", "profile"]);
  });

  it("resolves canonical routes to the expected spine", () => {
    // Home spine — video-first front door
    expect(resolveSpine("/")).toBe("home");
    expect(resolveSpine("/today")).toBe("home");
    expect(resolveSpine("/watch/abc123")).toBe("home");
    expect(resolveSpine("/shorts")).toBe("home");

    // Explore spine — search, channels, supporting Islamic study surfaces
    expect(resolveSpine("/explore")).toBe("explore");
    expect(resolveSpine("/search")).toBe("explore");
    expect(resolveSpine("/channels")).toBe("explore");
    expect(resolveSpine("/quran")).toBe("explore");
    expect(resolveSpine("/quran/2")).toBe("explore");
    expect(resolveSpine("/mushaf")).toBe("explore");
    expect(resolveSpine("/khatm/groups")).toBe("explore");
    expect(resolveSpine("/prayer")).toBe("explore");
    expect(resolveSpine("/qibla")).toBe("explore");
    expect(resolveSpine("/mosques")).toBe("explore");
    expect(resolveSpine("/dhikr")).toBe("explore");
    expect(resolveSpine("/adhkar")).toBe("explore");
    expect(resolveSpine("/library")).toBe("explore");
    expect(resolveSpine("/library/ibn-qayyim")).toBe("explore");
    expect(resolveSpine("/hadith")).toBe("explore");

    // Library spine — user's video investment
    expect(resolveSpine("/me")).toBe("library");
    expect(resolveSpine("/playlists")).toBe("library");
    expect(resolveSpine("/bookmarks")).toBe("library");
    expect(resolveSpine("/offline")).toBe("library");

    // Profile spine — identity + settings
    expect(resolveSpine("/profile")).toBe("profile");
    expect(resolveSpine("/achievements")).toBe("profile");
    expect(resolveSpine("/plus")).toBe("profile");
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
    expect(spinePath("explore")).toBe("/explore");
    expect(spinePath("library")).toBe("/me");
    expect(spinePath("profile")).toBe("/profile");
  });
});
