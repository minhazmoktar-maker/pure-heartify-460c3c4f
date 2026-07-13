import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw, Timer, GaugeCircle, Undo2, Inbox, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

/**
 * Phase 7 — Moderation SLA + content-freshness surface.
 *
 * Reads `admin_moderation_sla()` and `admin_content_freshness()` RPCs
 * (SECURITY DEFINER, admin-gated) and exposes trigger buttons for the
 * `recheck-approved-channels` and `refresh-sections` edge functions.
 */

type SLA = {
  reports: {
    pending: number;
    oldest_hours: number;
    avg_time_to_decision_hours: number;
    reversal_rate_pct: number;
  };
  candidates: {
    pending: number;
    oldest_hours: number;
    avg_time_to_decision_hours: number;
  };
  computed_at: string;
};

type Freshness = {
  total_approved: number;
  never_rechecked: number;
  oldest_recheck_hours: number;
  avg_recheck_age_hours: number;
  flagged: number;
  slo_target_hours: number;
  computed_at: string;
};

export default function AdminSLA({ embedded = false }: { embedded?: boolean } = {}) {
  const { isAdmin, loading: roleLoading } = useRole();
  const [sla, setSla] = useState<SLA | null>(null);
  const [fresh, setFresh] = useState<Freshness | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([
        supabase.rpc("admin_moderation_sla" as any),
        supabase.rpc("admin_content_freshness" as any),
      ]);
      if (s.error) throw s.error;
      if (f.error) throw f.error;
      setSla(s.data as unknown as SLA);
      setFresh(f.data as unknown as Freshness);
    } catch (e: any) {
      toast({ title: "Failed to load metrics", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const trigger = async (fn: "recheck-approved-channels" | "refresh-sections") => {
    setBusy(fn);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: {} });
      if (error) throw error;
      toast({ title: `${fn} complete`, description: JSON.stringify(data).slice(0, 140) });
      await load();
    } catch (e: any) {
      toast({ title: `${fn} failed`, description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (!roleLoading && !isAdmin) {
    return (
      <div className={embedded ? "" : "min-h-dvh bg-background"}>
        {!embedded && <Navbar />}
        <div className="p-8 text-center text-destructive">Forbidden — admin access required.</div>
      </div>
    );
  }

  const sloBreached = fresh && fresh.oldest_recheck_hours > fresh.slo_target_hours;

  return (
    <div className={embedded ? "" : "min-h-dvh bg-background"}>
      <SEO title="Admin · SLA & Freshness" description="Moderation SLA and content-freshness dashboard." path="/admin/sla" />
      {!embedded && <Navbar />}
      <div className={embedded ? "space-y-6" : "mx-auto max-w-6xl p-4 space-y-6"}>
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className={embedded ? "text-lg font-semibold" : "text-2xl font-bold"}>Moderation SLA & content freshness</h1>
            <p className="text-sm text-muted-foreground">
              Queue age, time-to-decision, reversal rate, and recheck freshness across the platform.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Reload
          </Button>
        </header>

        <section aria-label="Moderation SLA" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={<Inbox className="h-4 w-4" />} label="Reports pending" value={sla?.reports.pending ?? "—"} />
          <Metric
            icon={<Timer className="h-4 w-4" />}
            label="Oldest report (h)"
            value={sla ? sla.reports.oldest_hours.toFixed(1) : "—"}
            tone={sla && sla.reports.oldest_hours > 48 ? "danger" : "muted"}
          />
          <Metric
            icon={<GaugeCircle className="h-4 w-4" />}
            label="Avg TTD 7d (h)"
            value={sla ? sla.reports.avg_time_to_decision_hours.toFixed(1) : "—"}
          />
          <Metric
            icon={<Undo2 className="h-4 w-4" />}
            label="Reversal rate 7d"
            value={sla ? `${sla.reports.reversal_rate_pct}%` : "—"}
            tone={sla && sla.reports.reversal_rate_pct > 10 ? "danger" : "muted"}
          />
        </section>

        <section aria-label="Candidate queue" className="grid gap-3 sm:grid-cols-3">
          <Metric icon={<Inbox className="h-4 w-4" />} label="Candidates pending" value={sla?.candidates.pending ?? "—"} />
          <Metric
            icon={<Timer className="h-4 w-4" />}
            label="Oldest candidate (h)"
            value={sla ? sla.candidates.oldest_hours.toFixed(1) : "—"}
            tone={sla && sla.candidates.oldest_hours > 72 ? "danger" : "muted"}
          />
          <Metric
            icon={<GaugeCircle className="h-4 w-4" />}
            label="Candidate avg TTD 7d (h)"
            value={sla ? sla.candidates.avg_time_to_decision_hours.toFixed(1) : "—"}
          />
        </section>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Content freshness (SLO: {fresh?.slo_target_hours ?? 168}h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Approved channels" value={fresh?.total_approved ?? "—"} />
              <Metric label="Never rechecked" value={fresh?.never_rechecked ?? "—"} tone={fresh && fresh.never_rechecked > 0 ? "warning" : "muted"} />
              <Metric
                label="Oldest recheck (h)"
                value={fresh ? fresh.oldest_recheck_hours.toFixed(1) : "—"}
                tone={sloBreached ? "danger" : "muted"}
              />
              <Metric label="Flagged" value={fresh?.flagged ?? "—"} tone={fresh && fresh.flagged > 0 ? "warning" : "muted"} />
            </div>
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={() => trigger("recheck-approved-channels")} disabled={busy !== null}>
                {busy === "recheck-approved-channels" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Run channel recheck
              </Button>
              <Button size="sm" variant="outline" onClick={() => trigger("refresh-sections")} disabled={busy !== null}>
                {busy === "refresh-sections" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Refresh curated sections
              </Button>
            </div>
            {sloBreached && (
              <p className="text-xs text-destructive">
                SLO breach: oldest recheck exceeds {fresh?.slo_target_hours}h target. Run recheck to restore freshness.
              </p>
            )}
          </CardContent>
        </Card>

        {sla && (
          <p className="text-xs text-muted-foreground">
            Computed {new Date(sla.computed_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  tone = "muted",
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  tone?: "muted" | "warning" | "danger";
}) {
  const toneClass =
    tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-600" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
