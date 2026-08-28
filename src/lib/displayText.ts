/**
 * Display-only text helpers for the feed.
 *
 * Many trusted channels publish bilingual titles where the same sentence is
 * repeated in the local script and in English, separated by a pipe or dash
 * (e.g. "সূরা আল-বাকারা: ১২১-১২৬ | Surah Al-Baqara: 121-126"). When the
 * viewer's interface language is English we show the Latin-script side so the
 * chrome around every card reads in one language, while the actual video and
 * its audio stay untouched.
 *
 * Pure functions — no React, no network, safe to unit test.
 */

const SEPARATORS = /\s*[|｜–—]\s*/;

/** Share of characters that belong to the Latin alphabet (ignores digits/punctuation). */
function latinRatio(text: string): number {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (!letters) return 0;
  const latin = letters.match(/\p{Script=Latin}/gu)?.length ?? 0;
  return latin / letters.length;
}

/** True when the segment is mostly Latin script (English/transliteration). */
export function isLatinText(text: string): boolean {
  return latinRatio(text) >= 0.7;
}

/**
 * Pick the English/Latin part of a bilingual, separator-joined string.
 * Returns the original text when there is no separate Latin segment, or when
 * the interface language is not Latin-script itself (an Arabic UI should keep
 * the Arabic side).
 */
export function preferLatinSegment(text: string | null | undefined, uiLocale = "en"): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  // Only fold to English when the UI itself is English.
  if (!uiLocale.toLowerCase().startsWith("en")) return raw;
  if (isLatinText(raw)) return raw;

  const parts = raw
    .split(SEPARATORS)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return raw;

  const latin = parts.filter((p) => isLatinText(p) && p.replace(/[^\p{L}]/gu, "").length >= 3);
  if (latin.length === 0) return raw;
  // Prefer the longest Latin segment — it carries the most meaning.
  return latin.reduce((a, b) => (b.length > a.length ? b : a));
}
