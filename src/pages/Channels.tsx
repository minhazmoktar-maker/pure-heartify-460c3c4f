import { useMemo, useState } from "react";
import { Search, ShieldCheck, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CHANNEL_CATEGORIES, TOTAL_CHANNELS } from "@/data/channelCategories";

const Channels = () => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHANNEL_CATEGORIES.map((cat) => ({
      ...cat,
      channels: cat.channels.filter((c) => !q || c.toLowerCase().includes(q)),
    })).filter(
      (cat) =>
        (activeCategory === "all" || cat.id === activeCategory) &&
        cat.channels.length > 0,
    );
  }, [query, activeCategory]);

  const totalShown = filtered.reduce((s, c) => s + c.channels.length, 0);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Trusted Halal Channels — Heartify"
        description={`Browse ${TOTAL_CHANNELS}+ vetted halal YouTube channels across ${CHANNEL_CATEGORIES.length} categories on Heartify.`}
        path="/channels"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Trusted Halal Channels",
          description: `Curated list of ${TOTAL_CHANNELS}+ vetted halal YouTube channels across ${CHANNEL_CATEGORIES.length} categories.`,
          url: "https://pure-heartify.lovable.app/channels",
        }}
      />
      <Navbar />

      <header className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-[1800px] px-4 py-8 md:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-title font-bold">Trusted Channels</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse {TOTAL_CHANNELS}+ vetted halal channels across {CHANNEL_CATEGORIES.length} categories.
          </p>

          <div className="relative mt-5 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search channels…"
              className="pl-9"
            />
          </div>
        </div>

        {/* Category chips */}
        <div className="mx-auto max-w-[1800px] overflow-x-auto px-4 pb-4 md:px-6 scrollbar-hide">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "shrink-0 rounded-pill px-4 py-1.5 text-micro font-medium transition-colors",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted",
              )}
            >
              All ({TOTAL_CHANNELS})
            </button>
            {CHANNEL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "shrink-0 rounded-pill px-4 py-1.5 text-micro font-medium transition-colors",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-muted",
                )}
              >
                {cat.icon} {cat.title}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-6 md:px-6">
        {totalShown === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            No channels match "{query}".
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map((cat) => (
              <section key={cat.id}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-heading font-bold">
                      {cat.icon} {cat.title}
                    </h2>
                    <p className="text-micro text-muted-foreground">{cat.description}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {cat.channels.length}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cat.channels.map((channel) => (
                    <a
                      key={`${cat.id}-${channel}`}
                      href={`/search?q=${encodeURIComponent(channel)}`}
                      className="group flex items-center justify-between rounded-card border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:border-primary/50 hover:bg-accent"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate font-medium">{channel}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Channels;
