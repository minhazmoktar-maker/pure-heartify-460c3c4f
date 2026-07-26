import { useMemo, useState } from "react";
import { Copy, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearDiag, formatDiag, readDiag, type DiagChannel } from "@/lib/diagnostics";
import { useStreak } from "@/hooks/useStreak";

const TABS: { id: DiagChannel | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "streak", label: "Streak" },
  { id: "download", label: "Downloads" },
];

/**
 * On-device diagnostics viewer (/diagnostics). Lets a real iOS/Android user
 * copy the streak + download event trail without a desktop console.
 */
export default function Diagnostics() {
  const [tab, setTab] = useState<DiagChannel | "all">("all");
  const [nonce, setNonce] = useState(0);
  const streak = useStreak();

  const entries = useMemo(
    () => readDiag(tab === "all" ? undefined : tab).slice().reverse(),
    [tab, nonce],
  );

  const copy = async () => {
    const text = formatDiag(tab === "all" ? undefined : tab);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Diagnostics copied");
    } catch {
      toast.error("Copy blocked — long-press the log below instead");
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
      <h1 className="text-2xl font-bold text-foreground">Diagnostics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Local-only event trail for streak and download issues. Nothing here is uploaded.
      </p>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Current streak", `${streak.current} d`],
          ["Longest", `${streak.longest} d`],
          ["Last completed", streak.lastCompletedDate ?? "—"],
          ["Freezes", String(streak.freezes)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-card border border-border bg-card p-3">
            <p className="text-micro text-muted-foreground">{k}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{v}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-pill px-3 py-1.5 text-sm ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { clearDiag(); setNonce((n) => n + 1); }}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No events yet. Play audio or tap a download, then come back.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {entries.map((e, i) => (
            <li key={`${e.t}-${i}`} className="rounded-card border border-border bg-card p-3">
              <p className="text-micro text-muted-foreground">
                {new Date(e.t).toLocaleString()} · local {e.localDate} · UTC
                {e.tz >= 0 ? "+" : ""}{(e.tz / 60).toFixed(1)}h
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {e.ch}.{e.event}
              </p>
              {e.data && (
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-muted-foreground">
                  {JSON.stringify(e.data)}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
