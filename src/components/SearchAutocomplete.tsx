/**
 * Real-time halal-filtered search autocomplete.
 *
 * - Triggers after 1 char, debounced ~180ms
 * - Combines trusted channels, categories, video titles, and popular past
 *   queries (via `search_autocomplete` RPC — strictly halal-filtered
 *   server-side, never calls YouTube's public autocomplete API).
 * - Keyboard: ArrowUp/Down navigates, Enter selects, Esc closes, Tab
 *   accepts highlighted suggestion.
 * - Match text is highlighted. Empty state shows recent + trending.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Clock, Flame, Hash, Tag, Users, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
} from "@/lib/recentSearches";
import { cn } from "@/lib/utils";

type SuggestionKind = "title" | "channel" | "category" | "popular" | "recent" | "trending";

interface Suggestion {
  text: string;
  kind: SuggestionKind;
  score?: number;
}

interface Props {
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  placeholder?: string;
  initialValue?: string;
  onSubmitQuery?: (q: string) => void;
  size?: "sm" | "md";
  submitButton?: boolean;
}

const DEBOUNCE_MS = 180;
const MAX_SUGGESTIONS = 10;

const KIND_ICON: Record<SuggestionKind, typeof Search> = {
  title: Search,
  channel: Users,
  category: Tag,
  popular: Hash,
  recent: Clock,
  trending: Flame,
};

function highlight(text: string, query: string) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-foreground">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const SearchAutocomplete = forwardRef<HTMLInputElement, Props>(function SearchAutocomplete(
  {
    className,
    inputClassName,
    autoFocus,
    placeholder = "Search halal content…",
    initialValue = "",
    onSubmitQuery,
    size = "md",
    submitButton = true,
  },
  ref,
) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(value.trim(), DEBOUNCE_MS);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, [open]);

  // Trending (empty-state) — cached across mounts.
  const trendingQ = useQuery({
    queryKey: ["search-trending"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_trending", { _limit: 8 });
      if (error) throw error;
      return (data ?? []) as Array<{ suggestion: string; hits: number }>;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Autocomplete for the current prefix.
  const suggestQ = useQuery({
    queryKey: ["search-autocomplete", debounced],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_autocomplete", {
        _prefix: debounced,
        _limit: MAX_SUGGESTIONS,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ suggestion: string; kind: string; score: number }>;
    },
    enabled: debounced.length >= 1,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  });

  const suggestions: Suggestion[] = useMemo(() => {
    if (debounced.length >= 1) {
      return (suggestQ.data ?? [])
        .slice(0, MAX_SUGGESTIONS)
        .map((r) => ({
          text: r.suggestion,
          kind: (r.kind as SuggestionKind) ?? "title",
          score: Number(r.score ?? 0),
        }));
    }
    const out: Suggestion[] = [];
    for (const q of recent.slice(0, 6)) out.push({ text: q, kind: "recent" });
    for (const r of trendingQ.data ?? []) {
      if (!out.some((x) => x.text.toLowerCase() === r.suggestion.toLowerCase())) {
        out.push({ text: r.suggestion, kind: "trending" });
      }
      if (out.length >= MAX_SUGGESTIONS) break;
    }
    return out.slice(0, MAX_SUGGESTIONS);
  }, [debounced, suggestQ.data, recent, trendingQ.data]);

  const submit = useCallback(
    (q: string) => {
      const clean = q.trim();
      if (!clean) return;
      addRecentSearch(clean);
      setOpen(false);
      setActiveIndex(-1);
      setValue(clean);
      if (onSubmitQuery) onSubmitQuery(clean);
      else navigate(`/search?q=${encodeURIComponent(clean)}`);
    },
    [navigate, onSubmitQuery],
  );

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        submit(suggestions[activeIndex].text);
      } else {
        e.preventDefault();
        submit(value);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Tab" && open && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      const s = suggestions[activeIndex].text;
      setValue(s);
      submit(s);
    }
  };

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const showDropdown =
    open &&
    (suggestions.length > 0 ||
      suggestQ.isFetching ||
      (debounced.length >= 1 && !suggestQ.isFetching));

  const inputH = size === "sm" ? "h-9" : "h-10";

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        className="relative flex w-full"
      >
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={ref}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={autoFocus}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            aria-label="Search halal content"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined
            }
            role="combobox"
            className={cn(
              inputH,
              "w-full border border-border bg-background pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none",
              submitButton ? "rounded-l-full" : "rounded-full",
              inputClassName,
            )}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setActiveIndex(-1);
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {submitButton && (
          <button
            type="submit"
            aria-label="Search"
            className={cn(
              inputH,
              "flex items-center justify-center rounded-r-full border border-l-0 border-border bg-secondary px-5 hover:bg-muted transition-colors",
            )}
          >
            <Search className="h-4 w-4 text-foreground" />
          </button>
        )}
      </form>

      {showDropdown && (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg",
            "animate-in fade-in-0 slide-in-from-top-1 duration-150",
          )}
        >
          <ul
            id={listboxId}
            role="listbox"
            className="max-h-[70vh] overflow-y-auto overscroll-contain py-1"
          >
            {debounced.length === 0 && recent.length > 0 && (
              <li className="flex items-center justify-between px-4 pb-1 pt-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent
                </span>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentSearches();
                    setRecent([]);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </li>
            )}

            {debounced.length === 0 &&
              (trendingQ.data?.length ?? 0) > 0 &&
              recent.length > 0 && (
                <li className="mt-1 px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Trending
                </li>
              )}

            {suggestions.map((s, i) => {
              const Icon = KIND_ICON[s.kind] ?? Search;
              const active = i === activeIndex;
              return (
                <li
                  key={`${s.kind}:${s.text}:${i}`}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    // mousedown to fire before input blur
                    e.preventDefault();
                    submit(s.text);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    "min-h-[44px]", // touch-friendly
                    active ? "bg-accent" : "hover:bg-accent/60",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      s.kind === "trending"
                        ? "text-[hsl(var(--gold))]"
                        : s.kind === "channel"
                          ? "text-primary"
                          : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-foreground/90">
                    {highlight(s.text, debounced)}
                  </span>
                  <span className="ml-2 hidden text-[10px] uppercase tracking-wide text-muted-foreground sm:inline">
                    {s.kind}
                  </span>
                </li>
              );
            })}

            {suggestions.length === 0 && suggestQ.isFetching && (
              <li className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </li>
            )}

            {suggestions.length === 0 &&
              !suggestQ.isFetching &&
              debounced.length >= 1 && (
                <li className="px-4 py-4 text-center text-sm text-muted-foreground">
                  No ethical results found.
                </li>
              )}
          </ul>
        </div>
      )}
    </div>
  );
});

export default SearchAutocomplete;
