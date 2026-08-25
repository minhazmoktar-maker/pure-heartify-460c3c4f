/**
 * Client-side media inspection for creator uploads.
 *
 * Everything here is best-effort and runs before a single byte leaves the
 * device: it gives reviewers a thumbnail, an accurate duration and a language
 * hint so publishing is fast and the browsing surfaces look complete.
 */

/** Reads the intrinsic duration of a local video file. */
export async function probeDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.muted = true;
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    el.onloadedmetadata = () =>
      done(Number.isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration) : null);
    el.onerror = () => done(null);
    el.src = url;
    window.setTimeout(() => done(null), 10_000);
  });
}

export interface GeneratedThumbnail {
  blob: Blob;
  file: File;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Grabs a frame from the video and encodes it as JPEG. We sample at 12% of the
 * runtime (or 1s for very short clips) to avoid black intro frames.
 */
export async function generateThumbnail(
  file: File,
  durationSeconds?: number | null,
): Promise<GeneratedThumbnail | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement("video");
    el.preload = "metadata";
    el.muted = true;
    el.playsInline = true;
    el.crossOrigin = "anonymous";

    let settled = false;
    const finish = (value: GeneratedThumbnail | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };

    el.onloadedmetadata = () => {
      const dur = durationSeconds ?? (Number.isFinite(el.duration) ? el.duration : 0);
      el.currentTime = dur > 8 ? Math.min(dur * 0.12, 60) : Math.min(1, Math.max(dur - 0.1, 0));
    };

    el.onseeked = () => {
      try {
        const maxWidth = 1280;
        const scale = el.videoWidth > maxWidth ? maxWidth / el.videoWidth : 1;
        const width = Math.max(2, Math.round(el.videoWidth * scale));
        const height = Math.max(2, Math.round(el.videoHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(el, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        canvas.toBlob(
          (blob) => {
            if (!blob) return finish(null);
            finish({
              blob,
              file: new File([blob], "thumb.jpg", { type: "image/jpeg" }),
              dataUrl,
              width,
              height,
            });
          },
          "image/jpeg",
          0.82,
        );
      } catch {
        finish(null);
      }
    };

    el.onerror = () => finish(null);
    el.src = url;
    window.setTimeout(() => finish(null), 15_000);
  });
}

const SCRIPT_RANGES: Array<{ code: string; re: RegExp }> = [
  { code: "bn", re: /[\u0980-\u09FF]/ },
  { code: "hi", re: /[\u0900-\u097F]/ },
  { code: "ar", re: /[\u0600-\u06FF\u0750-\u077F]/ },
  { code: "zh", re: /[\u4E00-\u9FFF]/ },
  { code: "ja", re: /[\u3040-\u30FF]/ },
  { code: "ko", re: /[\uAC00-\uD7AF]/ },
];

/** Urdu/Farsi/Pashto share the Arabic block — these letters disambiguate. */
const URDU_HINTS = /[ۂۃےٹڈڑںھۓ]/;
const FARSI_HINTS = /[پچژگ]/;

export interface LanguageGuess {
  code: string;
  confidence: number;
}

/** Script-based language hint for a title/description pair. */
export function detectLanguage(text: string): LanguageGuess | null {
  const sample = (text ?? "").trim();
  if (sample.length < 3) return null;

  for (const { code, re } of SCRIPT_RANGES) {
    if (!re.test(sample)) continue;
    if (code === "ar") {
      if (URDU_HINTS.test(sample)) return { code: "ur", confidence: 0.85 };
      if (FARSI_HINTS.test(sample)) return { code: "fa", confidence: 0.75 };
      return { code: "ar", confidence: 0.8 };
    }
    return { code, confidence: 0.85 };
  }

  // Latin script: only claim a guess when it is clearly one of the languages we
  // actually serve, otherwise stay quiet rather than mislabel.
  const lower = sample.toLowerCase();
  const latinHints: Array<[string, RegExp]> = [
    ["id", /\b(dan|yang|untuk|adalah|kajian|ceramah)\b/],
    ["ms", /\b(dan|yang|untuk|ialah|kuliah|tazkirah)\b/],
    ["tr", /\b(ve|bir|için|değil|hutbe|sohbet)\b/],
    ["fr", /\b(le|la|les|pour|dans|conférence)\b/],
    ["es", /\b(el|la|los|para|conferencia|charla)\b/],
  ];
  for (const [code, re] of latinHints) {
    if (re.test(lower)) return { code, confidence: 0.55 };
  }
  return { code: "en", confidence: 0.5 };
}

/** Formats seconds as m:ss / h:mm:ss. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** Builds a CSV string with proper escaping. */
export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (rows.length === 0) return "";
  const cols = columns ?? Object.keys(rows[0]);
  const escape = (value: unknown) => {
    if (value == null) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

/** Triggers a browser download for generated report text. */
export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
