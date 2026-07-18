import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface FeedDiversityValue {
  /**
   * Legacy: cross-section dedup set. Kept for backwards compatibility with
   * any consumer that still reads it, but sections no longer filter against
   * it — each row must be able to reach its own 100-item target.
   */
  seenVideoIds: React.MutableRefObject<Set<string>>;
  /** Max videos allowed per channel within a single section. */
  perChannelCap: number;
  /** When true, tighter cap (1) for max channel diversity. */
  showMoreChannels: boolean;
  toggleShowMoreChannels: () => void;
  setShowMoreChannels: (v: boolean) => void;
  /** Bumped when toggle changes — sections key off this to recompute filter. */
  resetKey: number;
}

const STORAGE_KEY = "heartify:showMoreChannels";
const EVENT_NAME = "heartify:showMoreChannels:change";

const readInitial = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const FeedDiversityContext = createContext<FeedDiversityValue | null>(null);

export const FeedDiversityProvider = ({ children }: { children: ReactNode }) => {
  const seenVideoIds = useRef<Set<string>>(new Set());
  const [showMoreChannels, setShowMoreChannelsState] = useState<boolean>(readInitial);
  const [resetKey, setResetKey] = useState(0);

  const applyChange = useCallback((next: boolean) => {
    seenVideoIds.current = new Set();
    setShowMoreChannelsState(next);
    setResetKey((k) => k + 1);
  }, []);

  const setShowMoreChannels = useCallback(
    (v: boolean) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
      } catch {
        // ignore
      }
      applyChange(v);
      try {
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: v }));
      } catch {
        // ignore
      }
    },
    [applyChange],
  );

  const toggleShowMoreChannels = useCallback(() => {
    setShowMoreChannels(!showMoreChannels);
  }, [setShowMoreChannels, showMoreChannels]);

  // Sync when the setting is changed elsewhere (e.g. Profile page).
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      const next = typeof detail === "boolean" ? detail : readInitial();
      applyChange(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) applyChange(e.newValue === "1");
    };
    window.addEventListener(EVENT_NAME, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [applyChange]);

  const perChannelCap = showMoreChannels ? 1 : 3;

  return (
    <FeedDiversityContext.Provider
      value={{
        seenVideoIds,
        perChannelCap,
        showMoreChannels,
        toggleShowMoreChannels,
        setShowMoreChannels,
        resetKey,
      }}
    >
      {children}
    </FeedDiversityContext.Provider>
  );
};

export const useFeedDiversity = () => {
  const ctx = useContext(FeedDiversityContext);
  const empty = useRef(new Set<string>());
  if (!ctx) {
    // Fallback: no-op context so component still works standalone.
    // Respect the persisted setting so cap math stays consistent.
    const persisted = readInitial();
    return {
      seenVideoIds: empty,
      perChannelCap: persisted ? 1 : 3,
      showMoreChannels: persisted,
      toggleShowMoreChannels: () => {},
      setShowMoreChannels: () => {},
      resetKey: 0,
    } as FeedDiversityValue;
  }
  return ctx;
};

/** Standalone hook for surfaces (e.g. Profile) that only need to read/write the pref
 *  without being wrapped in FeedDiversityProvider. Persists + broadcasts changes. */
export const useShowMoreChannelsSetting = (): [boolean, (v: boolean) => void] => {
  const [value, setValue] = useState<boolean>(readInitial);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setValue(typeof detail === "boolean" ? detail : readInitial());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setValue(e.newValue === "1");
    };
    window.addEventListener(EVENT_NAME, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
    setValue(v);
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: v }));
    } catch {
      // ignore
    }
  }, []);

  return [value, update];
};
