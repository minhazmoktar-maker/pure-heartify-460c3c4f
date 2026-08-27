import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, BookOpen, Bot, Coins, Loader2, MessageSquare, RefreshCw, ServerCog, ShieldAlert, Star } from "lucide-react";
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

/** Cost + cache telemetry from admin_support_ai_cost(). */
interface Cost {
  since: string;
  total_requests: number;
  llm_requests: number;
  no_llm_requests: number;
  no_llm_rate: number | null;
  exact_cache_hits: number;
  semantic_cache_hits: number;
  faq_hits: number;
  degraded: number;
  escalated: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  avg_cost_usd: number;
  avg_latency_ms: number;
  projected_monthly_usd: number;
  cache_entries: number;
  knowledge_version: number;
  by_layer: { layer: string; n: number; cost_usd: number }[];
  by_provider: { provider: string; model: string; n: number; cost_usd: number }[];
  top_questions: { question_norm: string; n: number; llm_n: number }[];
  providers: { provider: string; status: string; consecutive_failures: number; last_error: string | null }[];
}

/** Gap coverage by category from admin_support_gap_report(). */
interface GapReport {
  window_days: number;
  totals: { gaps: number; open: number; resolved: number; resolution_rate: number | null; pending_drafts: number };
  by_category: {
    category: string;
    gaps: number;
    open: number;
    resolved: number;
    dismissed: number;
    asks: number;
    resolution_rate: number | null;
    best_confidence: number | null;
    locales: string[];
    top_question: string | null;
    last_seen_at: string | null;
  }[];
  pending_drafts: {
    id: string;
    question: string;
    answer: string;
    category: string | null;
    locale: string | null;
    ask_count: number;
  }[];
}

/** Escalation / cache / scrub telemetry from admin_support_reliability(). */
interface Reliability {
  days: number;
  totals: {
    turns: number;
    escalations: number;
    escalation_rate: number | null;
    cache_hits: number;
    cache_hit_rate: number | null;
    llm_calls: number;
    zero_cost_rate: number | null;
    scrub_violations: number;
    scrub_violation_rate: number | null;
    validation_failures: number;
    degraded: number;
    injection_blocked: number;
  };
  series: { day: string; turns: number; escalation_rate: number; cache_hit_rate: number; scrub_violations: number }[];
  layers: { layer: string; turns: number; escalation_rate: number; avg_latency_ms: number | null }[];
  scrub_events: { created_at: string; layer: string; locale: string | null; topic: string | null; conversation_id: string | null }[];
}

const usd = (v: number | null | undefined) => (v == null ? "—" : `$${Number(v).toFixed(Number(v) < 1 ? 4 : 2)}`);

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
  const [cost, setCost] = useState<Cost | null>(null);
  const [gaps, setGaps] = useState<GapReport | null>(null);
  const [rel, setRel] = useState<Reliability | null>(null);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [quality, costs, gapReport, reliability] = await Promise.all([
      supabase.rpc("admin_support_quality", { _days: days }),
      supabase.rpc("admin_support_ai_cost", { _days: days }),
      supabase.rpc("admin_support_gap_report", { _days: days }),
      supabase.rpc("admin_support_reliability", { p_days: days }),
    ]);
    if (quality.error) toast.error(quality.error.message);
    else setData(quality.data as unknown as Quality);
    if (costs.error) console.warn("[admin] cost telemetry unavailable:", costs.error.message);
    else setCost(costs.data as unknown as Cost);
    if (gapReport.error) console.warn("[admin] gap report unavailable:", gapReport.error.message);
    else setGaps(gapReport.data as unknown as GapReport);
    if (reliability.error) console.warn("[admin] reliability unavailable:", reliability.error.message);
    else setRel(reliability.data as unknown as Reliability);
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

          {rel && (
            <section className="mt-6 rounded-card border border-border bg-card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                  <ShieldAlert aria-hidden className="h-4 w-4 text-primary" /> Reliability &amp; safety
                </h2>
                <button
                  type="button"
                  onClick={() => downloadJson(rel, "support-reliability.json")}
                  className="min-h-11 rounded-card border border-border px-3 text-sm hover:bg-muted"
                >
                  Export JSON
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Turns" value={String(rel.totals.turns)} />
                <Stat
                  label="Escalation rate"
                  value={rel.totals.escalation_rate == null ? "—" : `${rel.totals.escalation_rate}%`}
                  warn={(rel.totals.escalation_rate ?? 0) > 25}
                />
                <Stat
                  label="Cache hit rate"
                  value={rel.totals.cache_hit_rate == null ? "—" : `${rel.totals.cache_hit_rate}%`}
                  warn={(rel.totals.cache_hit_rate ?? 100) < 20}
                />
                <Stat
                  label="Scrub violations"
                  value={String(rel.totals.scrub_violations)}
                  warn={rel.totals.scrub_violations > 0}
                />
                <Stat
                  label="Zero-inference"
                  value={rel.totals.zero_cost_rate == null ? "—" : `${rel.totals.zero_cost_rate}%`}
                  warn={(rel.totals.zero_cost_rate ?? 100) < 50}
                />
                <Stat label="Degraded turns" value={String(rel.totals.degraded)} warn={rel.totals.degraded > 0} />
                <Stat label="Validator blocks" value={String(rel.totals.validation_failures)} />
                <Stat label="Injection blocked" value={String(rel.totals.injection_blocked)} />
              </div>

              {rel.totals.scrub_violations > 0 && (
                <p className="mt-3 flex items-start gap-2 rounded-card border border-destructive/40 bg-destructive/5 px-3 py-2 text-micro text-foreground">
                  <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  An answer had to be stripped of internal detail before sending. Treat each event as an incident and
                  review the originating layer below — alerts also fire automatically.
                </p>
              )}

              {!!rel.series.length && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <caption className="sr-only">Daily escalation, cache hit and scrub trend</caption>
                    <thead className="text-micro uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-1 text-start">Day</th>
                        <th scope="col" className="py-1 text-end">Turns</th>
                        <th scope="col" className="py-1 text-end">Escalation</th>
                        <th scope="col" className="py-1 text-end">Cache hits</th>
                        <th scope="col" className="py-1 text-end">Scrubs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rel.series.map((d) => (
                        <tr key={d.day} className="border-t border-border">
                          <td className="py-1.5">{d.day}</td>
                          <td className="py-1.5 text-end">{d.turns}</td>
                          <td className={`py-1.5 text-end ${d.escalation_rate > 25 ? "text-destructive" : ""}`}>
                            {d.escalation_rate}%
                          </td>
                          <td className={`py-1.5 text-end ${d.cache_hit_rate < 20 ? "text-destructive" : ""}`}>
                            {d.cache_hit_rate}%
                          </td>
                          <td className={`py-1.5 text-end ${d.scrub_violations > 0 ? "text-destructive" : ""}`}>
                            {d.scrub_violations}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!!rel.layers.length && (
                <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
                  {rel.layers.map((l) => (
                    <div key={l.layer} className="flex items-center justify-between rounded-card border border-border px-3 py-2 text-sm">
                      <span className="font-medium text-foreground">{l.layer}</span>
                      <span className="text-micro text-muted-foreground">
                        {l.turns} turns · {l.escalation_rate}% escalated · {l.avg_latency_ms ?? "—"} ms
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {cost && (
            <>
              <section className="mt-6 rounded-card border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                    <Coins aria-hidden className="h-4 w-4 text-primary" /> Cost &amp; cache efficiency
                  </h2>
                  <div className="flex gap-2">
                    <Link
                      to="/admin/support-knowledge"
                      className="flex min-h-11 items-center rounded-card border border-border px-3 text-sm text-foreground hover:bg-muted"
                    >
                      Manage knowledge
                    </Link>
                    <button
                      type="button"
                      onClick={() => downloadJson(cost, "support-ai-cost.json")}
                      className="min-h-11 rounded-card border border-border px-3 text-sm hover:bg-muted"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Support questions" value={String(cost.total_requests)} />
                  <Stat
                    label="Resolved without AI"
                    value={pct(cost.no_llm_rate)}
                    warn={(cost.no_llm_rate ?? 1) < 0.7}
                  />
                  <Stat label="AI calls" value={String(cost.llm_requests)} />
                  <Stat label="Spend (range)" value={usd(cost.cost_usd)} />
                  <Stat label="Avg cost / question" value={usd(cost.avg_cost_usd)} />
                  <Stat label="Projected monthly" value={usd(cost.projected_monthly_usd)} />
                  <Stat label="Cached answers" value={String(cost.cache_entries)} />
                  <Stat label="Degraded replies" value={String(cost.degraded)} warn={cost.degraded > 0} />
                </div>
                <p className="mt-3 text-micro text-muted-foreground">
                  Target: more than 70% of questions answered from the exact cache, semantic cache or deterministic FAQ.
                  Exact {cost.exact_cache_hits} · semantic {cost.semantic_cache_hits} · FAQ {cost.faq_hits} ·
                  tokens in {cost.prompt_tokens.toLocaleString()} / out {cost.completion_tokens.toLocaleString()} ·
                  knowledge version {cost.knowledge_version}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cost.by_layer.map((l) => (
                    <span key={l.layer} className="rounded-full border border-border px-3 py-1 text-micro text-foreground">
                      {l.layer.replace(/_/g, " ")} · {l.n} · {usd(l.cost_usd)}
                    </span>
                  ))}
                </div>
              </section>

              <section className="mt-6 rounded-card border border-border bg-card p-4">
                <h2 className="mb-2 flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                  <ServerCog aria-hidden className="h-4 w-4 text-primary" /> Inference providers
                </h2>
                {cost.providers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No provider has been used yet. Until an independent provider is configured, the assistant answers in
                    degraded mode from the FAQ and knowledge base only.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {cost.providers.map((p) => (
                      <li key={p.provider} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-foreground">{p.provider}</span>
                        <span className={p.status === "healthy" ? "text-muted-foreground" : "text-destructive"}>
                          {p.status}
                          {p.consecutive_failures > 0 && ` · ${p.consecutive_failures} consecutive failures`}
                          {p.last_error && ` · ${p.last_error.slice(0, 80)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {cost.by_provider.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cost.by_provider.map((p) => (
                      <span key={`${p.provider}-${p.model}`} className="rounded-full border border-border px-3 py-1 text-micro text-foreground">
                        {p.provider}/{p.model} · {p.n} · {usd(p.cost_usd)}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-6">
                <h2 className="mb-2 font-heading text-lg font-semibold text-foreground">
                  Top questions (cache candidates)
                </h2>
                <div className="overflow-x-auto rounded-card border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-micro uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="p-2 text-start">Normalised question</th>
                        <th className="p-2 text-start">Asked</th>
                        <th className="p-2 text-start">Needed AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cost.top_questions.length === 0 && (
                        <tr><td colSpan={3} className="p-3 text-muted-foreground">No questions in this range.</td></tr>
                      )}
                      {cost.top_questions.map((q) => (
                        <tr key={q.question_norm} className="border-t border-border">
                          <td className="max-w-[26rem] p-2 text-foreground">{q.question_norm}</td>
                          <td className="p-2 text-muted-foreground">{q.n}</td>
                          <td className={`p-2 ${q.llm_n > 0 ? "text-destructive" : "text-muted-foreground"}`}>{q.llm_n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-micro text-muted-foreground">
                  Questions that still need AI on every ask should get a deterministic FAQ answer in the knowledge editor.
                </p>
              </section>
            </>
          )}



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

          {gaps && (
            <section className="mt-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
                  <BookOpen aria-hidden className="h-4 w-4 text-primary" /> Gap coverage by category
                </h2>
                <span className="text-micro text-muted-foreground">
                  {gaps.totals.open} open · {pct(gaps.totals.resolution_rate)} resolved ·{" "}
                  {gaps.totals.pending_drafts} draft{gaps.totals.pending_drafts === 1 ? "" : "s"} awaiting approval
                </span>
              </div>
              <p className="mb-2 text-micro text-muted-foreground">
                Where the assistant runs out of knowledge, grouped by support category. Low resolution rates with high
                ask counts are the articles worth writing next.
              </p>
              <div className="overflow-x-auto rounded-card border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-micro uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-2 text-start">Category</th>
                      <th className="p-2 text-start">Asks</th>
                      <th className="p-2 text-start">Open</th>
                      <th className="p-2 text-start">Resolved</th>
                      <th className="p-2 text-start">Languages</th>
                      <th className="p-2 text-start">Most asked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.by_category.length === 0 && (
                      <tr><td colSpan={6} className="p-3 text-muted-foreground">No gaps in this range.</td></tr>
                    )}
                    {gaps.by_category.map((c) => (
                      <tr key={c.category} className="border-t border-border">
                        <td className="p-2 text-foreground">{c.category.replace(/_/g, " ")}</td>
                        <td className="p-2 text-muted-foreground">{c.asks}</td>
                        <td className={`p-2 ${c.open > 0 ? "text-destructive" : "text-muted-foreground"}`}>{c.open}</td>
                        <td className="p-2 text-muted-foreground">{c.resolved} ({pct(c.resolution_rate)})</td>
                        <td className="p-2 text-muted-foreground">{(c.locales ?? []).join(", ") || "—"}</td>
                        <td className="max-w-[20rem] p-2 text-muted-foreground">{c.top_question ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {gaps.pending_drafts.length > 0 && (
                <div className="mt-3 rounded-card border border-border bg-card p-4">
                  <h3 className="mb-1 font-heading text-sm font-semibold text-foreground">
                    Suggested FAQ answers awaiting approval
                  </h3>
                  <p className="mb-3 text-micro text-muted-foreground">
                    Drafted from repeated unanswered questions. Review and publish them in the{" "}
                    <Link to="/admin/support-knowledge" className="underline">knowledge editor</Link>.
                  </p>
                  <ul className="space-y-2">
                    {gaps.pending_drafts.slice(0, 8).map((d) => (
                      <li key={d.id} className="rounded-card border border-border p-3">
                        <p className="text-sm font-medium text-foreground">{d.question}</p>
                        <p className="mt-1 line-clamp-2 text-micro text-muted-foreground">{d.answer}</p>
                        <p className="mt-1 text-micro text-muted-foreground">
                          {(d.category ?? "unclassified").replace(/_/g, " ")} · {d.locale ?? "en"} · asked {d.ask_count}×
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

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
