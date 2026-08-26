/**
 * /studio/analytics — creator-owned video analytics and CSV export.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Download, Loader2, RefreshCcw } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorAnalytics, useUploadRetention, type VideoAnalytics } from "@/hooks/useCreatorInsights";
import { downloadFile, toCsv } from "@/lib/uploadMedia";

const WINDOWS = [7, 30, 90, 365];

function percent(value: number | null | undefined) {
  return value == null ? "—" : `${Number(value).toFixed(1)}%`;
}

function hours(seconds: number) {
  return `${(seconds / 3600).toFixed(1)}h`;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function RetentionBars({ uploadId }: { uploadId: string | null }) {
  const retention = useUploadRetention(uploadId);
  const curve = retention.data?.curve ?? [];
  if (!uploadId) return null;
  if (retention.isLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  return (
    <div className="mt-3 rounded-lg border border-border/60 p-3">
      <p className="mb-2 text-xs font-medium text-foreground">Audience retention</p>
      <div className="space-y-1.5">
        {curve.map((p) => (
          <div key={p.bucket} className="grid grid-cols-[42px_1fr_48px] items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">{p.pct_of_video}%</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, p.reached_pct))}%` }} />
            </div>
            <span className="text-right tabular-nums text-muted-foreground">{p.reached_pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoRow({ row, selected, onSelect }: { row: VideoAnalytics; selected: boolean; onSelect: () => void }) {
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-semibold text-foreground">{row.title}</h2>
          <p className="mt-1 text-[11px] uppercase text-muted-foreground">
            {row.language} {row.category ? `· ${row.category}` : ""}
          </p>
        </div>
        <Badge variant={row.status === "approved" ? "outline" : "secondary"} className="shrink-0 text-[10px]">
          {row.status.replace("_", " ")}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <span><strong>{row.views.toLocaleString()}</strong><br />views</span>
        <span><strong>{row.plays.toLocaleString()}</strong><br />plays</span>
        <span><strong>{hours(row.watch_seconds)}</strong><br />watched</span>
        <span><strong>{percent(row.completion_rate)}</strong><br />complete</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="h-9">
          <Link to={`/u/${row.id}`}>Open video</Link>
        </Button>
        <Button size="sm" variant={selected ? "default" : "outline"} className="h-9" onClick={onSelect}>
          Retention
        </Button>
      </div>
      {selected && <RetentionBars uploadId={row.id} />}
    </li>
  );
}

export default function CreatorAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const [days, setDays] = useState(30);
  const [selectedUpload, setSelectedUpload] = useState<string | null>(null);
  const analytics = useCreatorAnalytics(days);
  const data = analytics.data;

  const rows = useMemo(() => data?.videos ?? [], [data]);

  const exportCsv = () => {
    downloadFile(
      `heartify-creator-analytics-${days}d.csv`,
      toCsv(rows as unknown as Array<Record<string, unknown>>, [
        "id",
        "title",
        "status",
        "language",
        "category",
        "views",
        "plays",
        "watch_seconds",
        "avg_watch_seconds",
        "completion_rate",
        "autoplay_pass_rate",
        "avg_view_pct",
        "last_play",
      ]),
    );
  };

  if (authLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <SEO path="/studio/analytics" title="Creator analytics — Heartify" description="Creator-owned upload analytics for Heartify." />
        <h1 className="text-xl font-semibold">Sign in required</h1>
        <Button asChild className="mt-4 h-11"><Link to="/login">Sign in</Link></Button>
      </main>
    );
  }

  return (
    <>
      <SEO path="/studio/analytics" title="Creator analytics — Heartify" description="Views, watch-time, autoplay health and retention for Heartify creator uploads." />
      <PageHeader title="Creator analytics" subtitle="Per-video views, watch-time, autoplay health and audience drop-off." icon={BarChart3} />
      <main className="container mx-auto max-w-4xl space-y-5 px-4 pb-24">
        <div className="flex flex-wrap items-center gap-2">
          {WINDOWS.map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => analytics.refetch()} disabled={analytics.isFetching}>
            {analytics.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>

        {analytics.error && <p className="text-sm text-destructive">{analytics.error.message}</p>}

        {data && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Uploads" value={data.totals.uploads.toLocaleString()} />
            <Stat label="Views" value={data.totals.views.toLocaleString()} />
            <Stat label="Watch time" value={hours(data.totals.watch_seconds)} />
            <Stat label="Autoplay pass" value={percent(data.totals.autoplay_pass_rate)} />
          </div>
        )}

        {analytics.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No creator upload analytics yet.</CardContent></Card>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <VideoRow
                key={row.id}
                row={row}
                selected={selectedUpload === row.id}
                onSelect={() => setSelectedUpload((current) => (current === row.id ? null : row.id))}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}