/**
 * Viewer-facing caption display settings.
 *
 * Subtitles are read in very different conditions — a phone in bright sun, an
 * Arabic reader who wants right-to-left alignment, someone who needs a solid
 * backing plate to read at all — so font size, backing, line height and RTL
 * mirroring are user choices, persisted locally (no round-trip, works offline)
 * and shared across every surface through a storage-style broadcast event.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

export interface CaptionSettings {
  /** Multiplier applied to the base caption size (0.8 – 1.8). */
  fontScale: number;
  background: "none" | "soft" | "solid";
  /** CSS line-height (1.1 – 2.0). */
  lineHeight: number;
  /** Mirror alignment for RTL caption languages (Arabic, Urdu, Farsi, Pashto). */
  mirrorRtl: boolean;
  /** Master switch for the styled caption overlay. */
  enabled: boolean;
}

export const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  fontScale: 1,
  background: "soft",
  lineHeight: 1.4,
  mirrorRtl: true,
  enabled: true,
};

const STORAGE_KEY = "heartify:caption-settings";
const EVENT = "heartify:caption-settings-changed";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeCaptionSettings(raw: unknown): CaptionSettings {
  const value = (raw ?? {}) as Partial<CaptionSettings>;
  const background =
    value.background === "none" || value.background === "solid" || value.background === "soft"
      ? value.background
      : DEFAULT_CAPTION_SETTINGS.background;
  return {
    fontScale: clamp(Number(value.fontScale) || DEFAULT_CAPTION_SETTINGS.fontScale, 0.8, 1.8),
    background,
    lineHeight: clamp(Number(value.lineHeight) || DEFAULT_CAPTION_SETTINGS.lineHeight, 1.1, 2),
    mirrorRtl: value.mirrorRtl !== false,
    enabled: value.enabled !== false,
  };
}

function read(): CaptionSettings {
  if (typeof window === "undefined") return DEFAULT_CAPTION_SETTINGS;
  try {
    return normalizeCaptionSettings(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}"));
  } catch {
    return DEFAULT_CAPTION_SETTINGS;
  }
}

/** Inline styles for a caption line, derived from the viewer's settings. */
export function captionLineStyle(
  settings: CaptionSettings,
  rtl: boolean,
): React.CSSProperties {
  const backgrounds: Record<CaptionSettings["background"], string> = {
    none: "transparent",
    soft: "hsl(var(--background) / 0.62)",
    solid: "hsl(var(--background) / 0.94)",
  };
  return {
    fontSize: `${(settings.fontScale * 100).toFixed(0)}%`,
    lineHeight: settings.lineHeight,
    backgroundColor: backgrounds[settings.background],
    textShadow: settings.background === "none" ? "0 1px 3px rgba(0,0,0,0.85)" : undefined,
    textAlign: rtl && settings.mirrorRtl ? "right" : "center",
    direction: rtl && settings.mirrorRtl ? "rtl" : "ltr",
  };
}

export function useCaptionSettings() {
  const [settings, setSettings] = useState<CaptionSettings>(read);

  useEffect(() => {
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<CaptionSettings>) => {
    const next = normalizeCaptionSettings({ ...read(), ...patch });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* private mode — settings stay in memory for this session */
    }
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSettings(DEFAULT_CAPTION_SETTINGS);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
}
