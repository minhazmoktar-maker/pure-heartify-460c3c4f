import { useState } from "react";
import { ShieldCheck, PlayCircle, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { tracks } from "@/data/audio";
import { toast } from "sonner";

interface BrokenRow {
  track_id: string; track_title: string | null; url: string | null;
  status: string; http_status: number | null; error: string | null;
  latency_ms: number | null;
}
interface RunResult {
  run_id: string;
  total: number;
  summary: Record<string, number>;
  broken: BrokenRow[];
}

const statusColor: Record<string, string> = {
  ok: "text-emerald-600",
  coming_soon: "text-muted-foreground",
  unreachable: "text-destructive",
  wrong_type: "text-destructive",
  forbidden: "text-destructive",
  too_small: "text-amber-600",
  timeout: "text-amber-600",
  error: "text-destructive",
};

const AudioIntegrity = () => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const run = async () => {
    setRunning(true);
    const payload = {
      tracks: tracks.map((t) => ({
        id: t.id, title: t.title, url: t.url, comingSoon: t.comingSoon,
      })),
      concurrency: 6,
    };
    const { data, error } = await supabase.functions.invoke("audio-integrity-check", {
      body: payload,
    });
    setRunning(false);
    if (error) {
      toast.error("Integrity scan failed", { description: error.message });
      return;
    }
    setResult(data as RunResult);
    toast.success("Scan complete", {
      description: `${(data as RunResult).total} tracks checked.`,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Premium audio integrity
          </h1>
          <p className="text-sm text-muted-foreground">
            Scans every catalog URL, verifies loadability and MIME type, and stores a run report.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-60"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          {running ? "Scanning…" : "Run scan"}
        </button>
      </div>

      {result && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(result.summary).map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-card p-3">
                <p className={`text-xs font-semibold uppercase tracking-wide ${statusColor[k] ?? "text-muted-foreground"}`}>
                  {k.replace("_", " ")}
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">{v}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-3 text-sm font-semibold">
              {result.broken.length === 0
                ? <span className="flex items-center gap-2 text-emerald-600"><CheckCircle2 className="h-4 w-4" />All tracks passed.</span>
                : <span className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />{result.broken.length} broken items</span>}
            </div>
            <ul className="divide-y divide-border">
              {result.broken.map((r) => (
                <li key={r.track_id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{r.track_title ?? r.track_id}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.url ?? "(no url)"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <span className={`flex items-center gap-1 ${statusColor[r.status] ?? "text-muted-foreground"}`}>
                      <XCircle className="h-3.5 w-3.5" />{r.status}
                    </span>
                    {r.http_status != null && <span className="text-muted-foreground">HTTP {r.http_status}</span>}
                    {r.latency_ms != null && <span className="text-muted-foreground">{r.latency_ms}ms</span>}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">Run ID: <code>{result.run_id}</code></p>
        </>
      )}
    </div>
  );
};

export default AudioIntegrity;
