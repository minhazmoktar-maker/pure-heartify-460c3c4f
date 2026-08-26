/**
 * Viewer-facing caption display settings.
 *
 * Subtitles are read in very different conditions — a phone in bright sun, an
 * Arabic reader who wants right-to-left alignment, someone with low vision who
 * needs a high-contrast plate and a heavy text edge — so every dimension is a
 * user choice.
 *
 * Persistence is two-layer on purpose:
 *  1. `localStorage` is the source of truth for *this* device. It is synchronous,
 *     works offline, and is read before the first paint so captions never flash
 *     at the wrong size.
 *  2. When the viewer is signed in, the same object is mirrored to
 *     `user_caption_settings` so the preference follows them to the phone app,
 *     the tablet and the web. The remote row is hydrated once per page load and
 *     pushed back (debounced) on every change.
 *
 * All surfaces stay in sync through a storage-style broadcast event.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CaptionSizePreset = "small" | "medium" | "large" | "xlarge" | "custom";

export interface CaptionSettings {
  /** Multiplier applied to the base caption size (0.8 – 2.4). */
  fontScale: number;
  background: "none" | "soft" | "solid";
  /** CSS line-height (1.1 – 2.0). */
  lineHeight: number;
  /** Mirror alignment for RTL caption languages (Arabic, Urdu, Farsi, Pashto). */
  mirrorRtl: boolean;
  /** Master switch for the styled caption overlay. */
  enabled: boolean;
  /** Accessibility: maximum-contrast plate + heavier weight. */
  highContrast: boolean;
  /** Accessibility: opacity of the text outline/edge (0 = off, 1 = solid). */
  edgeOpacity: number;
  /** Named size step; `custom` means the slider was moved by hand. */
  sizePreset: CaptionSizePreset;
  /** Multiply the caption size by the OS/browser font-scaling factor. */
  followOsScaling: boolean;
}

export const CAPTION_SIZE_PRESETS: Record<Exclude<CaptionSizePreset, "custom">, number> = {
  small: 0.85,
  medium: 1,
  large: 1.35,
  xlarge: 1.7,
};

export const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  fontScale: 1,
  background: "soft",
  lineHeight: 1.4,
  mirrorRtl: true,
  enabled: true,
  highContrast: false,
  edgeOpacity: 0.55,
  sizePreset: "medium",
  followOsScaling: true,
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
  const sizePreset: CaptionSizePreset =
    value.sizePreset === "small" ||
    value.sizePreset === "medium" ||
    value.sizePreset === "large" ||
    value.sizePreset === "xlarge" ||
    value.sizePreset === "custom"
      ? value.sizePreset
      : DEFAULT_CAPTION_SETTINGS.sizePreset;
  return {
    fontScale: clamp(Number(value.fontScale) || DEFAULT_CAPTION_SETTINGS.fontScale, 0.8, 2.4),
    background,
    lineHeight: clamp(Number(value.lineHeight) || DEFAULT_CAPTION_SETTINGS.lineHeight, 1.1, 2),
    mirrorRtl: value.mirrorRtl !== false,
    enabled: value.enabled !== false,
    highContrast: value.highContrast === true,
    edgeOpacity: clamp(
      typeof value.edgeOpacity === "number" ? value.edgeOpacity : DEFAULT_CAPTION_SETTINGS.edgeOpacity,
      0,
      1,
    ),
    sizePreset,
    followOsScaling: value.followOsScaling !== false,
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

function write(next: CaptionSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private mode — settings stay in memory for this session */
  }
}

/**
 * The OS / browser font-scaling factor, derived from the resolved root font
 * size. iOS Dynamic Type and Android font-size settings both surface here, so
 * a viewer who already asked for larger system text gets larger captions
 * without touching a second slider.
 */
export function osFontScale(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 1;
  try {
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize || "16");
    if (!Number.isFinite(root) || root <= 0) return 1;
    return clamp(root / 16, 0.75, 2);
  } catch {
    return 1;
  }
}

/** Final multiplier actually applied to caption text. */
export function effectiveCaptionScale(settings: CaptionSettings): number {
  const base = settings.sizePreset === "custom"
    ? settings.fontScale
    : CAPTION_SIZE_PRESETS[settings.sizePreset];
  return clamp(base * (settings.followOsScaling ? osFontScale() : 1), 0.7, 3);
}

/** A text-edge shadow at the requested opacity — the WCAG-friendly outline. */
function edgeShadow(opacity: number): string | undefined {
  if (opacity <= 0.02) return undefined;
  const c = `rgba(0,0,0,${opacity.toFixed(2)})`;
  return `0 0 2px ${c}, 1px 1px 2px ${c}, -1px 1px 2px ${c}, 1px -1px 2px ${c}, -1px -1px 2px ${c}`;
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
  const rtlActive = rtl && settings.mirrorRtl;
  const base: React.CSSProperties = {
    fontSize: `${(effectiveCaptionScale(settings) * 100).toFixed(0)}%`,
    lineHeight: settings.lineHeight,
    backgroundColor: backgrounds[settings.background],
    textShadow: edgeShadow(settings.edgeOpacity),
    textAlign: rtlActive ? "right" : "center",
    direction: rtlActive ? "rtl" : "ltr",
  };
  if (!settings.highContrast) return base;
  return {
    ...base,
    // Deliberately absolute values: high-contrast mode must not inherit theme
    // tokens, because the whole point is a guaranteed 21:1 pairing.
    color: "#ffffff",
    backgroundColor: "#000000",
    fontWeight: 600,
    letterSpacing: "0.01em",
    textShadow: undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Cross-device sync (signed-in viewers only)
 * ------------------------------------------------------------------ */

let hydrated = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;

async function currentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Pull the saved row once per page load and broadcast it to every surface. */
async function hydrateFromServer() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const userId = await currentUserId();
  if (!userId) return;
  try {
    const { data, error } = await supabase
      .from("user_caption_settings")
      .select("settings")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data?.settings) return;
    write(normalizeCaptionSettings(data.settings));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* offline or signed out — the local copy is authoritative */
  }
}

function pushToServer(next: CaptionSettings) {
  if (typeof window === "undefined") return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const userId = await currentUserId();
    if (!userId) return;
    try {
      await supabase.from("user_caption_settings").upsert(
        {
          user_id: userId,
          settings: next as unknown as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    } catch {
      /* best-effort — the device copy already applied */
    }
  }, 800);
}

export function useCaptionSettings() {
  const [settings, setSettings] = useState<CaptionSettings>(read);

  useEffect(() => {
    const sync = () => setSettings(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    void hydrateFromServer();
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Re-derive when the OS font scale changes (rotation, accessibility toggle).
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const onResize = () => setSettings(read());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const update = useCallback((patch: Partial<CaptionSettings>) => {
    const next = normalizeCaptionSettings({ ...read(), ...patch });
    write(next);
    setSettings(next);
    window.dispatchEvent(new Event(EVENT));
    pushToServer(next);
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setSettings(DEFAULT_CAPTION_SETTINGS);
    window.dispatchEvent(new Event(EVENT));
    pushToServer(DEFAULT_CAPTION_SETTINGS);
  }, []);

  return useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
}
