/**
 * /admin/rec-health — Owner dashboard for recommendation quality.
 *
 * Backed by two SECURITY DEFINER RPCs:
 *   • rec_retriever_health() — per-retriever pool metrics
 *   • rec_feed_health(hours) — assembled feed (from impression log)
 *
 * NOTE: If the assembled-feed panel shows "no impressions", event logging
 * for the /recommendations edge function isn't reaching Postgres. Previous
 * root cause was a silent write path; the fix is a SECURITY DEFINER RPC
 * called `log_recommendation_event`.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw } from "lucide-react";
import SEO from "@/components/SEO";
import { usePermissions } from "@/hooks/usePermissions";

interface RetrieverRow {
  retriever: string;
  pool_size: number;
  distinct_channels: number;
  distinct_categories: number;
  distinct_languages: number;
  top_channel_pct: number | null;
  channel_entropy_bits: number | null;
  pct_fresh_7d: number | null;
  pct_trusted: number | null;
}
interface FeedRow {
  total_impressions: number;
  distinct_videos: number;
  distinct_channels: number;
  distinct_categories: number;
  top_channel_pct: number | null;
  top_category_pct: number | null;
  duplicate_rate_pct: number | null;
  channel_entropy_bits: number | null;
  pct_fresh_7d: number | null;
  pct_trusted: number | null;
  personalized_ratio_pct: number | null;
}

function tone(v: number | null | undefined, good: number, warn: number, higherIsBetter = true) {
  if (v == null) return "text-muted-foreground";
  const ok = higherIsBetter ? v >= good : v <= good;
  const bad = higherIsBetter ? v < warn : v > warn;
  return ok ? "text-emerald-600" : bad ? "text-destructive" : "text-amber-600";
}

export default function AdminRecHealth() {
  const { hasMinRole } = usePermissions();
  const isOwner = hasMinRole("owner") || hasMinRole("admin");
  const [rows, setRows] = useState<RetrieverRow[]>([]);
  const [feed, setFeed] = useState<FeedRow | null>(null);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [r, f] = await Promise.all([
        supabase.rpc("rec_retriever_health"),
        supabase.rpc("rec_feed_health", { _hours: hours }),
      ]);
      setRows((r.data as RetrieverRow[]) ?? []);
      setFeed(((f.data as FeedRow[]) ?? [])[0] ?? null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hours]);

  if (!isOwner) return <div className="p-8 text-center text-muted-foreground">Owner access required.</div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <SEO title="Recommendation Health — Heartify Admin" description="Owner dashboard for retriever and assembled feed health." path="/admin/rec-health" />
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Recommendation Health</h1>
          <p className="text-sm text-muted-foreground">Per-retriever pool + assembled-feed diversity & freshness.</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 24, 168, 720].map((h) => (
            <Button key={h} size="sm" variant={hours === h ? "default" : "outline"} onClick={() => setHours(h)}>
              {h === 1 ? "1h" : h === 24 ? "24h" : h === 168 ? "7d" : "30d"}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-retriever pool health</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">Retriever</th>
                <th className="py-2 pr-3">Pool</th>
                <th className="py-2 pr-3">Channels</th>
                <th className="py-2 pr-3">Categories</th>
                <th className="py-2 pr-3">Languages</th>
                <th className="py-2 pr-3">Top ch %</th>
                <th className="py-2 pr-3">Entropy (bits)</th>
                <th className="py-2 pr-3">Fresh 7d %</th>
                <th className="py-2 pr-3">Trusted %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.retriever} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">{r.retriever}</td>
                  <td className={"py-2 pr-3 " + tone(r.pool_size, 100, 20)}>{r.pool_size}</td>
                  <td className={"py-2 pr-3 " + tone(r.distinct_channels, 30, 10)}>{r.distinct_channels}</td>
                  <td className="py-2 pr-3">{r.distinct_categories}</td>
                  <td className={"py-2 pr-3 " + tone(r.distinct_languages, 3, 1)}>{r.distinct_languages}</td>
                  <td className={"py-2 pr-3 " + tone(r.top_channel_pct, 10, 25, false)}>{r.top_channel_pct ?? "—"}</td>
                  <td className={"py-2 pr-3 " + tone(r.channel_entropy_bits, 4.5, 3)}>{r.channel_entropy_bits ?? "—"}</td>
                  <td className={"py-2 pr-3 " + tone(r.pct_fresh_7d, 5, 1)}>{r.pct_fresh_7d ?? "—"}</td>
                  <td className="py-2 pr-3">{r.pct_trusted ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={9} className="py-6 text-center text-muted-foreground">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Assembled feed ({hours}h impressions)</CardTitle>
          {feed && feed.total_impressions === 0 && (
            <Badge variant="destructive">No impressions logged — verify /recommendations calls are firing</Badge>
          )}
        </CardHeader>
        <CardContent>
          {feed ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Impressions" value={feed.total_impressions} />
              <Metric label="Distinct videos" value={feed.distinct_videos} />
              <Metric label="Distinct channels" value={feed.distinct_channels} tone={tone(feed.distinct_channels, 30, 10)} />
              <Metric label="Distinct categories" value={feed.distinct_categories} />
              <Metric label="Top channel %" value={fmt(feed.top_channel_pct)} tone={tone(feed.top_channel_pct, 10, 25, false)} />
              <Metric label="Top category %" value={fmt(feed.top_category_pct)} tone={tone(feed.top_category_pct, 25, 50, false)} />
              <Metric label="Duplicate rate %" value={fmt(feed.duplicate_rate_pct)} tone={tone(feed.duplicate_rate_pct, 5, 15, false)} />
              <Metric label="Channel entropy (bits)" value={fmt(feed.channel_entropy_bits)} tone={tone(feed.channel_entropy_bits, 4.5, 3)} />
              <Metric label="Fresh 7d %" value={fmt(feed.pct_fresh_7d)} tone={tone(feed.pct_fresh_7d, 20, 5)} />
              <Metric label="Trusted %" value={fmt(feed.pct_trusted)} />
              <Metric label="Personalized %" value={fmt(feed.personalized_ratio_pct)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Health rubric</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p><strong>Top channel %</strong> should stay under 10% — above 25% means one uploader dominates and different users see similar feeds.</p>
          <p><strong>Channel entropy</strong> above 4.5 bits ≈ &gt;22 effective channels contributing. Below 3 bits ≈ &lt;8.</p>
          <p><strong>Distinct languages = 1</strong> globally means <code>content_language</code> is unpopulated — no multilingual personalization is possible.</p>
          <p><strong>Fresh 7d %</strong> under 5% signals the ingestion pipeline is falling behind uploads.</p>
          <p><strong>Duplicate rate</strong> above 15% means the same video is being reshown too often across sessions.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function fmt(v: number | null | undefined) { return v == null ? "—" : String(v); }
function Metric({ label, value, tone: t }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={"mt-1 text-lg font-semibold " + (t ?? "")}>{value}</div>
    </div>
  );
}
