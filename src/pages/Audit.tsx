import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { Loader2, ShieldCheck, AlertTriangle, ImageOff, CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { toast } from "@/components/ui/use-toast";
import SEO from "@/components/SEO";

interface Report {
  ok: boolean;
  scanned: number;
  flagged_count: number;
  flagged_pct: number;
  by_reason: Record<string, number>;
  sample_flagged: Array<{
    id: string; video_id: string; title: string;
    channel_title: string; reason: string; rule?: string;
  }>;
  thumbnails_sampled: number;
  thumbnails_broken: number;
  broken_thumbnails: Array<{ video_id: string; status: number }>;
  deleted: number;
  elapsed_ms: number;
}

const AuditPage = () => {
  const { user } = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    track("audit_page_view");
  }, []);

  const run = async (deleteFlagged: boolean) => {
    setLoading(true); setErr(null); setReport(null);
    const startedAt = Date.now();
    track("audit_run_started", { delete_flagged: deleteFlagged });
    const { data, error } = await supabase.functions.invoke("audit-compliance", {
      body: { limit: 5000, thumb_sample: 50, delete_flagged: deleteFlagged },
    });
    if (error) {
      setErr(error.message);
      track("audit_run_failed", { delete_flagged: deleteFlagged, error: error.message, duration_ms: Date.now() - startedAt });
      toast({ title: "Audit failed", description: error.message, variant: "destructive" });
    } else {
      const r = data as Report;
      setReport(r);
      track("audit_run_completed", {
        delete_flagged: deleteFlagged,
        scanned: r.scanned,
        flagged: r.flagged_count,
        flagged_pct: r.flagged_pct,
        broken_thumbs: r.thumbnails_broken,
        deleted: r.deleted,
        duration_ms: Date.now() - startedAt,
      });
      if (r.flagged_pct > 1 || r.thumbnails_broken > 0) {
        toast({
          title: "Audit finished with warnings",
          description: `${r.flagged_count} flagged (${r.flagged_pct}%), ${r.thumbnails_broken} broken thumbnails.`,
        });
      }
    }
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <p className="text-muted-foreground">Please <Link className="text-primary underline" to="/login">log in</Link> to run the audit.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-20">
      <SEO title="Audit Log — Heartify Admin" description="Immutable audit trail of Heartify admin, moderator, and owner actions." path="/admin/audit" />
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance & Health Audit</h1>
            <p className="text-sm text-muted-foreground">
              Scans the curated catalog for halal-policy violations and broken thumbnails.
            </p>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => run(false)} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Run audit (dry-run)
          </Button>
          <Button onClick={() => run(true)} variant="destructive" disabled={loading}>
            Run + auto-remove flagged
          </Button>
        </div>

        {err && (
          <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {err}
          </div>
        )}

        {report && (
          <div className="mt-8 space-y-6">
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Scanned" value={report.scanned.toLocaleString()} />
              <Stat label="Flagged" value={`${report.flagged_count} (${report.flagged_pct}%)`}
                tone={report.flagged_count ? "warn" : "ok"} />
              <Stat label="Broken thumbs" value={`${report.thumbnails_broken}/${report.thumbnails_sampled}`}
                tone={report.thumbnails_broken ? "warn" : "ok"} />
              <Stat label="Removed" value={report.deleted.toString()} tone={report.deleted ? "warn" : "ok"} />
            </section>

            <section>
              <h2 className="mb-2 text-sm font-semibold text-foreground">Reasons</h2>
              {Object.entries(report.by_reason).length === 0 ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> No violations detected.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.by_reason).map(([reason, count]) => (
                    <span key={reason} className="heartify-chip heartify-chip--warning gap-1">
                      <AlertTriangle className="h-3 w-3" /> {reason}: {count}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {report.sample_flagged.length > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-foreground">Sample flagged items</h2>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="heartify-table min-w-full text-xs">
                    <thead>
                      <tr><th>Reason</th><th>Rule</th><th>Title</th><th>Channel</th></tr>
                    </thead>
                    <tbody>
                      {report.sample_flagged.map((f) => (
                        <tr key={f.id} tabIndex={0}>
                          <td><span className="heartify-chip heartify-chip--danger">{f.reason}</span></td>
                          <td className="font-mono text-[10px] text-muted-foreground">{f.rule}</td>
                          <td>{f.title}</td>
                          <td className="text-muted-foreground">{f.channel_title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}


            {report.broken_thumbnails.length > 0 && (
              <section>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ImageOff className="h-4 w-4" /> Broken thumbnails
                </h2>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {report.broken_thumbnails.map((t) => (
                    <li key={t.video_id} className="font-mono">{t.video_id} → HTTP {t.status}</li>
                  ))}
                </ul>
              </section>
            )}

            <p className="text-xs text-muted-foreground">Completed in {report.elapsed_ms} ms</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "ok" | "warn" | "neutral" }) => (
  <div className={`rounded-lg border p-4 ${
    tone === "warn" ? "border-amber-500/40 bg-amber-500/5"
    : tone === "ok" ? "border-emerald-500/40 bg-emerald-500/5"
    : "border-border bg-card"
  }`}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
  </div>
);

export default AuditPage;
