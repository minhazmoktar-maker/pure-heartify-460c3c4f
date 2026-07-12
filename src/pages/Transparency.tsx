import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

interface Row { period: string; stage: string; state: string; decisions: number }
interface AppealRow { period: string; status: string; appeals: number }

export default function Transparency() {
  const [decisions, setDecisions] = useState<Row[]>([]);
  const [appeals, setAppeals] = useState<AppealRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [d, a] = await Promise.all([
        supabase.rpc("get_transparency_report" as any),
        supabase.rpc("get_transparency_appeals" as any),
      ]);
      if (!alive) return;
      if (!d.error && d.data) setDecisions(d.data as Row[]);
      if (!a.error && a.data) setAppeals(a.data as AppealRow[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const totalDecisions = decisions.reduce((s, r) => s + Number(r.decisions), 0);
  const totalRemovals = decisions.filter((r) => r.state === "rejected" || r.state === "removed").reduce((s, r) => s + Number(r.decisions), 0);
  const totalAppeals = appeals.reduce((s, r) => s + Number(r.appeals), 0);
  const approvedAppeals = appeals.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.appeals), 0);

  const byMonth = new Map<string, Record<string, number>>();
  decisions.forEach((r) => {
    const k = r.period;
    if (!byMonth.has(k)) byMonth.set(k, {});
    byMonth.get(k)![r.state] = (byMonth.get(k)![r.state] ?? 0) + Number(r.decisions);
  });
  const months = Array.from(byMonth.keys()).sort().reverse().slice(0, 12);

  return (
    <>
      <SEO path="/transparency"
        title="Transparency Report — Heartify"
        description="Real moderation and appeals numbers from the last 18 months. We publish this so you can hold us accountable."
        keywords={"transparency", "moderation report", "halal content moderation".split(",").join(", ")}
      />
      <PageHeader
        title="Transparency Report"
        subtitle="Real moderation and appeals numbers, updated live. We publish this so you can hold us accountable."
      />

      <div className="container mx-auto max-w-5xl px-4 pb-16">
        {loading ? (
          <Loader2 className="mx-auto mt-8 h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-4">
              <Metric label="Moderation decisions (18mo)" value={totalDecisions.toLocaleString()} />
              <Metric label="Videos removed / rejected" value={totalRemovals.toLocaleString()} />
              <Metric label="Appeals filed" value={totalAppeals.toLocaleString()} />
              <Metric label="Appeals approved" value={approvedAppeals.toLocaleString()} />
            </div>

            <h2 className="mt-10 text-lg font-semibold text-foreground">Decisions by month</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3 font-medium">Month</th>
                    <th className="p-3 font-medium">Approved</th>
                    <th className="p-3 font-medium">Rejected / removed</th>
                    <th className="p-3 font-medium">Flagged for review</th>
                    <th className="p-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => {
                    const row = byMonth.get(m)!;
                    const total = Object.values(row).reduce((s, n) => s + n, 0);
                    return (
                      <tr key={m} className="border-t border-border">
                        <td className="p-3">{new Date(m).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</td>
                        <td className="p-3">{(row.approved ?? 0).toLocaleString()}</td>
                        <td className="p-3">{((row.rejected ?? 0) + (row.removed ?? 0)).toLocaleString()}</td>
                        <td className="p-3">{(row.flagged ?? row.review ?? 0).toLocaleString()}</td>
                        <td className="p-3 font-medium">{total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2 className="mt-10 text-lg font-semibold text-foreground">Appeals</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3 font-medium">Month</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {appeals.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-3">{new Date(r.period).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</td>
                      <td className="p-3 capitalize">{r.status}</td>
                      <td className="p-3">{Number(r.appeals).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              Aggregated from real moderation and appeal records over the last 18 months. Personally identifying data is never included.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
