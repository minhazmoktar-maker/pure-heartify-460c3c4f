import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeaderboard, type LeaderboardMetric, type LeaderboardScope } from "@/hooks/useLeaderboard";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  scope?: LeaderboardScope;
  groupId?: string | null;
}

const METRICS: { key: LeaderboardMetric; label: string; period: "daily" | "weekly" | "all_time" }[] = [
  { key: "streak", label: "Streaks", period: "all_time" },
  { key: "khatm_juz", label: "Khatm Juz", period: "weekly" },
];

export function Leaderboard({ scope = "global", groupId = null }: Props) {
  const [tab, setTab] = useState<LeaderboardMetric>("streak");
  const active = METRICS.find((m) => m.key === tab)!;
  const { rows, loading } = useLeaderboard({ scope, metric: active.key, period: active.period, groupId, limit: 25 });
  const { user } = useAuth();

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
        <h3 className="font-semibold text-foreground">Leaderboard</h3>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as LeaderboardMetric)}>
        <TabsList>
          {METRICS.map((m) => (
            <TabsTrigger key={m.key} value={m.key}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {METRICS.map((m) => (
          <TabsContent key={m.key} value={m.key} className="mt-3">
            {loading ? (
              <ol className="divide-y" aria-label="Loading leaderboard" role="status">
                {Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-2 py-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-12" />
                  </li>
                ))}
              </ol>
            ) : rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No data yet — be among the first to appear here.
              </p>
            ) : (
              <ol className="divide-y">
                {rows.map((r) => {
                  const isMe = user?.id === r.user_id;
                  return (
                    <li
                      key={`${r.user_id}-${r.rank}`}
                      className={`flex items-center justify-between px-2 py-2 text-sm ${isMe ? "bg-primary/5 rounded" : ""}`}
                      aria-current={isMe ? "true" : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 tabular-nums text-muted-foreground">{r.rank}</span>
                        <span className={`truncate ${isMe ? "font-semibold text-foreground" : ""}`}>
                          {r.display_name ?? "Anonymous"}
                          {isMe && <span className="ml-2 text-xs text-primary">(you)</span>}
                        </span>
                      </div>
                      <span className="tabular-nums font-mono text-foreground">{r.score.toLocaleString()}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}

export default Leaderboard;
