import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";

/**
 * Cross-rail + infinite-grid deduplication.
 *
 * The seen-set is persisted in `sessionStorage` so that a video claimed by
 * one rail never re-appears when the user navigates away and returns to
 * Home, switches tabs, or reloads within the same session. The set is
 * bounded to prevent unbounded growth on very long sessions.
 *
 * Every attempted duplicate render is captured in a rolling audit buffer
 * (also in sessionStorage) that the /admin/dedup debug page reads back so
 * regressions surface immediately in production.
 */

const SEEN_STORAGE_KEY = "heartify:seenVideoIds";
const AUDIT_STORAGE_KEY = "heartify:dedupAudit";
const SHOW_MORE_STORAGE_KEY = "heartify:showMoreChannels";
const SHOW_MORE_EVENT = "heartify:showMoreChannels:change";
const RESET_EVENT = "heartify:dedup:reset";
const AUDIT_EVENT = "heartify:dedup:audit";
const SEEN_MAX = 5000; // rolling cap — 33 rails × ~15 items × several refreshes
const AUDIT_MAX = 200;

export interface DedupAuditEvent {
  id: string;
  videoId: string;
  attemptedFrom: string;
  claimedBy: string;
  at: number;
}

interface FeedDiversityValue {
  /**
   * Backwards-compatible mutable ref. Kept in sync with the persisted set
   * so callers that read it directly still work. Prefer `claim()` for new
   * code — it also records dedup audit events.
   */
  seenVideoIds: React.MutableRefObject<Set<string>>;
  /** Claim a single id for `source`. Returns true if this call won the claim. */
  claim: (videoId: string, source: string) => boolean;
  /** Bulk-claim; returns the ids this caller was the first to claim. */
  claimMany: <T extends { id: string }>(items: T[], source: string) => T[];
  /** Snapshot of currently-seen ids — safe to send to the server as exclude list. */
  getSeenSnapshot: () => string[];
  /** Wipe the entire session's dedup state (used by pull-to-refresh). */
  reset: () => void;
  /** Max videos allowed per channel within a single section. */
  perChannelCap: number;
  showMoreChannels: boolean;
  toggleShowMoreChannels: () => void;
  setShowMoreChannels: (v: boolean) => void;
  /** Bumped when reset()/toggle occurs — consumers key memos off this. */
  resetKey: number;
}

const FeedDiversityContext = createContext<FeedDiversityValue | null>(null);

const readShowMoreInitial = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SHOW_MORE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

// --- Session-persisted seen-set + owner map -------------------------------

interface PersistedSeen {
  ids: string[];
  owners: Record<string, string>;
}

const readPersistedSeen = (): PersistedSeen => {
  if (typeof window === "undefined") return { ids: [], owners: {} };
  try {
    const raw = window.sessionStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return { ids: [], owners: {} };
    const parsed = JSON.parse(raw) as Partial<PersistedSeen>;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids.slice(-SEEN_MAX) : [],
      owners: parsed.owners && typeof parsed.owners === "object" ? parsed.owners : {},
    };
  } catch {
    return { ids: [], owners: {} };
  }
};

const writePersistedSeen = (set: Set<string>, owners: Map<string, string>) => {
  if (typeof window === "undefined") return;
  try {
    const ids = Array.from(set).slice(-SEEN_MAX);
    const ownersOut: Record<string, string> = {};
    for (const id of ids) {
      const o = owners.get(id);
      if (o) ownersOut[id] = o;
    }
    window.sessionStorage.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify({ ids, owners: ownersOut }),
    );
  } catch {
    // sessionStorage may be full or blocked — dedup still works in-memory.
  }
};

// --- Audit ring buffer -----------------------------------------------------

const readAudit = (): DedupAuditEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-AUDIT_MAX) : [];
  } catch {
    return [];
  }
};

const appendAudit = (ev: DedupAuditEvent) => {
  if (typeof window === "undefined") return;
  try {
    const list = readAudit();
    list.push(ev);
    const trimmed = list.slice(-AUDIT_MAX);
    window.sessionStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(AUDIT_EVENT, { detail: ev }));
  } catch {
    // ignore
  }
  if (typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn(
      `[dedup] duplicate blocked: video=${ev.videoId} tried=${ev.attemptedFrom} already_in=${ev.claimedBy}`,
    );
  }
};

/** Read the full audit log — used by /admin/dedup. */
export const readDedupAudit = (): DedupAuditEvent[] => readAudit();

/** Clear the audit log. */
export const clearDedupAudit = () => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AUDIT_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(AUDIT_EVENT, { detail: null }));
  } catch {
    // ignore
  }
};

export const FeedDiversityProvider = ({ children }: { children: ReactNode }) => {
  // Hydrate from sessionStorage so cross-navigation dedup survives.
  const seenVideoIds = useRef<Set<string>>(new Set());
  const ownersRef = useRef<Map<string, string>>(new Map());
  const [showMoreChannels, setShowMoreChannelsState] = useState<boolean>(readShowMoreInitial);
  const [resetKey, setResetKey] = useState(0);

  // One-time hydration on mount.
  useEffect(() => {
    const persisted = readPersistedSeen();
    seenVideoIds.current = new Set(persisted.ids);
    ownersRef.current = new Map(Object.entries(persisted.owners));
  }, []);

  const flush = useCallback(() => {
    writePersistedSeen(seenVideoIds.current, ownersRef.current);
  }, []);

  const reset = useCallback(() => {
    seenVideoIds.current = new Set();
    ownersRef.current = new Map();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(SEEN_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    setResetKey((k) => k + 1);
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent(RESET_EVENT));
      } catch {
        // ignore
      }
    }
  }, []);

  const claim = useCallback(
    (videoId: string, source: string): boolean => {
      if (!videoId) return false;
      const set = seenVideoIds.current;
      if (set.has(videoId)) {
        const owner = ownersRef.current.get(videoId) ?? "unknown";
        if (owner !== source) {
          appendAudit({
            id: `${videoId}:${source}:${Date.now()}`,
            videoId,
            attemptedFrom: source,
            claimedBy: owner,
            at: Date.now(),
          });
        }
        return false;
      }
      set.add(videoId);
      ownersRef.current.set(videoId, source);
      return true;
    },
    [],
  );

  const claimMany = useCallback(
    <T extends { id: string }>(items: T[], source: string): T[] => {
      const out: T[] = [];
      for (const it of items) if (claim(it.id, source)) out.push(it);
      flush();
      return out;
    },
    [claim, flush],
  );

  const getSeenSnapshot = useCallback((): string[] => {
    return Array.from(seenVideoIds.current);
  }, []);

  const applyShowMoreChange = useCallback(
    (next: boolean) => {
      // Show-more-channels toggle changes the shape of the pool — reset
      // dedup so users see a fresh, un-claimed feed immediately.
      reset();
      setShowMoreChannelsState(next);
    },
    [reset],
  );

  const setShowMoreChannels = useCallback(
    (v: boolean) => {
      try {
        window.localStorage.setItem(SHOW_MORE_STORAGE_KEY, v ? "1" : "0");
      } catch {
        // ignore
      }
      applyShowMoreChange(v);
      try {
        window.dispatchEvent(new CustomEvent(SHOW_MORE_EVENT, { detail: v }));
      } catch {
        // ignore
      }
    },
    [applyShowMoreChange],
  );

  const toggleShowMoreChannels = useCallback(() => {
    setShowMoreChannels(!showMoreChannels);
  }, [setShowMoreChannels, showMoreChannels]);

  // Sync when the setting is changed elsewhere (e.g. Profile page).
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      const next = typeof detail === "boolean" ? detail : readShowMoreInitial();
      if (next !== showMoreChannels) applyShowMoreChange(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHOW_MORE_STORAGE_KEY) applyShowMoreChange(e.newValue === "1");
    };
    const onReset = () => setResetKey((k) => k + 1);
    window.addEventListener(SHOW_MORE_EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    window.addEventListener(RESET_EVENT, onReset);
    return () => {
      window.removeEventListener(SHOW_MORE_EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RESET_EVENT, onReset);
    };
  }, [applyShowMoreChange, showMoreChannels]);

  const perChannelCap = showMoreChannels ? 1 : 3;

  return (
    <FeedDiversityContext.Provider
      value={{
        seenVideoIds,
        claim,
        claimMany,
        getSeenSnapshot,
        reset,
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

export const useFeedDiversity = (): FeedDiversityValue => {
  const ctx = useContext(FeedDiversityContext);
  const empty = useRef(new Set<string>());
  if (!ctx) {
    const persisted = readShowMoreInitial();
    return {
      seenVideoIds: empty,
      claim: () => true,
      claimMany: <T extends { id: string }>(items: T[]) => items,
      getSeenSnapshot: () => [],
      reset: () => {},
      perChannelCap: persisted ? 1 : 3,
      showMoreChannels: persisted,
      toggleShowMoreChannels: () => {},
      setShowMoreChannels: () => {},
      resetKey: 0,
    };
  }
  return ctx;
};

/** Standalone hook for surfaces (e.g. Profile) that only need to read/write the pref
 *  without being wrapped in FeedDiversityProvider. Persists + broadcasts changes. */
export const useShowMoreChannelsSetting = (): [boolean, (v: boolean) => void] => {
  const [value, setValue] = useState<boolean>(readShowMoreInitial);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      setValue(typeof detail === "boolean" ? detail : readShowMoreInitial());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SHOW_MORE_STORAGE_KEY) setValue(e.newValue === "1");
    };
    window.addEventListener(SHOW_MORE_EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SHOW_MORE_EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((v: boolean) => {
    try {
      window.localStorage.setItem(SHOW_MORE_STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
    setValue(v);
    try {
      window.dispatchEvent(new CustomEvent(SHOW_MORE_EVENT, { detail: v }));
    } catch {
      // ignore
    }
  }, []);

  return [value, update];
};
