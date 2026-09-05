import { describe, expect, it } from "vitest";
import {
  balanceByLanguage,
  derivePrimaryLanguage,
  diversifyByLanguage,
  LANGUAGE_SHARE,
  MIN_PRIMARY_LANGUAGE_SHARE,
  shareForLanguage,
} from "@/lib/languageBalance";

interface Item {
  id: string;
  lang: string;
}

const pool = (spec: Record<string, number>): Item[] => {
  const out: Item[] = [];
  for (const [lang, n] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) out.push({ id: `${lang}-${i}`, lang });
  }
  return out;
};

const langOf = (i: Item) => i.lang;

describe("per-language share tuning", () => {
  it("uses the tuned share per language, never below the floor", () => {
    expect(shareForLanguage("bn")).toBe(LANGUAGE_SHARE.bn);
    expect(shareForLanguage("ja")).toBe(LANGUAGE_SHARE.ja);
    expect(shareForLanguage("xx")).toBeGreaterThanOrEqual(MIN_PRIMARY_LANGUAGE_SHARE);
  });

  it("clamps the share to real local supply so thin languages never over-promise", () => {
    expect(shareForLanguage("bn", { localSupply: 2, window: 20 })).toBeCloseTo(0.1);
  });

  it("never floors English or Arabic as a primary language", () => {
    expect(derivePrimaryLanguage(["en", "ar"])).toBeNull();
    expect(derivePrimaryLanguage(["en", "bn"])).toBe("bn");
    expect(derivePrimaryLanguage(["id"])).toBe("id");
  });
});

describe("balanceByLanguage", () => {
  it("gives a deep local language the majority of the visible page", () => {
    const out = balanceByLanguage(pool({ en: 60, bn: 40 }), langOf, "bn", 20);
    const localInWindow = out.slice(0, 20).filter((i) => i.lang === "bn").length;
    expect(localInWindow).toBeGreaterThanOrEqual(14); // ~80%
  });

  it("keeps a lower — but still leading — share for multilingual markets", () => {
    const out = balanceByLanguage(pool({ en: 60, ja: 40 }), langOf, "ja", 20);
    const local = out.slice(0, 20).filter((i) => i.lang === "ja").length;
    expect(local).toBeGreaterThanOrEqual(9);
    expect(local).toBeLessThanOrEqual(12);
  });

  it("does not blank slots when local supply is thin", () => {
    const items = pool({ en: 30, sw: 3 });
    const out = balanceByLanguage(items, langOf, "sw", 20);
    expect(out).toHaveLength(items.length);
    expect(new Set(out.map((i) => i.id)).size).toBe(items.length);
  });

  it("stops one other language from taking every minority slot", () => {
    const out = balanceByLanguage(pool({ en: 80, ar: 10, tr: 10, bn: 20 }), langOf, "bn", 20);
    const minority = out.slice(0, 20).filter((i) => i.lang !== "bn");
    expect(new Set(minority.map((i) => i.lang)).size).toBeGreaterThanOrEqual(2);
  });
});

describe("diversifyByLanguage", () => {
  it("caps a dominant language to half of the lead slots", () => {
    const out = diversifyByLanguage(pool({ en: 20, ar: 5, tr: 5 }), langOf);
    const lead = out.slice(0, 20);
    expect(lead.filter((i) => i.lang === "en").length).toBeLessThanOrEqual(15);
    expect(out).toHaveLength(30);
  });

  it("is a no-op for a single language", () => {
    const items = pool({ en: 8 });
    expect(diversifyByLanguage(items, langOf)).toEqual(items);
  });
});
