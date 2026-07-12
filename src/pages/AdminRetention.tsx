import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";

type Row = { cohort_week: string; cohort_size: number; d1: number; d7: number; d30: number };

export default function AdminRetention() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_retention_cohorts");
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—");

  return (
    <>
      <SEO path="/admin/retention" title="Retention cohorts — Heartify" description="Weekly signup cohorts with D1/D7/D30 retention." />
      <PageHeader title="Retention cohorts" subtitle="Signup week × active on D+1, D+7, D+30." backHref="/admin" />
      <div className="container mx-auto max-w-5xl px-4 pb-16">
        <Card className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left py-2">Cohort week</th>
                <th className="text-right">Size</th>
                <th className="text-right">D1</th>
                <th className="text-right">D7</th>
                <th className="text-right">D30</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cohort_week} className="border-t border-border">
                  <td className="py-2">{r.cohort_week}</td>
                  <td className="text-right tabular-nums">{r.cohort_size}</td>
                  <td className="text-right tabular-nums">{pct(r.d1, r.cohort_size)}</td>
                  <td className="text-right tabular-nums">{pct(r.d7, r.cohort_size)}</td>
                  <td className="text-right tabular-nums">{pct(r.d30, r.cohort_size)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No cohort data.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
