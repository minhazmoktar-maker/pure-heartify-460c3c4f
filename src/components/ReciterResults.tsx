import { Link } from "react-router-dom";
import { Mic2, MapPin } from "lucide-react";
import { useReciterSearch } from "@/hooks/useReciterSearch";

/**
 * Compact horizontal strip of reciter matches shown on the search results page.
 * Silently renders nothing when the query is empty, loading, or has no matches
 * — so it never adds visual noise to unrelated searches.
 */
export default function ReciterResults({ query }: { query: string }) {
  const { results, loading } = useReciterSearch(query, 8);
  if (!query.trim() || loading || results.length === 0) return null;

  return (
    <section aria-labelledby="reciter-results-heading" className="mb-8">
      <h2
        id="reciter-results-heading"
        className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground"
      >
        <Mic2 className="h-4 w-4 text-primary" />
        Reciters matching "{query}"
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {results.map((r) => (
          <Link
            key={r.id}
            to={`/search?q=${encodeURIComponent(r.canonical_name_en)}`}
            className="flex min-w-[220px] flex-col gap-1 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-semibold text-foreground">
                {r.canonical_name_en}
              </span>
              {r.is_living === false && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                  رحمه الله
                </span>
              )}
            </div>
            {r.canonical_name_ar && (
              <span dir="rtl" className="text-sm text-muted-foreground">
                {r.canonical_name_ar}
              </span>
            )}
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {r.country && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {r.country}
                </span>
              )}
              {r.primary_riwayah && <span>· {r.primary_riwayah}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
