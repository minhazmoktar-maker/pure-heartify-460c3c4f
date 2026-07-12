import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAppeals, type Appeal } from "@/hooks/useAppeals";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE: Record<Appeal["status"], string> = {
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  denied: "bg-red-500/15 text-red-700 dark:text-red-300",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function Appeals() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { appeals, isLoading, submit, withdraw } = useAppeals();

  const [subjectKind, setSubjectKind] = useState<Appeal["subject_kind"]>(
    (params.get("kind") as Appeal["subject_kind"]) || "video"
  );
  const [subjectRef, setSubjectRef] = useState(params.get("ref") ?? "");
  const [reason, setReason] = useState("");

  if (!user) {
    return (
      <div className="container mx-auto max-w-xl px-4 py-16 text-center">
        <SEO title="Appeals — Heartify" description="Appeal a moderation decision." />
        <p className="text-lg font-semibold">Sign in to file or view appeals</p>
        <Link to="/login" className="mt-4 inline-block text-primary hover:underline">Sign in</Link>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Appeals — Heartify"
        description="Appeal a moderation decision. We review every request from a real human."
      />
      <PageHeader
        title="Appeals"
        subtitle="If a video, comment, or account action seems wrong, tell us — a real reviewer will read it."
      />
      <div className="container mx-auto grid max-w-5xl gap-8 px-4 pb-16 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">File an appeal</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">What is this about?</label>
              <Select value={subjectKind} onValueChange={(v) => setSubjectKind(v as Appeal["subject_kind"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video removal</SelectItem>
                  <SelectItem value="comment">Comment removal</SelectItem>
                  <SelectItem value="channel">Channel decision</SelectItem>
                  <SelectItem value="account">Account action</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Reference (video ID, comment ID, etc.)</label>
              <Input value={subjectRef} onChange={(e) => setSubjectRef(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Why should we reconsider?</label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                minLength={10}
                maxLength={4000}
                placeholder="Please share context. Minimum 10 characters."
              />
              <p className="mt-1 text-xs text-muted-foreground">{reason.length}/4000</p>
            </div>
            <Button
              className="w-full"
              disabled={submit.isPending || reason.trim().length < 10 || subjectRef.trim().length === 0}
              onClick={async () => {
                const decisionId = params.get("decisionId") ?? undefined;
                await submit.mutateAsync({ subjectKind, subjectRef: subjectRef.trim(), reason, decisionId });
                setReason("");
                nav("/appeals", { replace: true });
              }}
            >
              Submit appeal
            </Button>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-base font-semibold text-foreground">Your appeals</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : appeals.length === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't filed any appeals.</p>
          ) : (
            <ul className="space-y-3">
              {appeals.map((a) => (
                <li key={a.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{a.subject_kind} · {a.subject_ref}</span>
                    <Badge className={STATUS_BADGE[a.status]}>{a.status}</Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.reason}</p>
                  {a.resolution && (
                    <p className="mt-2 border-t border-border pt-2 text-sm">
                      <span className="font-medium">Reviewer:</span> {a.resolution}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Filed {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                    {a.status === "open" && (
                      <button
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                        onClick={() => withdraw.mutate(a.id)}
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
