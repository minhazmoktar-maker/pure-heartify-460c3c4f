import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, BookOpen, Bot, Loader2, MessageSquare, RefreshCw, Star } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, downloadJson } from "@/lib/download";

interface Quality {
  since: string;
  conversations: number;
  messages: number;
  grounded_rate: number | null;
  avg_confidence: number | null;
  p95_latency_ms: number | null;
  escalation_rate: number | null;
  satisfaction: number | null;
  feedback_count: number;
  open_gaps: number;
  open_escalations: number;
  kb_published: number;
  kb_unindexed: number;
  top_topics: { topic: string; n: number }[];
  top_gaps: { id: string; sample_question: string; topic: string | null; ask_count: number; last_seen_at: string }[];
}

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-card border border-border bg-card p-3">
      <p className="text-micro text-muted-foreground">{label}</p>
      <p className={`mt-1 font-heading text-lg font-semibold ${warn ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * Admin console for the Help assistant: answer quality, escalations,
 * knowledge gaps (questions it could not answer) and KB indexing health.
 */
export default function AdminSupportAI() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Quality | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("admin_support_quality", { _days: days });
    if (error) toast.error(error.message);
    else setData(res as unknown as Quality);
    setLoading(false);
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  const reindex = async (force: boolean) => {
    setIndexing(true);
    const { data: res, error } = await supabase.functions.invoke("support-kb-index", { body: { force } });
    setIndexing(false);
    if (error) {
      toast.error("Indexing failed — see function logs.");
      return;
    }
    toast.success(`Indexed ${(res as { documents?: number })?.documents ?? 0} help articles.`);
    void load();
  };

  const resolveGap = async (id: string, status: "resolved" | "wont_fix" | "writing") => {
    const { error } = await supabase.from("support_knowledge_gaps").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Gap updated.");
      void load();
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6">
      <SEO title="Support AI — Heartify Admin" description="Help assistant quality, gaps and escalations." path="/admin/support-ai" />

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Bot aria-hidden className="h-5 w-5 text-primary" />
            <span className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">Support AI</span>
          </div>
          <h1 className="font-heading text-heading font-bold text-foreground">Help assistant health</h1>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="range" className="sr-only">Time range</label>
          <select
            id="range"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="field-input min-h-11"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="flex min-h-11 items-center gap-2 rounded-card border border-border px-3 text-sm text-foreground hover:bg-muted"
          >
            <RefreshCw aria-hidden className="h-4 w-4" /> Refresh
          </button>
        </div>
      </header>

      {loading && !data ? (
        <div className="flex items-center gap-2 p-8 text-muted-foreground">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : data ? (
        <>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Conversations" value={String(data.conversations)} />
            <Stat label="Assistant answers" value={String(data.messages)} />
            <Stat label="Grounded in KB" value={pct(data.grounded_rate)} warn={(data.grounded_rate ?? 1) < 0.8} />
            <Stat label="Avg confidence" value={data.avg_confidence == null ? "—" : data.avg_confidence.toFixed(2)} />
            <Stat label="Escalation rate" value={pct(data.escalation_rate)} warn={(data.escalation_rate ?? 0) > 0.3} />
            <Stat label="Satisfaction" value={pct(data.satisfaction)} warn={(data.satisfaction ?? 1) < 0.7} />
            <Stat label="p95 latency" value={data.p95_latency_ms ? `${data.p95_latency_ms} ms` : "—"} warn={(data.p95_latency_ms ?? 0) > 8000} />
            <Stat label="Open escalations" value={String(data.open_escalations)} warn={data.open_escalations > 0} />
          </section>

          <section className="mt-6 rounded-card border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen aria-hidden className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Knowledge base: {data.kb_published} published
                  {data.kb_unindexed > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                      <AlertTriangle aria-hidden className="h-3.5 w-3.5" /> {data.kb_unindexed} not indexed
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={indexing}
                  onClick={() => void reindex(false)}
                  className="min-h-11 rounded-card border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
                >
                  {indexing ? "Indexing…" : "Index missing"}
                </button>
                <button
                  type="button"
                  disabled={indexing}
                  onClick={() => void reindex(true)}
                  className="min-h-11 rounded-card bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Re-index all
                </button>
              </div>
            </div>
            {data.kb_unindexed > 0 && (
              <p className="mt-2 text-micro text-muted-foreground">
                Unindexed articles cannot be retrieved semantically, which pushes the assistant toward escalation.
                Index them before investigating a grounding dip.
              </p>
            )}
          </section>

          <section className="mt-6">
            <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
              <MessageSquare aria-hidden className="h-4 w-4 text-primary" /> Top topics
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.top_topics.length === 0 && <p className="text-sm text-muted-foreground">No conversations yet.</p>}
              {data.top_topics.map((t) => (
                <span key={t.topic} className="rounded-full border border-border bg-card px-3 py-1 text-micro text-foreground">
                  {t.topic.replace(/_/g, " ")} · {t.n}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                <Star aria-hidden className="h-4 w-4 text-primary" /> Knowledge gaps ({data.open_gaps} open)
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadCsv(data.top_gaps, "support-knowledge-gaps.csv")}
                  className="min-h-11 rounded-card border border-border px-3 text-sm hover:bg-muted"
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => downloadJson(data, "support-quality.json")}
                  className="min-h-11 rounded-card border border-border px-3 text-sm hover:bg-muted"
                >
                  Export JSON
                </button>
              </div>
            </div>
            <p className="mb-2 text-micro text-muted-foreground">
              Questions the assistant could not answer from the knowledge base. Each one is an article waiting to be
              written — publish it, then re-index.
            </p>
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-start text-micro uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="p-2 text-start">Question</th>
                    <th className="p-2 text-start">Topic</th>
                    <th className="p-2 text-start">Asked</th>
                    <th className="p-2 text-start">Last seen</th>
                    <th className="p-2 text-start">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_gaps.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-muted-foreground">No open gaps.</td></tr>
                  )}
                  {data.top_gaps.map((g) => (
                    <tr key={g.id} className="border-t border-border">
                      <td className="max-w-[22rem] p-2 text-foreground">{g.sample_question}</td>
                      <td className="p-2 text-muted-foreground">{g.topic?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="p-2 text-muted-foreground">{g.ask_count}</td>
                      <td className="p-2 text-muted-foreground">{new Date(g.last_seen_at).toLocaleDateString()}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => void resolveGap(g.id, "writing")} className="min-h-11 rounded-card border border-border px-2 text-micro hover:bg-muted">Writing</button>
                          <button type="button" onClick={() => void resolveGap(g.id, "resolved")} className="min-h-11 rounded-card border border-border px-2 text-micro hover:bg-muted">Resolved</button>
                          <button type="button" onClick={() => void resolveGap(g.id, "wont_fix")} className="min-h-11 rounded-card border border-border px-2 text-micro hover:bg-muted">Won't fix</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-6 text-micro text-muted-foreground">
            The public surface lives at <Link to="/help" className="underline">/help</Link>.
          </p>
        </>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">No data.</p>
      )}
    </main>
  );
}
