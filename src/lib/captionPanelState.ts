/**
 * Per-upload caption review panel state.
 *
 * A creator reviewing ten uploads sets things up differently per video: an
 * Arabic track wants RTL mirroring and a bigger text scale, a noisy screen
 * recording wants high contrast, and the editor may be left open. That state is
 * remembered per upload id so closing a panel and coming back later — or
 * switching to another upload and returning — restores exactly what was set.
 *
 * Stored in localStorage (device-local, synchronous, survives reloads) and
 * bounded to the most recent uploads so it can never grow without limit.
 */
export interface CaptionPanelState {
  /** Selected caption track language (null = first available). */
  language: string | null;
  /** Inline timing/text editor open. */
  editing: boolean;
  /** Mirror alignment for RTL caption languages. */
  mirrorRtl: boolean;
  /** Caption text scale multiplier (0.8 – 2.4). */
  textScale: number;
  /** Accessibility high-contrast caption plate. */
  highContrast: boolean;
}

export const DEFAULT_CAPTION_PANEL_STATE: CaptionPanelState = {
  language: null,
  editing: false,
  mirrorRtl: true,
  textScale: 1,
  highContrast: false,
};

const STORAGE_KEY = "heartify:caption-panel-state";
/** Keep the newest N uploads only. */
const MAX_ENTRIES = 40;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeCaptionPanelState(raw: unknown): CaptionPanelState {
  const v = (raw ?? {}) as Partial<CaptionPanelState>;
  return {
    language: typeof v.language === "string" && v.language ? v.language : null,
    editing: v.editing === true,
    mirrorRtl: v.mirrorRtl !== false,
    textScale: clamp(Number(v.textScale) || DEFAULT_CAPTION_PANEL_STATE.textScale, 0.8, 2.4),
    highContrast: v.highContrast === true,
  };
}

type Store = Record<string, CaptionPanelState & { updatedAt: number }>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  const entries = Object.entries(store)
    .sort((a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0))
    .slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* private mode — state stays for this render only */
  }
}

/** Saved state for one upload, falling back to defaults. */
export function loadCaptionPanelState(uploadId: string): CaptionPanelState {
  return normalizeCaptionPanelState(readStore()[uploadId]);
}

/** Merge a patch into one upload's saved state and return the result. */
export function saveCaptionPanelState(
  uploadId: string,
  patch: Partial<CaptionPanelState>,
): CaptionPanelState {
  const store = readStore();
  const next = normalizeCaptionPanelState({ ...loadCaptionPanelState(uploadId), ...patch });
  store[uploadId] = { ...next, updatedAt: Date.now() };
  writeStore(store);
  return next;
}

/** QA/settings helper — forget every remembered panel. */
export function clearCaptionPanelState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
