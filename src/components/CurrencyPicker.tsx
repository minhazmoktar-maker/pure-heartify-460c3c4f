/**
 * Searchable currency picker — accessible combobox with keyboard nav.
 * Used in Zakat calculator, Sadaqah tracker, etc.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { CURRENCIES, findCurrency, searchCurrencies } from "@/lib/currencies";

interface Props {
  value: string;
  onChange: (code: string) => void;
  className?: string;
  ariaLabel?: string;
}

export default function CurrencyPicker({ value, onChange, className, ariaLabel = "Currency" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = findCurrency(value) ?? CURRENCIES[0];
  const results = useMemo(() => searchCurrencies(query).slice(0, 200), [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setActiveIdx(0), [query]);

  const commit = (code: string) => {
    onChange(code);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIdx];
      if (item) commit(item.code);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-card border border-border bg-background px-3 text-sm text-foreground hover:border-primary/50 focus:border-primary focus:outline-none"
      >
        <span className="truncate">
          <span className="font-medium">{selected.code}</span>
          <span className="text-muted-foreground"> — {selected.name}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[260px] overflow-hidden rounded-card border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search currency, country or code…"
              className="h-8 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="rounded-pill p-1 text-muted-foreground hover:bg-secondary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-72 overflow-auto py-1"
          >
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                No currencies match "{query}"
              </li>
            ) : (
              results.map((c, i) => {
                const isActive = i === activeIdx;
                const isSelected = c.code === value;
                return (
                  <li key={c.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => commit(c.code)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${
                        isActive ? "bg-secondary" : ""
                      }`}
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-foreground">{c.code}</span>
                        <span className="text-muted-foreground"> — {c.name}</span>
                        {c.country && (
                          <span className="ml-1 text-micro text-muted-foreground/70">· {c.country}</span>
                        )}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
