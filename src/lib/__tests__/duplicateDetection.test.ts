import { describe, it, expect } from "vitest";
import {
  computeOwnerKey,
  detectDuplicate,
  duplicateRiskLevel,
  titleSimilarity,
} from "@/lib/duplicateDetection";

describe("computeOwnerKey", () => {
  it("normalizes case, punctuation, and marketing suffixes", () => {
    expect(computeOwnerKey("Mufti Menk Official")).toBe(computeOwnerKey("Mufti Menk TV"));
    expect(computeOwnerKey("Nouman Ali Khan HD")).toBe(computeOwnerKey("Nouman Ali Khan"));
    expect(computeOwnerKey("BayyinahTV")).toBe(computeOwnerKey("Bayyinah"));
    expect(computeOwnerKey("Al-Kauthar Institute")).toBe("alkautharinstitute");
  });

  it("strips backup / archive / channel / numeric suffixes", () => {
    expect(computeOwnerKey("Yasir Qadhi 2")).toBe(computeOwnerKey("Yasir Qadhi"));
    expect(computeOwnerKey("Zaytuna Backup")).toBe(computeOwnerKey("Zaytuna"));
    expect(computeOwnerKey("Assim Al Hakeem Archive")).toBe(computeOwnerKey("Assim Al Hakeem"));
  });

  it("returns empty for null/empty input", () => {
    expect(computeOwnerKey(null)).toBe("");
    expect(computeOwnerKey("")).toBe("");
  });
});

describe("titleSimilarity", () => {
  it("scores identical strings ~1", () => {
    expect(titleSimilarity("Mufti Menk", "Mufti Menk")).toBeGreaterThan(0.99);
  });
  it("scores near-duplicate high", () => {
    expect(titleSimilarity("Mufti Menk Official", "Mufti Menk")).toBeGreaterThan(0.4);
  });
  it("scores unrelated titles low", () => {
    expect(titleSimilarity("Mufti Menk", "Kurzgesagt")).toBeLessThan(0.15);
  });
});

describe("detectDuplicate", () => {
  const existing = [
    { youtube_channel_id: "UC_MUFTI", title: "Mufti Menk", owner_key: "muftimenk" },
    { youtube_channel_id: "UC_NAK", title: "Nouman Ali Khan", owner_key: "noumanalikhan" },
  ];

  it("catches exact channel-id duplicates", () => {
    const m = detectDuplicate(
      { youtube_channel_id: "UC_MUFTI", title: "Some other name" },
      existing,
    );
    expect(m?.matchType).toBe("exact_id");
    expect(duplicateRiskLevel(m)).toBe("high");
  });

  it("catches alias/backup channels via owner_key", () => {
    const m = detectDuplicate(
      { youtube_channel_id: "UC_NEW", title: "Mufti Menk Backup", handle: "MuftiMenkTV" },
      existing,
    );
    expect(m?.matchType).toBe("owner_key");
    expect(duplicateRiskLevel(m)).toBe("high");
  });

  it("catches renamed/typo duplicates via trigram similarity", () => {
    const m = detectDuplicate(
      { youtube_channel_id: "UC_NEW2", title: "Nouman Ali Kahn" },
      existing,
    );
    expect(m?.matchType).toBe("title_similarity");
    expect(duplicateRiskLevel(m)).toBe("medium");
  });

  it("passes a genuinely new channel", () => {
    const m = detectDuplicate(
      { youtube_channel_id: "UC_NEW3", title: "Kurzgesagt In a Nutshell", handle: "kurzgesagt" },
      existing,
    );
    expect(m).toBeNull();
    expect(duplicateRiskLevel(m)).toBe("low");
  });
});
