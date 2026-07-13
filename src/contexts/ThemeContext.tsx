import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveAutoTheme, nextThemeBoundary } from "@/lib/autoTheme";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  /** User preference — includes "auto". */
  mode: ThemeMode;
  /** Actual applied theme after resolving "auto". */
  theme: ResolvedTheme;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light",
  theme: "light",
  toggleTheme: () => {},
  setMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const MODE_KEY = "halaltube-theme"; // legacy key kept for backwards-compat

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(MODE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === "auto" ? resolveAutoTheme() : mode;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolve(readStoredMode()));

  // Apply theme class + persist mode
  useEffect(() => {
    const resolved = resolve(mode);
    setTheme(resolved);
    const root = document.documentElement;
    if (resolved === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem(MODE_KEY, mode); } catch { /* noop */ }
  }, [mode]);

  // Auto-mode: re-evaluate at the next sunrise/maghrib boundary without polling.
  useEffect(() => {
    if (mode !== "auto") return;
    let cancelled = false;
    const boundary = nextThemeBoundary();
    // Fall back to an hourly re-check when we have no location yet.
    const delay = boundary
      ? Math.max(30_000, boundary.getTime() - Date.now())
      : 60 * 60 * 1000;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      setTheme(resolveAutoTheme());
      // Force a mode-effect re-run by toggling state to itself.
      setModeState((m) => m);
    }, delay);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [mode, theme]);

  const toggleTheme = () => setModeState((m) => (m === "dark" ? "light" : "dark"));
  const setMode = (m: ThemeMode) => setModeState(m);

  return (
    <ThemeContext.Provider value={{ mode, theme, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
