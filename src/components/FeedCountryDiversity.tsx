/**
 * "Where your feed comes from" — country/region diversity of what the viewer
 * has actually watched.
 *
 * Heartify keeps every feed anchored in the viewer's own language while still
 * reaching beyond it. This card shows the *outcome* of that in terms a person
 * cares about — the places and languages their knowledge came from — rather
 * than any internal serving ratio.
 */
import { useQuery } from "@tanstack/react-query";
import { Globe2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Content language → the places that content predominantly comes from.
 * `label` is what the user sees; `flag` is decorative only.
 */
const LANGUAGE_ORIGINS: Record<string, { label: string; flag: string }> = {
  bn: { label: "Bangladesh & Bengal", flag: "🇧🇩" },
  ur: { label: "Pakistan & India", flag: "🇵🇰" },
  ar: { label: "Arab world", flag: "🇸🇦" },
  tr: { label: "Türkiye & Balkans", flag: "🇹🇷" },
  id: { label: "Indonesia", flag: "🇮🇩" },
  ms: { label: "Malaysia & Brunei", flag: "🇲🇾" },
  fa: { label: "Iran & Afghanistan", flag: "🇮🇷" },
  ps: { label: "Afghanistan", flag: "🇦🇫" },
  en: { label: "Global English", flag: "🌍" },
  fr: { label: "France & West Africa", flag: "🇫🇷" },
  es: { label: "Spain & Latin America", flag: "🇪🇸" },
  pt: { label: "Portugal & Brazil", flag: "🇵🇹" },
  de: { label: "Germany & Austria", flag: "🇩🇪" },
  sw: { label: "East Africa", flag: "🇰🇪" },
  ha: { label: "Nigeria & Niger", flag: "🇳🇬" },
  zh: { label: "China & Southeast Asia", flag: "🇨🇳" },
  ja: { label: "Japan", flag: "🇯🇵" },
  ko: { label: "Korea", flag: "🇰🇷" },
};

function originFor(code: string | null | undefined) {
  const key = (code ?? "").toLowerCase();
  return LANGUAGE_ORIGINS[key] ?? { label: "Other regions", flag: "🌐" };
}

type Slice = { label: string; flag: string; count: number; pct: number };

const SAMPLE = 200;

const FeedCountryDiversity = () => {
  const { user } = useAuth();
  const { preferences } = useLocale();

  const { data, isLoading } = useQuery({
    queryKey: ["feed-country-diversity", user?.id],
    enabled: !!user,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<Slice[]> => {
      const { data: history, error: hErr } = await supabase
        .from("watch_history")
        .select("video_id")
        .order("watched_at", { ascending: false })
        .limit(SAMPLE);
      if (hErr) throw hErr;
      const ids = Array.from(
        new Set((history ?? []).map((r) => r.video_id).filter((v): v is string => !!v)),
      );
      if (!ids.length) return [];

      const { data: videos, error: vErr } = await supabase
        .from("curated_videos")
        .select("video_id, content_language")
        .in("video_id", ids);
      if (vErr) throw vErr;

      const counts = new Map<string, { flag: string; count: number }>();
      for (const v of videos ?? []) {
        const { label, flag } = originFor(v.content_language);
        const prev = counts.get(label);
        counts.set(label, { flag, count: (prev?.count ?? 0) + 1 });
      }
      const total = Array.from(counts.values()).reduce((s, c) => s + c.count, 0);
      if (!total) return [];

      return Array.from(counts.entries())
        .map(([label, c]) => ({
          label,
          flag: c.flag,
          count: c.count,
          pct: Math.round((c.count / total) * 100),
        }))
        .sort((a, b) => b.count - a.count);
    },
  });

  const slices = data ?? [];
  const homeOrigin = originFor(preferences.content_languages[0]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Globe2 className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Where your feed comes from</h3>
      </div>
      <p className="mt-1 text-micro text-muted-foreground">
        Your feed stays rooted in {homeOrigin.label} while opening a window onto scholars
        elsewhere.
      </p>

      {isLoading ? (
        <div className="mt-4 space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : slices.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Watch a few videos and this will show the regions your knowledge came from.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {slices.map((s) => (
            <li key={s.label}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">
                  <span aria-hidden="true">{s.flag}</span> {s.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{s.pct}%</span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-pill bg-muted"
                role="img"
                aria-label={`${s.label}: ${s.pct}% of what you watched`}
              >
                <div className="h-full rounded-pill bg-primary" style={{ width: `${s.pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {slices.length > 0 && (
        <p className="mt-4 text-micro text-muted-foreground">
          {slices.length === 1
            ? "All from one region so far — explore other languages to widen it."
            : `${slices.length} regions across your recent watching.`}
        </p>
      )}
    </Card>
  );
};

export default FeedCountryDiversity;
