import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";

interface HorizonRow {
  horizon_days: number;
  scheduled: number;
  asked: number;
  responded: number;
  worth_it_rate: number;
  clearly_yes_rate: number;
}

interface Stats {
  computed_at: string;
  total_scheduled: number;
  total_due: number;
  total_responded: number;
  unique_respondents: number;
  by_horizon: HorizonRow[];
}

/** MVP-4 — admin readout for the T+90 benefit label programme. */
export default function AdminBenefitLabels() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["benefit-label-stats"],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await supabase.rpc("benefit_label_stats");
      if (error) throw error;
      return data as unknown as Stats;
    },
  });

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Benefit labels — Heartify admin"
        description="Response rates for the T+7 / T+30 / T+90 benefit label programme."
        path="/admin/benefit-labels"
      />
      <Navbar />
      <main className="mx-auto max-w-[1000px] px-4 pb-24 pt-6 md:px-6 md:pt-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Benefit labels
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Ground truth for the benefit objective: “was this worth your time?”
          asked 7, 30 and 90 days after a completed watch.
        </p>

        {isLoading ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : error ? (
          <p className="mt-8 text-sm text-destructive">
            Admin access required to view this report.
          </p>
        ) : data ? (
          <>
            <dl className="mt-8 grid gap-3 sm:grid-cols-4">
              {[
                ["Scheduled", data.total_scheduled],
                ["Due now", data.total_due],
                ["Answered", data.total_responded],
                ["Respondents", data.unique_respondents],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <dt className="text-micro text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-foreground">
                    {Number(value).toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <caption className="sr-only">Benefit labels by horizon</caption>
                <thead className="bg-muted/50 text-left text-micro text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2">Horizon</th>
                    <th scope="col" className="px-4 py-2">Scheduled</th>
                    <th scope="col" className="px-4 py-2">Asked</th>
                    <th scope="col" className="px-4 py-2">Answered</th>
                    <th scope="col" className="px-4 py-2">Worth it</th>
                    <th scope="col" className="px-4 py-2">Clearly yes</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.by_horizon ?? []).map((r) => (
                    <tr key={r.horizon_days} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-foreground">
                        T+{r.horizon_days}
                      </td>
                      <td className="px-4 py-2">{r.scheduled}</td>
                      <td className="px-4 py-2">{r.asked}</td>
                      <td className="px-4 py-2">{r.responded}</td>
                      <td className="px-4 py-2">
                        {Math.round((r.worth_it_rate ?? 0) * 100)}%
                      </td>
                      <td className="px-4 py-2">
                        {Math.round((r.clearly_yes_rate ?? 0) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
