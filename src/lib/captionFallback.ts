/**
 * Caption fallback rules.
 *
 * A viewer's native lane comes first: if a caption track exists in their
 * primary content language we always select it. When it doesn't, we degrade in
 * a predictable order rather than showing nothing — the UI reports which rule
 * fired so the viewer knows *why* they are reading a translated subtitle.
 */
export type CaptionResolutionReason =
  | "native"
  | "native_translated"
  | "ui_language"
  | "content_language"
  | "any_translated"
  | "any"
  | "none";

export interface CaptionCandidate {
  language: string;
  source: string;
}

export interface CaptionResolution<T extends CaptionCandidate> {
  track: T | null;
  reason: CaptionResolutionReason;
}

const base = (code: string | null | undefined) =>
  (code ?? "").split(/[-_]/)[0].toLowerCase();

/**
 * Resolve the track to show. `preferred` (an explicit picker choice) always
 * wins when the track still exists; otherwise the fallback chain runs.
 */
export function resolveCaptionTrack<T extends CaptionCandidate>(
  tracks: readonly T[],
  opts: {
    preferred?: string | null;
    nativeLanguage?: string | null;
    uiLanguage?: string | null;
    contentLanguage?: string | null;
  },
): CaptionResolution<T> {
  const list = tracks.filter((t) => t.language);
  if (list.length === 0) return { track: null, reason: "none" };

  const find = (code: string | null | undefined) =>
    code ? list.find((t) => base(t.language) === base(code)) ?? null : null;

  if (opts.preferred) {
    const exact = find(opts.preferred);
    if (exact) {
      return {
        track: exact,
        reason: base(exact.language) === base(opts.nativeLanguage)
          ? exact.source === "mt"
            ? "native_translated"
            : "native"
          : exact.source === "mt"
            ? "any_translated"
            : "any",
      };
    }
  }

  const native = find(opts.nativeLanguage);
  if (native) {
    return { track: native, reason: native.source === "mt" ? "native_translated" : "native" };
  }

  const ui = find(opts.uiLanguage);
  if (ui) return { track: ui, reason: "ui_language" };

  const content = find(opts.contentLanguage);
  if (content) return { track: content, reason: "content_language" };

  const translated = list.find((t) => t.source === "mt");
  if (translated) return { track: translated, reason: "any_translated" };

  return { track: list[0], reason: "any" };
}

export function captionReasonLabel(
  reason: CaptionResolutionReason,
  languageName: string,
): string {
  switch (reason) {
    case "native":
      return `Captions in ${languageName}`;
    case "native_translated":
      return `Translated captions in ${languageName}`;
    case "ui_language":
      return `No native track — showing ${languageName} (your app language)`;
    case "content_language":
      return `No native track — showing the original ${languageName} track`;
    case "any_translated":
      return `No native track — showing translated ${languageName} captions`;
    case "any":
      return `Showing ${languageName} captions`;
    default:
      return "No captions available yet";
  }
}
