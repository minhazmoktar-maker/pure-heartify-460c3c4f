import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Mic2, MapPin } from "lucide-react";
import { useReciterSearch } from "@/hooks/useReciterSearch";
import { useEntitlement } from "@/hooks/useEntitlement";
import { supabase } from "@/integrations/supabase/client";
import LockedBadge from "@/components/premium/LockedBadge";
import UpgradeSheet from "@/components/premium/UpgradeSheet";

/**
 * Compact horizontal strip of reciter matches shown on the search results page.
 * Renders `LockedBadge` for premium reciters and, for non-premium viewers,
 * opens `UpgradeSheet` instead of navigating when they tap a locked card.
 */
export default function ReciterResults({ query }: { query: string }) {
  const { results, loading } = useReciterSearch(query, 8);
  const { isPremium } = useEntitlement();
  const [gated, setGated] = useState<Record<string, boolean>>({});
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  const ids = useMemo(() => results.map((r) => r.id), [results]);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) { setGated({}); return; }
    (async () => {
      const { data } = await supabase
        .from("reciters")
        .select("id, is_premium, min_plan")
        .in("id", ids);
      if (cancelled || !data) return;
      const map: Record<string, boolean> = {};
      for (const row of data as Array<{ id: string; is_premium: boolean | null; min_plan: string | null }>) {
        map[row.id] = Boolean(row.is_premium) && (row.min_plan ?? "free") !== "free";
      }
      setGated(map);
    })();
    return () => { cancelled = true; };
  }, [ids]);

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
        {results.map((r) => {
          const isGated = gated[r.id] && !isPremium;
          const cardClass =
            "relative flex min-w-[220px] flex-col gap-1 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
          const content = (
            <>
              {gated[r.id] && (
                <LockedBadge compact className="absolute right-2 top-2" />
              )}
              <div className="flex items-center justify-between gap-2 pr-6">
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
            </>
          );

          if (isGated) {
            return (
              <button
                key={r.id}
                type="button"
                className={cardClass + " text-left"}
                aria-label={`${r.canonical_name_en} — Heartify Plus exclusive`}
                onClick={() => {
                  setUpgradeFeature(r.canonical_name_en);
                  setShowUpgrade(true);
                }}
              >
                {content}
              </button>
            );
          }
          return (
            <Link
              key={r.id}
              to={`/search?q=${encodeURIComponent(r.canonical_name_en)}`}
              className={cardClass}
            >
              {content}
            </Link>
          );
        })}
      </div>
      <UpgradeSheet open={showUpgrade} onOpenChange={setShowUpgrade} feature={upgradeFeature} />
    </section>
  );
}
