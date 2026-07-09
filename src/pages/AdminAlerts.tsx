import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  kind: string;
  severity: string;
  message: string;
  context: Record<string, unknown>;
  route: string | null;
  user_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

const KIND_LABEL: Record<string, string> = {
  permission_denied: "Permission Denied",
  watch_playback_failure: "Watch Playback Failure",
  watch_iframe_error: "Watch Iframe Error",
  network_error: "Network Error",
  unexpected_error: "Unexpected Error",
};

const SEV_COLOR: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warn: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  error: "bg-destructive/15 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("production_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!showResolved) q = q.is("resolved_at", null);
    const { data, error } = await q;
    if (error) {
      toast({ title: "Failed to load alerts", description: error.message, variant: "destructive" });
    } else {
      setAlerts((data as Alert[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [showResolved]);

  const resolve = async (id: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("production_alerts")
      .update({ resolved_at: new Date().toISOString(), resolved_by: userRes.user?.id ?? null })
      .eq("id", id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      void load();
    }
  };

  const grouped = alerts.reduce<Record<string, number>>((acc, a) => {
    if (!a.resolved_at) acc[a.kind] = (acc[a.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Runtime errors reported by the app — permission denials, playback failures, and more.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? "Hide resolved" : "Show resolved"}
          </Button>
          <Button onClick={load}>Refresh</Button>
        </div>
      </header>

      {Object.keys(grouped).length > 0 && (
        <Card className="p-4 flex flex-wrap gap-3">
          {Object.entries(grouped).map(([k, n]) => (
            <Badge key={k} variant="secondary">
              {KIND_LABEL[k] ?? k}: {n}
            </Badge>
          ))}
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : alerts.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No alerts. All quiet 🎉</Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEV_COLOR[a.severity] ?? ""}`}>
                      {a.severity.toUpperCase()}
                    </span>
                    <Badge variant="outline">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                    {a.route && <span className="text-xs text-muted-foreground">{a.route}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm break-words">{a.message}</p>
                  {Object.keys(a.context ?? {}).length > 0 && (
                    <pre className="mt-2 text-xs bg-muted rounded p-2 overflow-x-auto max-h-40">
                      {JSON.stringify(a.context, null, 2)}
                    </pre>
                  )}
                </div>
                {!a.resolved_at && (
                  <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>
                    Resolve
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
