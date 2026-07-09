import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldAlert } from "lucide-react";
import { track } from "@/lib/analytics";
import { toast } from "@/components/ui/use-toast";

interface ModerationRow {
  id: string;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string | null;
  reject_reason: string;
  matched_rule: string | null;
  halal_score: number | null;
  source: string | null;
  created_at: string;
}

const reasonColors: Record<string, string> = {
  keyword: "bg-red-500/15 text-red-700 dark:text-red-300",
  female_visual: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  female_presenter: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  soft_pattern: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  emoji: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  low_score: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  thumbnail_unsafe: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

const ModerationLog = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<ModerationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    track("moderation_log_view");
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("moderation_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        setForbidden(true);
        track("moderation_log_load_failed", { error: error.message });
        toast({ title: "Couldn't load moderation log", description: error.message, variant: "destructive" });
      } else {
        const rows = (data ?? []) as ModerationRow[];
        setRows(rows);
        track("moderation_log_loaded", { count: rows.length });
      }
      setLoading(false);
    })();
  }, [user]);

  if (!user) {
    return (
      <div className={embedded ? "" : "min-h-screen bg-background"}>
        {!embedded && <Navbar />}
        <main className={embedded ? "py-4 text-center" : "container mx-auto px-4 py-16 text-center"}>
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="mt-2 text-muted-foreground">
            <Link to="/login" className="text-primary underline">Log in</Link> as an admin to view the moderation log.
          </p>
        </main>
      </div>
    );
  }

  const filtered = rows.filter((r) => {
    if (reasonFilter !== "all" && r.reject_reason !== reasonFilter) return false;
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      r.title.toLowerCase().includes(f) ||
      r.channel_title.toLowerCase().includes(f) ||
      (r.matched_rule ?? "").toLowerCase().includes(f)
    );
  });

  const reasons = Array.from(new Set(rows.map((r) => r.reject_reason)));

  return (
    <div className={embedded ? "" : "min-h-screen bg-background"}>
      {!embedded && <Navbar />}
      <main className={embedded ? "" : "container mx-auto px-4 py-8"}>
        {!embedded && (
          <div className="mb-6 flex items-center gap-3">
            <ShieldAlert className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Moderation Log</h1>
              <p className="text-sm text-muted-foreground">
                Videos rejected by the halal filter, with the exact rule that triggered each block.
              </p>
            </div>
          </div>
        )}

        {forbidden && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            You don't have admin access to view the moderation log.
          </div>
        )}

        {!forbidden && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Input
                placeholder="Search title, channel, or rule…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
              />
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All reasons ({rows.length})</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r} ({rows.filter((x) => x.reject_reason === r).length})
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground">No rejections match.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Thumb</th>
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Channel</th>
                      <th className="px-3 py-2">Reason</th>
                      <th className="px-3 py-2">Matched rule</th>
                      <th className="px-3 py-2">Score</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">
                          {r.thumbnail_url ? (
                            <img src={r.thumbnail_url} alt="" className="h-12 w-20 rounded object-cover" />
                          ) : null}
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 font-medium">{r.title}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.channel_title}</td>
                        <td className="px-3 py-2">
                          <Badge className={reasonColors[r.reject_reason] ?? ""} variant="secondary">
                            {r.reject_reason}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.matched_rule ?? "—"}</td>
                        <td className="px-3 py-2">{r.halal_score ?? 0}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{r.source}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ModerationLog;
