import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import YouTubeVideoCard from "@/components/YouTubeVideoCard";
import InfiniteVideoGrid from "@/components/InfiniteVideoGrid";
import SearchSuggestions from "@/components/SearchSuggestions";
import ReciterResults from "@/components/ReciterResults";
import EmptyState from "@/components/EmptyState";
import { addRecentSearch } from "@/lib/recentSearches";
import { useSmartSearch } from "@/hooks/useSmartSearch";
import { growth } from "@/lib/growthEvents";
import type { YouTubeVideo } from "@/services/youtube";

// Query terms that are inherently off-brand for a halal platform.
// Matching whole words only so surahs like "An-Nisa" (women in Arabic script/transliteration)
// are still searchable via their proper names ("nisa", "an-nisa" surah numbers work).
const BLOCKED_QUERY_TOKENS = [
  "female", "females",
  "woman", "women", "womans", "womens",
  "girl", "girls",
  "actress", "songstress",
  "aurat", "aurtain", "mujeres",
];
const BLOCKED_QUERY_RE = new RegExp(
  `\\b(${BLOCKED_QUERY_TOKENS.join("|")})\\b`,
  "i",
);

function isBlockedQuery(q: string): boolean {
  return BLOCKED_QUERY_RE.test(q);
}

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = (searchParams.get("q") || "").trim();
  const blocked = query.length > 0 && isBlockedQuery(query);

  const [liveInput, setLiveInput] = useState(query);
  useEffect(() => setLiveInput(query), [query]);

  useEffect(() => {
    if (query && !blocked) addRecentSearch(query);
  }, [query, blocked]);

  const activeQuery = blocked ? "" : query || liveInput;
  const smart = useSmartSearch(activeQuery);

  useEffect(() => {
    if (!query || blocked || smart.isLoading) return;
    const n = smart.results.length;
    if (n === 0) growth.searchNoResults(query);
    else growth.searchIssued(query, n);
  }, [query, blocked, smart.isLoading, smart.results.length]);




  const smartVideos: YouTubeVideo[] = useMemo(
    () =>
      smart.results.map((r) => ({
        id: r!.id,
        title: r!.title,
        videoUrl: r!.videoUrl,
        thumbnailUrl: r!.thumbnailUrl,
        channelTitle: r!.channelTitle,
        category: r!.category as YouTubeVideo["category"],
        halalScore: r!.halalScore,
        publishedAt: r!.publishedAt,
      })),
    [smart.results],
  );

  return (
    <div className="min-h-dvh bg-background pb-12">
      <SEO
        title={query ? `${query} — Heartify search` : "Search Heartify"}
        description={
          query
            ? `Halal-verified results for "${query}" on Heartify.`
            : "Search Heartify for Quran recitations, Islamic lectures, and family-friendly halal video content."
        }
        path={query ? `/search?q=${encodeURIComponent(query)}` : "/search"}
      />
      <Navbar />


      <div className="mx-auto max-w-[1800px] px-4 py-6 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        {query && blocked ? (
          <div className="rounded-card border border-border bg-card p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-pill bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <h1 className="text-heading font-bold text-foreground">
              That search isn&apos;t available on Heartify
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              To keep the platform halal — no music, no women on camera — we don&apos;t index results for
              &ldquo;{query}&rdquo;. Try a reciter, surah, or topic instead.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Surah Yaseen", "Mishary", "Tafsir", "Seerah", "Adhkar"].map((s) => (
                <Link
                  key={s}
                  to={`/search?q=${encodeURIComponent(s)}`}
                  className="rounded-pill border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>
        ) : query ? (
          <>
            <div className="mb-4 flex items-center gap-3">
              <Search className="h-6 w-6 text-primary" />
              <div className="min-w-0">
                <h1 className="truncate text-heading font-bold text-foreground">
                  Results for "{query}"
                </h1>
                <p className="text-sm text-muted-foreground">
                  Only halal-verified content is shown &middot; up to 85% halal score
                </p>
              </div>
            </div>

            {smart.didYouMean && (
              <div className="mb-4 flex items-center gap-2 rounded-card border border-border bg-card px-3 py-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Did you mean</span>
                <Link
                  to={`/search?q=${encodeURIComponent(smart.didYouMean)}`}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {smart.didYouMean}
                </Link>
                <span className="text-muted-foreground">?</span>
              </div>
            )}

            <ReciterResults query={query} />

            {smartVideos.length > 0 ? (
              <>
                <div className="mb-2 flex items-center justify-between text-micro text-muted-foreground">
                  <span>Smart-ranked matches ({smartVideos.length})</span>
                </div>
                <div className="mb-10 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {smartVideos.map((v, i) => (
                    <YouTubeVideoCard key={v.id} video={v} index={i} />
                  ))}
                </div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">More related</h2>
                <InfiniteVideoGrid
                  search={query}
                  fallbackMessage="No additional related results."
                />
              </>
            ) : (
              <>
                <InfiniteVideoGrid
                  search={query}
                  fallbackMessage={`No exact match for "${query}". Showing trending halal content instead.`}
                />
                <div className="mt-10">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    You might also like
                  </h2>
                  <InfiniteVideoGrid fallbackMessage="No related content available." />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-6 flex items-start gap-3 sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-primary/10 text-primary">
                <Search className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-heading font-bold text-foreground sm:text-heading">Search Heartify</h1>
                <p className="text-micro text-muted-foreground sm:text-sm">
                  Typo-tolerant search across trusted creators, topics, and reminders
                </p>
              </div>
            </div>

            <input
              type="search"
              value={liveInput}
              onChange={(e) => setLiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && liveInput.trim()) {
                  navigate(`/search?q=${encodeURIComponent(liveInput.trim())}`);
                }
              }}
              placeholder="Try 'quraan', 'hubrman', 'ramadn'…"
              className="mb-4 w-full rounded-card border border-border bg-card px-4 py-3 text-base outline-none ring-primary/20 focus:ring-2"
            />

            {liveInput.length >= 2 && smart.autocomplete.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {smart.autocomplete.map((s) => (
                  <button
                    key={s}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(s)}`)}
                    className="rounded-pill border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <SearchSuggestions />
            <div className="mt-8 sm:mt-10">
              <EmptyState
                title="Type a topic, surah, or creator name"
                description="Every result passes our halal review pipeline — up to 85% halal score."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
