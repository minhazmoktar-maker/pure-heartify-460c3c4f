/**
 * Halal-first clickbait heuristic.
 *
 * Used to suppress ALL-CAPS shouty titles (a strong proxy for ALL-CAPS
 * thumbnail overlay text since we don't OCR thumbnails on the client) and
 * common tabloid patterns like "SHOCKING", "YOU WON'T BELIEVE", "MUST WATCH".
 * Kept intentionally conservative — false positives hide real content, and
 * we err toward "let it through" for Arabic/Urdu titles which have no case.
 *
 * Returns `true` when the title should be suppressed from public rails.
 */
export function isClickbaitTitle(raw: string | undefined | null): boolean {
  if (!raw) return false;
  const title = raw.trim();
  if (title.length < 12) return false;

  // Latin letters only — Arabic/Urdu/Chinese have no upper/lower case so
  // the ALL-CAPS heuristic doesn't apply.
  const latinLetters = title.match(/[A-Za-z]/g);
  if (!latinLetters || latinLetters.length < 8) return false;

  const words = title.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  const capsWords = words.filter(
    (w) => w.length >= 3 && /^[A-Z0-9!?.'"-]+$/.test(w) && /[A-Z]/.test(w),
  );

  // Rule 1: three or more consecutive shouty words anywhere in the title.
  let run = 0;
  for (const w of words) {
    const shouty = w.length >= 3 && /^[A-Z0-9!?.'"-]+$/.test(w) && /[A-Z]/.test(w);
    if (shouty) {
      run++;
      if (run >= 3) return true;
    } else {
      run = 0;
    }
  }

  // Rule 2: >= 50% of eligible words are shouty AND >= 4 shouty words total.
  if (capsWords.length >= 4 && capsWords.length / words.length >= 0.5) return true;

  // Rule 3: explicit tabloid phrases.
  const lower = title.toLowerCase();
  const tabloid = [
    "you won't believe",
    "you wont believe",
    "shocking",
    "gone wrong",
    "must watch",
    "must see",
    "this changed my life",
    "will blow your mind",
    "insane reaction",
    "*emotional*",
    "😱",
    "🤯",
  ];
  if (tabloid.some((p) => lower.includes(p))) return true;

  // Rule 4: 3+ exclamation marks or 3+ trailing question marks.
  if ((title.match(/!/g) ?? []).length >= 3) return true;
  if (/\?{3,}/.test(title)) return true;

  return false;
}
