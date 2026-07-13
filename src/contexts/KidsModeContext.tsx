import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface KidsModeCtx {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

const Ctx = createContext<KidsModeCtx | undefined>(undefined);
const STORAGE_KEY = "heartify:kids_mode";

export function KidsModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
      document.documentElement.dataset.kidsMode = enabled ? "on" : "off";
    } catch {
      /* noop */
    }
  }, [enabled]);

  const setEnabled = useCallback((v: boolean) => setEnabledState(v), []);
  const toggle = useCallback(() => setEnabledState((v) => !v), []);

  const value = useMemo(() => ({ enabled, toggle, setEnabled }), [enabled, toggle, setEnabled]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKidsMode(): KidsModeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useKidsMode must be used within KidsModeProvider");
  return ctx;
}

// Non-hook accessor for services (e.g. YouTube ranker) that run outside React.
export function isKidsModeActive(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
