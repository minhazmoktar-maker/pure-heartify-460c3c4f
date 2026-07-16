import { useEffect } from "react";

/**
 * Phase M3 — Keyboard-aware focus scroll.
 *
 * When a text input, textarea, or contentEditable field gains focus on a
 * touch device, the on-screen keyboard often covers the field. We scroll it
 * into the visible viewport (visualViewport-aware when available) so users
 * can see what they're typing without manual panning.
 *
 * Behavior:
 *   • Only fires on coarse pointers (touch). Desktop is untouched.
 *   • Uses `scrollIntoView({ block: "center", behavior: "smooth" })` unless
 *     the user prefers reduced motion — then it's instant.
 *   • Debounced through requestAnimationFrame so it runs after the browser
 *     has resized for the keyboard.
 *   • Skips fields already fully visible above the keyboard fold.
 */
export default function KeyboardFocusScroller() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      const editable = (el as HTMLElement).isContentEditable;
      const isField =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        editable === true;
      if (!isField) return;

      // Skip range/checkbox/radio/button-style inputs — no keyboard.
      if (tag === "INPUT") {
        const type = (el as HTMLInputElement).type;
        if (["checkbox", "radio", "button", "submit", "range", "color", "file"].includes(type)) return;
      }

      // Two RAFs so we run after layout stabilises post keyboard-open.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const vv = window.visualViewport;
          const vh = vv?.height ?? window.innerHeight;
          const offsetTop = vv?.offsetTop ?? 0;
          const visibleTop = offsetTop + 16;
          const visibleBottom = offsetTop + vh - 16;
          if (rect.top >= visibleTop && rect.bottom <= visibleBottom) return;
          try {
            el.scrollIntoView({
              block: "center",
              behavior: reduced ? "auto" : "smooth",
            });
          } catch {
            el.scrollIntoView();
          }
        });
      });
    };

    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, []);

  return null;
}
