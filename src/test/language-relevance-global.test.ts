/**
 * Global language-relevance regression suite.
 *
 * Covers ten representative markets and several user profiles per market:
 * default (region-only), explicit multilingual, demonstrated cross-language
 * behaviour, subtitle-only comprehension, and low/high detection confidence.
 *
 * Guarantees locked in here:
 *  - explicit preferences outrank geographic assumptions;
 *  - unrelated-language content is downranked, never hard-blocked;
 *  - relevant multilingual + subtitled content stays discoverable;
 *  - the rules work for every market, not only Bangladesh.
 */

import { describe, expect, it } from "vitest";
import {
  MIN_LANGUAGE_RELEVANCE,
  languageRelevance,
  rankByLanguageRelevance,
  resolveContentLanguages,
} from "@/lib/languageRelevance";

const MARKETS: Array<{ country: string; device: string; expectPrimary: string }> = [
  { country: "BD", device: "bn", expectPrimary: "bn" },
  { country: "IN", device: "hi", expectPrimary: "hi" },
  { country: "PK", device: "ur", expectPrimary: "ur" },
  { country: "ID", device: "id", expectPrimary: "id" },
  { country: "MY", device: "ms", expectPrimary: "ms" },
  { country: "TR", device: "tr", expectPrimary: "tr" },
  { country: "SA", device: "ar", expectPrimary: "ar" },
  { country: "AE", device: "ar", expectPrimary: "ar" },
  { country: "US", device: "en", expectPrimary: "en" },
  { country: "GB", device: "en", expectPrimary: "en" },
];

const item = (
  language: string,
  extra: { conf?: number; subs?: string[] } = {},
) => ({
  language,
  languageConfidence: extra.conf,
  subtitleLanguages: extra.subs,
});

describe("language relevance — per-market defaults", () => {
  for (const m of MARKETS) {
    it(`${m.country}: local + universal languages lead, unrelated ones are downranked`, () => {
      const resolved = resolveContentLanguages({ country: m.country, deviceLanguage: m.device });

      // The market language is understood.
      expect(resolved.languages).toContain(m.expectPrimary);
      // English stays available everywhere (universal fallback).
      expect(resolved.languages).toContain("en");

      const local = languageRelevance(item(m.expectPrimary, { conf: 0.95 }), resolved);
      const unrelated = languageRelevance(item("zh", { conf: 0.95 }), resolved);
      expect(local).toBeGreaterThan(unrelated);
      // Never a hard block.
      expect(unrelated).toBeGreaterThanOrEqual(MIN_LANGUAGE_RELEVANCE);
    });
  }

  it("US/UK users get an English-first international mix, not a single-language lane", () => {
    const us = resolveContentLanguages({ country: "US", deviceLanguage: "en" });
    expect(us.languages[0]).toBe("en");
    expect(languageRelevance(item("ar", { conf: 0.9 }), us)).toBeGreaterThan(
      languageRelevance(item("id", { conf: 0.9 }), us),
    );
  });

  it("a Bangladesh default user ranks Bangla and English above unrelated languages", () => {
    const resolved = resolveContentLanguages({ country: "BD", deviceLanguage: "bn" });
    const ranked = rankByLanguageRelevance(
      [item("id"), item("zh"), item("en"), item("bn")],
      resolved,
    );
    expect(ranked[0].language).toBe("bn");
    expect(["en", "ar"]).toContain(ranked[1].language!);
  });
});

describe("language relevance — explicit preference wins over geography", () => {
  it("an explicit Indonesian preference in Bangladesh makes Indonesian lead", () => {
    const resolved = resolveContentLanguages({
      country: "BD",
      deviceLanguage: "bn",
      explicit: ["id", "en"],
    });
    expect(resolved.explicit).toBe(true);
    expect(resolved.primary).toBe("id");
    expect(languageRelevance(item("id", { conf: 0.9 }), resolved)).toBeGreaterThan(
      languageRelevance(item("bn", { conf: 0.9 }), resolved),
    );
  });

  it("an explicit English-only preference does not resurrect the regional language first", () => {
    const resolved = resolveContentLanguages({
      country: "TR",
      deviceLanguage: "tr",
      explicit: ["en"],
    });
    expect(resolved.languages[0]).toBe("en");
    expect(languageRelevance(item("en", { conf: 0.9 }), resolved)).toBeGreaterThan(
      languageRelevance(item("tr", { conf: 0.9 }), resolved),
    );
  });

  it("explicit multilingual preferences keep every chosen language strong", () => {
    const resolved = resolveContentLanguages({
      country: "IN",
      deviceLanguage: "en",
      explicit: ["ur", "hi", "en"],
    });
    for (const lang of ["ur", "hi", "en"]) {
      expect(languageRelevance(item(lang, { conf: 0.9 }), resolved)).toBeGreaterThan(0.6);
    }
  });
});

describe("language relevance — behaviour, subtitles and confidence", () => {
  it("demonstrated watching of another language makes it eligible", () => {
    const before = resolveContentLanguages({ country: "PK", deviceLanguage: "ur" });
    const after = resolveContentLanguages({
      country: "PK",
      deviceLanguage: "ur",
      behavior: { ar: 12 },
    });
    expect(after.sources.ar).toBe("behavior");
    expect(languageRelevance(item("ar", { conf: 0.9 }), after)).toBeGreaterThan(
      languageRelevance(item("ar", { conf: 0.9 }), before),
    );
  });

  it("a single incidental watch is not treated as comprehension", () => {
    const resolved = resolveContentLanguages({
      country: "MY",
      deviceLanguage: "ms",
      behavior: { ja: 1 },
    });
    expect(resolved.sources.ja).toBeUndefined();
  });

  it("subtitles in an understood language lift otherwise unrelated content", () => {
    const resolved = resolveContentLanguages({ country: "BD", deviceLanguage: "bn" });
    const bare = languageRelevance(item("zh", { conf: 0.95 }), resolved);
    const subtitled = languageRelevance(item("zh", { conf: 0.95, subs: ["bn"] }), resolved);
    expect(subtitled).toBeGreaterThan(bare);
    // Still below native audio in the user's own language.
    expect(subtitled).toBeLessThan(languageRelevance(item("bn", { conf: 0.95 }), resolved));
  });

  it("low-confidence detection lands between a confident match and a miss", () => {
    const resolved = resolveContentLanguages({ country: "SA", deviceLanguage: "ar" });
    const high = languageRelevance(item("ar", { conf: 0.98 }), resolved);
    const low = languageRelevance(item("ar", { conf: 0.15 }), resolved);
    expect(low).toBeLessThan(high);
    expect(low).toBeGreaterThan(MIN_LANGUAGE_RELEVANCE);
  });

  it("unknown/missing language metadata is never hard-blocked", () => {
    const resolved = resolveContentLanguages({ country: "ID", deviceLanguage: "id" });
    expect(languageRelevance({ language: null }, resolved)).toBeGreaterThanOrEqual(
      MIN_LANGUAGE_RELEVANCE,
    );
  });

  it("a much stronger video in a secondary language can still outrank a weak local one", () => {
    const resolved = resolveContentLanguages({ country: "BD", deviceLanguage: "bn" });
    const weakLocal = { ...item("bn", { conf: 0.9 }), q: 0.2 };
    const strongOther = { ...item("en", { conf: 0.9 }), q: 1 };
    const ranked = rankByLanguageRelevance([weakLocal, strongOther], resolved, (x) => x.q);
    expect(ranked[0]).toBe(strongOther);
  });
});
