// App icon — Heartify ships a single official brand icon. Alternate icon
// variants were removed on purpose: the mark must always be the exact
// Heartify logo, everywhere (browser tab, home screen, share cards).

export const OFFICIAL_APP_ICON = "/favicon.png";

/**
 * Ensure the browser tab / apple-touch icon point at the official logo.
 * Idempotent — safe to call on every app boot.
 */
export function applyIconToDocument(): void {
  if (typeof document === "undefined") return;
  const existing = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  if (existing) existing.href = OFFICIAL_APP_ICON;
  else {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = OFFICIAL_APP_ICON;
    document.head.appendChild(link);
  }
}
