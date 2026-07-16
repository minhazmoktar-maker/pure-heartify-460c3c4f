import { useBadges } from "@/hooks/useBadges";
import { Card } from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";

export function BadgeShelf() {
  const { catalog, earned, loading } = useBadges();

  if (loading) {
    return (
      <Card className="p-5 flex items-center justify-center min-h-[120px]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const earnedSet = new Set(earned.map((b) => b.key));

  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold text-foreground">Badges</h3>
        <span className="text-micro text-muted-foreground tabular-nums">
          {earned.length}/{catalog.length}
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {catalog.map((b) => {
          const got = earnedSet.has(b.key);
          return (
            <div
              key={b.key}
              className={`relative flex flex-col items-center gap-1 rounded-card border p-3 text-center transition-colors ${
                got
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-muted/20 opacity-60"
              }`}
              title={got ? `${b.name} — earned` : `${b.name} — locked`}
            >
              <span className="text-title" aria-hidden>
                {b.icon}
              </span>
              <span className="text-[11px] font-medium text-foreground leading-tight">{b.name}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{b.description}</span>
              {!got && (
                <Lock className="absolute right-1 top-1 h-3 w-3 text-muted-foreground" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default BadgeShelf;
