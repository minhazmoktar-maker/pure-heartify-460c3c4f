import { useEffect, useMemo, useState } from "react";
import {
  readDedupAudit,
  clearDedupAudit,
  type DedupAuditEvent,
} from "@/contexts/FeedDiversityContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";

/**
 * Admin/debug view for the cross-rail deduplication audit log.
 *
 * Every time a rail, surface, or the infinite grid tries to render a
 * video that another surface already claimed, the FeedDiversityContext
 * records the event in a rolling `sessionStorage` buffer. This page reads
 * it back so regressions surface immediately in production without
 * shipping a heavy analytics pipeline.
 */
export default function AdminDedup() {
  const [events, setEvents] = useState<DedupAuditEvent[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const load = () => setEvents(readDedupAudit().slice().reverse());
    load();
    const onEvt = () => load();
    window.addEventListener("heartify:dedup:audit", onEvt);
    const t = autoRefresh ? window.setInterval(load, 2000) : undefined;
    return () => {
      window.removeEventListener("heartify:dedup:audit", onEvt);
      if (t) window.clearInterval(t);
    };
  }, [autoRefresh]);

  const bySource = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events) {
      const key = `${e.attemptedFrom} ← ${e.claimedBy}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <SEO
        title="Dedup Audit — Heartify Admin"
        description="Cross-rail deduplication audit log"
        path="/admin/dedup"
      />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dedup Audit</h1>
          <p className="text-sm text-muted-foreground">
            Session-scoped log of every duplicate video render that the
            cross-rail deduplicator blocked. Ideal count = 0.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            {autoRefresh ? "Pause" : "Resume"} auto-refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              clearDedupAudit();
              setEvents([]);
            }}
          >
            Clear log
          </Button>
        </div>
      </header>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Total blocked this session
        </h2>
        <div className="text-4xl font-bold tabular-nums">{events.length}</div>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Top clashing sources
        </h2>
        {bySource.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No duplicate attempts recorded. Dedup is working correctly.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {bySource.slice(0, 20).map(([key, count]) => (
              <li
                key={key}
                className="flex items-center justify-between py-1.5"
              >
                <span className="font-mono">{key}</span>
                <span className="tabular-nums font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Recent events (newest first)
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to show.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Video ID</th>
                  <th className="py-2 pr-3">Attempted from</th>
                  <th className="py-2 pr-3">Already claimed by</th>
                  <th className="py-2">At</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 100).map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-mono">{e.videoId}</td>
                    <td className="py-1.5 pr-3 font-mono">{e.attemptedFrom}</td>
                    <td className="py-1.5 pr-3 font-mono">{e.claimedBy}</td>
                    <td className="py-1.5">
                      {new Date(e.at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
