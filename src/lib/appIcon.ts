// Phase 10 — User-selectable app icon.
// On the web, we swap the browser tab favicon <link>. On native Capacitor,
// we dynamically import `capacitor-app-icon` if it's installed — this is a
// no-op inside the sandbox and only takes effect on the installed native app.
//
// Icon assets live in /public/icons/. Keep IDs stable — they are stored in
// localStorage and referenced by the manifest on next boot.

export interface AppIconVariant {
  id: string;
  label: string;
  href: string;    // public path served from /public
  swatch: string;  // hex used for the picker preview when the icon fails to load
}

export const APP_ICON_VARIANTS: AppIconVariant[] = [
  { id: "default", label: "Emerald", href: "/app-icon-1024.png", swatch: "#10b981" },
  { id: "midnight", label: "Midnight", href: "/icons/app-icon-midnight.svg", swatch: "#0f172a" },
  { id: "gold",     label: "Gold",     href: "/icons/app-icon-gold.svg",     swatch: "#f59e0b" },
  { id: "rose",     label: "Rose",     href: "/icons/app-icon-rose.svg",     swatch: "#e11d48" },
];

const STORAGE_KEY = "heartify.app-icon.v1";

export function getSelectedIconId(): string {
  if (typeof window === "undefined") return APP_ICON_VARIANTS[0].id;
  try { return localStorage.getItem(STORAGE_KEY) ?? APP_ICON_VARIANTS[0].id; } catch { return APP_ICON_VARIANTS[0].id; }
}

/**
 * Update the browser tab favicon to the chosen variant. Idempotent — safe to
 * call on every app boot.
 */
export function applyIconToDocument(id: string): void {
  if (typeof document === "undefined") return;
  const variant = APP_ICON_VARIANTS.find((v) => v.id === id) ?? APP_ICON_VARIANTS[0];
  const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (existing) existing.href = variant.href;
  else {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = variant.href;
    document.head.appendChild(link);
  }
  const apple = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (apple) apple.href = variant.href;
}

export async function setAppIcon(id: string): Promise<void> {
  const variant = APP_ICON_VARIANTS.find((v) => v.id === id) ?? APP_ICON_VARIANTS[0];
  try { localStorage.setItem(STORAGE_KEY, variant.id); } catch { /* noop */ }
  applyIconToDocument(variant.id);
  // Native icon change — best-effort, only present when the app is packaged
  // with the optional capacitor-app-icon plugin. Wrapped in a runtime require
  // so bundlers don't require the module at build time.
  try {
    // deno-lint-ignore no-explicit-any
    const dyn = (0, eval)("import") as (m: string) => Promise<any>;
    const mod = await dyn("capacitor-app-icon").catch(() => null);
    // deno-lint-ignore no-explicit-any
    const plugin: any = mod?.AppIcon ?? mod?.default ?? null;
    if (plugin?.change) await plugin.change({ name: variant.id, suppressNotification: true });
  } catch { /* not installed / not native — ignore */ }
}
