import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, Swords, HeartHandshake, ShieldCheck, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import EmptyState from "@/components/EmptyState";
import PageSkeleton from "@/components/PageSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface Totals {
  window_days: number;
  connections: number;
  pending_requests: number;
  declined_requests: number;
  members_with_connections: number;
  avg_circle_size: number;
  acceptance_rate: number;
  pokes: number;
  pokes_window: number;
  challenges: number;
  challenges_active: number;
  challenge_participants: number;
  challenge_invite_accept_rate: number;
  challenge_completion_rate: number;
  open_reports: number;
  blocked_pairs: number;
  progress_sharing: { everyone: number; connections: number; nobody: number };
}

interface Point {
  day: string;
  requests: number;
  accepted: number;
  declined: number;
  pokes: number;
  challenges_created: number;
  challenge_completions: number;
}

interface Payload {
  suppressed: boolean;
  min_cohort: number;
  window_days?: number;
  totals?: Totals;
  series?: Point[];
  error?: string;
}

const RANGES = [7, 30, 90];

/**
 * Admin → Social analytics.
 *
 * Privacy-conscious by construction: every number comes from the
 * `social_analytics_series` RPC, which returns aggregates only (no user ids,
 * handles, or per-member rows) and suppresses the whole readout while the
 * cohort is smaller than the k-anonymity threshold.
 */
export default function AdminSocial() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-social-analytics", days],
    staleTime: 60_000,
    queryFn: async (): Promise<Payload> => {
      const { data, error } = await supabase.rpc("social_analytics_series", { _days: days });
      if (error) throw error;
      return data as unknown as Payload;
    },
  });

  const totals = data?.totals;
  const series = (data?.series ?? []).map((p) => ({ ...p, label: p.day.slice(5) }));

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Social analytics — Heartify Admin" description="Aggregate connections, pokes and challenge analytics." path="/admin/social" />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 md:px-6 md:py-8">
        <header className="mb-5">
          <h1 className="flex items-center gap-2 text-title font-bold">
            <Users className="h-7 w-7 text-primary" aria-hidden />
            Social analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aggregates only — no handles, no per-member rows. Readouts are suppressed below a
            {" "}{data?.min_cohort ?? 5}-member cohort.
          </p>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={days === r ? "default" : "outline"}
              className="min-h-11"
              aria-pressed={days === r}
              onClick={() => setDays(r)}
            >
              Last {r} days
            </Button>
          ))}
        </div>

        {isLoading ? (
          <PageSkeleton variant="detail" />
        ) : isError || data?.error ? (
          <EmptyState
            icon={ShieldCheck}
            title="Couldn't load analytics"
            description={data?.error === "forbidden" ? "Admin access is required." : "Something went wrong loading the readout."}
            actionLabel="Retry"
            onAction={() => void refetch()}
          />
        ) : data?.suppressed || !totals ? (
          <EmptyState
            icon={Lock}
            title="Readout suppressed"
            description={`Fewer than ${data?.min_cohort ?? 5} members have connections, so aggregates could identify individuals.`}
          />
        ) : (
          <div className="space-y-6">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="Connections" value={totals.connections} />
              <Kpi label="Pending requests" value={totals.pending_requests} />
              <Kpi label="Acceptance rate" value={`${totals.acceptance_rate}%`} />
              <Kpi label="Avg circle size" value={totals.avg_circle_size} />
              <Kpi label="Pokes (window)" value={totals.pokes_window} />
              <Kpi label="Active challenges" value={totals.challenges_active} />
              <Kpi label="Invite accept rate" value={`${totals.challenge_invite_accept_rate}%`} />
              <Kpi label="Challenge completion" value={`${totals.challenge_completion_rate}%`} />
            </section>

            <ChartCard title="Connection requests" icon={<HeartHandshake className="h-4 w-4 text-primary" />}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="requests" name="Sent" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.18)" />
                  <Area type="monotone" dataKey="accepted" name="Accepted" stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent) / 0.3)" />
                  <Area type="monotone" dataKey="declined" name="Declined" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.15)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Pokes sent" icon={<HeartHandshake className="h-4 w-4 text-primary" />}>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Bar dataKey="pokes" name="Pokes" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Challenges" icon={<Swords className="h-4 w-4 text-primary" />}>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="challenges_created" name="Created" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="challenge_completions" name="Goals reached" stroke="hsl(var(--destructive))" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Progress sharing choices
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <Kpi label="Everyone" value={totals.progress_sharing.everyone} />
                <Kpi label="Connections only" value={totals.progress_sharing.connections} />
                <Kpi label="Private" value={totals.progress_sharing.nobody} />
              </CardContent>
            </Card>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="Open reports" value={totals.open_reports} />
              <Kpi label="Blocked pairs" value={totals.blocked_pairs} />
              <Kpi label="Members with a circle" value={totals.members_with_connections} />
              <Kpi label="Challenge participants" value={totals.challenge_participants} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

const TOOLTIP = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
} as const;

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-card border bg-card p-3 text-center">
      <div className="text-heading font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
