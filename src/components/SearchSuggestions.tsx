import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Flame, TrendingUp, X, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CURATED_SECTIONS } from "@/data/curatedSections";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "@/lib/recentSearches";

const TRENDING: string[] = [
  "Quran recitation",
  "Mufti Menk",
  "Ramadan reminders",
  "Seerah",
  "Halal productivity",
  "Tafseer",
  "Islamic finance",
  "Dawah",
];

interface Creator {
  channel_title: string;
  count: number;
}

export default function SearchSuggestions({ onPick }: { onPick?: (q: string) => void }) {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<string[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("curated_videos")
        .select("channel_title")
        .eq("is_trusted_channel", true)
        .limit(400);
      if (cancelled || !data) return;
      const counts = new Map<string, number>();
      for (const row of data) {
        const name = (row as { channel_title: string | null }).channel_title;
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([channel_title, count]) => ({ channel_title, count }));
      setCreators(top);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (q: string) => {
    addRecentSearch(q);
    if (onPick) onPick(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="space-y-8">
      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent
            </h2>
            <button
              onClick={() => {
                clearRecentSearches();
                setRecent([]);
              }}
              className="text-micro text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((q) => (
              <button
                key={q}
                onClick={() => go(q)}
                className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {q}
                <X
                  className="h-3 w-3 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = recent.filter((r) => r !== q);
                    setRecent(next);
                    try {
                      localStorage.setItem("heartify-recent-searches", JSON.stringify(next));
                    } catch {
                      /* noop */
                    }
                  }}
                />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flame className="h-4 w-4 text-[hsl(var(--gold))]" /> Trending
        </h2>
        <div className="flex flex-wrap gap-2">
          {TRENDING.map((q) => (
            <button
              key={q}
              onClick={() => go(q)}
              className="rounded-pill border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" /> Browse by topic
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CURATED_SECTIONS.slice(0, 12).map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/section/${s.id}`)}
              className="flex items-center gap-2 rounded-card border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground hover:bg-accent transition-colors"
            >
              <span className="text-heading">{s.icon}</span>
              <span className="line-clamp-1 font-medium">{s.title}</span>
            </button>
          ))}
        </div>
      </section>

      {creators.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" /> Popular trusted creators
          </h2>
          <div className="flex flex-wrap gap-2">
            {creators.map((c) => (
              <button
                key={c.channel_title}
                onClick={() => go(c.channel_title)}
                className="rounded-pill border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
              >
                {c.channel_title}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
