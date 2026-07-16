import { useEffect, useState } from "react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";

type Status = "operational" | "degraded" | "down" | "checking";

interface Component {
  key: string;
  name: string;
  status: Status;
  latency?: number;
}

const COMPONENTS: Array<{ key: string; name: string; probe: () => Promise<number> }> = [
  {
    key: "api",
    name: "Core API",
    probe: async () => {
      const start = performance.now();
      await supabase.from("feature_flags").select("key").limit(1);
      return performance.now() - start;
    },
  },
  {
    key: "auth",
    name: "Authentication",
    probe: async () => {
      const start = performance.now();
      await supabase.auth.getSession();
      return performance.now() - start;
    },
  },
  {
    key: "feed",
    name: "Video Feed",
    probe: async () => {
      const start = performance.now();
      await supabase.from("curated_videos").select("id").limit(1);
      return performance.now() - start;
    },
  },
  {
    key: "search",
    name: "Search",
    probe: async () => {
      const start = performance.now();
      await supabase.functions.invoke("search", { body: { q: "quran", limit: 1 } });
      return performance.now() - start;
    },
  },
];

function statusFromLatency(ms: number): Status {
  if (ms < 800) return "operational";
  if (ms < 3000) return "degraded";
  return "down";
}

const iconFor = (s: Status) => {
  if (s === "operational") return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
  if (s === "degraded") return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  if (s === "down") return <XCircle className="w-5 h-5 text-red-500" />;
  return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
};

const labelFor = (s: Status) => {
  if (s === "operational") return "Operational";
  if (s === "degraded") return "Degraded";
  if (s === "down") return "Down";
  return "Checking";
};

export default function Status() {
  const [components, setComponents] = useState<Component[]>(
    COMPONENTS.map((c) => ({ key: c.key, name: c.name, status: "checking" })),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        COMPONENTS.map(async (c) => {
          try {
            const latency = await c.probe();
            return { key: c.key, name: c.name, status: statusFromLatency(latency), latency };
          } catch {
            return { key: c.key, name: c.name, status: "down" as Status };
          }
        }),
      );
      if (!cancelled) setComponents(results);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const allOk = components.every((c) => c.status === "operational");
  const anyDown = components.some((c) => c.status === "down");
  const overall: Status = anyDown ? "down" : allOk ? "operational" : components.some((c) => c.status === "checking") ? "checking" : "degraded";

  return (
    <>
      <SEO
        title="System Status — Heartify"
        description="Live status of Heartify services: API, authentication, feed, and search."
        path="/status"
      />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <PageHeader
          title="System Status"
          subtitle="Live health of core Heartify services. Checks run from your browser against production endpoints."
        />

        <Card className="p-6 mb-6 flex items-center gap-4">
          {iconFor(overall)}
          <div>
            <div className="text-heading font-semibold">
              {overall === "operational" && "All systems operational"}
              {overall === "degraded" && "Some systems degraded"}
              {overall === "down" && "Service disruption detected"}
              {overall === "checking" && "Running checks…"}
            </div>
            <div className="text-sm text-muted-foreground">
              Last checked {new Date().toLocaleTimeString()}
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          {components.map((c) => (
            <Card key={c.key} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {iconFor(c.status)}
                <span className="font-medium">{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {c.latency !== undefined && (
                  <span className="text-micro text-muted-foreground tabular-nums">
                    {Math.round(c.latency)}ms
                  </span>
                )}
                <Badge variant={c.status === "operational" ? "secondary" : "destructive"}>
                  {labelFor(c.status)}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-micro text-muted-foreground mt-8 text-center">
          For incident history and postmortems, follow{" "}
          <a className="underline" href="mailto:status@heartify.app">status@heartify.app</a>.
        </p>
      </div>
    </>
  );
}
