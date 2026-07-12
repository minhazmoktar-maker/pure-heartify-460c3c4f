import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";

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
  /** Bumped when toggle changes — sections key off this to recompute filter. */
  resetKey: number;
}

const FeedDiversityContext = createContext<FeedDiversityValue | null>(null);

export const FeedDiversityProvider = ({ children }: { children: ReactNode }) => {
  const seenVideoIds = useRef<Set<string>>(new Set());
  const [showMoreChannels, setShowMoreChannels] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const toggleShowMoreChannels = useCallback(() => {
    seenVideoIds.current = new Set();
    setShowMoreChannels((v) => !v);
    setResetKey((k) => k + 1);
  }, []);

  const perChannelCap = showMoreChannels ? 1 : 3;

  return (
    <FeedDiversityContext.Provider
      value={{ seenVideoIds, perChannelCap, showMoreChannels, toggleShowMoreChannels, resetKey }}
    >
      {children}
    </FeedDiversityContext.Provider>
  );
};

export const useFeedDiversity = () => {
  const ctx = useContext(FeedDiversityContext);
  if (!ctx) {
    // Fallback: no-op context so component still works standalone
    const empty = useRef(new Set<string>());
    return {
      seenVideoIds: empty,
      perChannelCap: 3,
      showMoreChannels: false,
      toggleShowMoreChannels: () => {},
      resetKey: 0,
    } as FeedDiversityValue;
  }
  return ctx;
};
