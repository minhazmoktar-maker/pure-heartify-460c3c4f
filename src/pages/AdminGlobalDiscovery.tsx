import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Globe2, Layers, Loader2 } from "lucide-react";

type Stats = {
  total_approved: number;
  total_pending: number;
  total_queries: number;
  total_langs: number;
  total_topics: number;
  goal: number;
  pct_complete: number;
};

type ProgressRow = {
  category: string;
  approved_channels: number;
  approved_7d: number;
  approved_30d: number;
};

export default function AdminGlobalDiscovery() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.rpc("get_global_discovery_stats").maybeSingle(),
        supabase.from("channel_discovery_progress").select("*"),
      ]);
      if (s) setStats(s as Stats);
      if (r) setRows(r as ProgressRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pct = stats?.pct_complete ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Global Discovery — Admin"
        description="Progress toward Heartify's goal of 7,000 verified beneficial educational channels worldwide."
        path="/admin/global-discovery"
      />
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Global Discovery</h1>
          <p className="text-muted-foreground">
            Progress toward 7,000 verified beneficial educational channels — every country, every major language.
          </p>
        </header>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Globe2 className="h-5 w-5" /> Toward 7,000
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div className="text-4xl font-semibold">
                {stats?.total_approved?.toLocaleString() ?? 0}
                <span className="text-muted-foreground text-lg"> / {stats?.goal?.toLocaleString()}</span>
              </div>
              <div className="text-sm text-muted-foreground">{pct}% complete</div>
            </div>
            <Progress value={Number(pct)} className="h-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-sm">
              <Stat label="Pending review" value={stats?.total_pending ?? 0} />
              <Stat label="Discovery queries" value={stats?.total_queries ?? 0} />
              <Stat label="Languages" value={stats?.total_langs ?? 0} />
              <Stat label="Topic areas" value={stats?.total_topics ?? 0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" /> Approved by category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-muted-foreground text-sm">No approved channels yet.</p>
            ) : (
              <div className="divide-y">
                {rows.map((row) => (
                  <div key={row.category} className="flex items-center justify-between py-2 text-sm">
                    <span className="capitalize">{row.category}</span>
                    <div className="flex items-center gap-6 text-muted-foreground">
                      <span>+{row.approved_7d} · 7d</span>
                      <span>+{row.approved_30d} · 30d</span>
                      <span className="font-medium text-foreground min-w-[3rem] text-right">
                        {row.approved_channels}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Discovery runs automatically via the ingestion cron. Every candidate must pass the halal-first
          moderation pipeline — no channel is auto-approved.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-lg font-medium">{value.toLocaleString()}</div>
    </div>
  );
}
