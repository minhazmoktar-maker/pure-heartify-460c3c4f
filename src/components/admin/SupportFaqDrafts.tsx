import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Review queue for FAQ answers the assistant proposed after repeatedly failing
 * to answer the same question.
 *
 * Nothing here reaches users until an admin approves it: the agent only ever
 * suggests the question and a draft body, and approval is what publishes an
 * authoritative FAQ pair into the knowledge base (and bumps the knowledge
 * version, invalidating stale cached answers).
 */

interface FaqDraft {
  id: string;
  question: string;
  normalized_question: string;
  suggested_answer: string | null;
  topic: string | null;
  language: string;
  ask_count: number;
  status: string;
  created_at: string;
}

export default function SupportFaqDrafts({ onPublished }: { onPublished?: () => void }) {
  const [drafts, setDrafts] = useState<FaqDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_faq_drafts")
      .select("id, question, normalized_question, suggested_answer, topic, language, ask_count, status, created_at")
      .eq("status", "needs_approval")
      .order("ask_count", { ascending: false })
      .limit(50);
    if (error) toast.error(error.message);
    else setDrafts((data ?? []) as FaqDraft[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const review = async (draft: FaqDraft, approve: boolean) => {
    const answer = (answers[draft.id] ?? draft.suggested_answer ?? "").trim();
    if (approve && answer.length < 20) {
      toast.error("Write the authoritative answer before approving.");
      return;
    }
    setBusyId(draft.id);
    const { error } = await supabase.rpc("admin_review_faq_draft", {
      _draft_id: draft.id,
      _approve: approve,
      _answer: approve ? answer : null,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approve ? "FAQ published — future asks answer with no AI call." : "Draft rejected.");
    setDrafts((d) => d.filter((x) => x.id !== draft.id));
    if (approve) onPublished?.();
  };

  if (loading) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-card border border-border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Loading suggested FAQs…
      </div>
    );
  }

  if (drafts.length === 0) return null;

  return (
    <section aria-labelledby="faq-drafts-heading" className="mb-4 rounded-card border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles aria-hidden className="h-4 w-4 text-primary" />
        <h2 id="faq-drafts-heading" className="font-heading text-sm font-semibold text-foreground">
          Suggested FAQs ({drafts.length})
        </h2>
      </div>
      <p className="mb-3 text-micro text-muted-foreground">
        Questions users asked repeatedly that the assistant could not answer confidently. Approving one publishes an
        authoritative FAQ answered without any AI call.
      </p>

      <ul className="space-y-3">
        {drafts.map((d) => (
          <li key={d.id} className="rounded-card border border-border/70 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{d.question}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-micro text-muted-foreground">
                asked {d.ask_count}×
              </span>
              {d.topic && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-micro text-muted-foreground">{d.topic}</span>
              )}
            </div>
            <label className="block">
              <span className="sr-only">Authoritative answer for “{d.question}”</span>
              <textarea
                value={answers[d.id] ?? d.suggested_answer ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [d.id]: e.target.value }))}
                rows={4}
                placeholder="Write the answer exactly as Heartify support should state it…"
                className="field-input w-full resize-y text-sm"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === d.id}
                onClick={() => void review(d, true)}
                className="flex min-h-11 items-center gap-2 rounded-card bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {busyId === d.id ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Check aria-hidden className="h-4 w-4" />}
                Approve &amp; publish
              </button>
              <button
                type="button"
                disabled={busyId === d.id}
                onClick={() => void review(d, false)}
                className="flex min-h-11 items-center gap-2 rounded-card border border-border px-3 text-sm text-foreground hover:bg-muted disabled:opacity-60"
              >
                <X aria-hidden className="h-4 w-4" /> Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
