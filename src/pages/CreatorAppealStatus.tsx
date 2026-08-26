/**
 * /studio/appeals — creator-facing appeal status.
 *
 * After a creator submits an appeal from Creator Studio they need one place
 * that answers three questions: what state is my appeal in, what did the
 * reviewer actually see, and what should I do next. RLS scopes every row to
 * the signed-in creator.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock, Gavel, Loader2, ShieldCheck, XCircle } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMyAppeals,
  useModerationTrail,
  type MyAppeal,
} from "@/hooks/useCreatorInsights";

const STATE: Record<
  MyAppeal["status"],
  { label: string; tone: string; icon: typeof Clock; next: string }
> = {
  open: {
    label: "Waiting for a reviewer",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    icon: Clock,
    next: "No action needed. A human reviewer picks appeals up in the order they arrive — usually within 48 hours.",
  },
  reviewing: {
    label: "Under review",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    icon: Gavel,
    next: "A reviewer is watching your video now. You will see the outcome here and in Creator Studio.",
  },
  upheld: {
    label: "Appeal accepted",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: ShieldCheck,
    next: "Your video is back in the review queue or already published. Check Creator Studio for its current status.",
  },
  declined: {
    label: "Appeal declined",
    tone: "bg-destructive/10 text-destructive",
    icon: XCircle,
    next: "The original decision stands. Re-upload an edited version that resolves the policy reason below — edits are always welcome.",
  },
};

function AppealCard({ appeal }: { appeal: MyAppeal }) {
  const [expanded, setExpanded] = useState(false);
  const trail = useModerationTrail(expanded ? (appeal.upload?.id ?? null) : null);
  const state = STATE[appeal.status] ?? STATE.open;
  const Icon = state.icon;

  return (
    <Card data-testid="creator-appeal-card">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {appeal.upload?.title ?? "Removed upload"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Opened {new Date(appeal.created_at).toLocaleDateString()}
              {appeal.resolved_at
                ? ` · resolved ${new Date(appeal.resolved_at).toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <Badge variant="secondary" className={`shrink-0 ${state.tone}`}>
            <Icon className="mr-1 h-3.5 w-3.5" /> {state.label}
          </Badge>
        </div>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">What happens next: </span>
          {state.next}
        </p>

        {appeal.resolution_notes && (
          <p className="rounded-lg border border-border/60 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Reviewer note: </span>
            {appeal.resolution_notes}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "Hide moderation trail" : "Moderation trail"}
          </Button>
          {appeal.upload?.id && (
            <Button asChild size="sm" variant="ghost" className="h-9">
              <Link to="/studio">Open in Studio</Link>
            </Button>
          )}
        </div>

        {expanded && (
          <div className="space-y-2 border-t border-border/60 pt-3">
            {trail.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : trail.data ? (
              <>
                <p className="text-xs font-medium text-foreground">
                  {trail.data.reason?.label ?? trail.data.upload.status.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {trail.data.reason?.guidance ??
                    trail.data.upload.review_notes ??
                    "No reviewer notes recorded."}
                </p>
                {trail.data.events.slice(0, 8).map((event) => (
                  <p
                    key={event.id}
                    className="rounded-md bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground"
                  >
                    {event.event.replace(/_/g, " ")} ·{" "}
                    {new Date(event.created_at).toLocaleString()}
                  </p>
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No moderation trail available.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CreatorAppealStatus() {
  const { user, loading } = useAuth();
  const appeals = useMyAppeals();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <SEO
        path="/studio/appeals"
        title="Appeal status — Heartify Creator Studio"
        description="Track the status of your Heartify upload appeals, read the moderation trail, and see exactly what to do next."
      />
      <PageHeader
        title="Appeal status"
        subtitle="Where each of your appeals stands, why the decision was made, and what to do next."
        icon={Gavel}
        actions={
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link to="/studio">
              <ArrowLeft className="mr-2 h-4 w-4" /> Studio
            </Link>
          </Button>
        }
      />
      <div className="container mx-auto max-w-2xl space-y-3 px-4 pb-24">
        {!user ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to see your appeal status.
              </p>
              <Button asChild className="mt-4 h-11 w-full">
                <Link to="/login">Sign in</Link>
              </Button>
            </CardContent>
          </Card>
        ) : appeals.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : (appeals.data ?? []).length === 0 ? (
          <div
            className="rounded-xl border border-dashed border-border py-14 text-center"
            data-testid="creator-appeals-empty"
          >
            <p className="text-sm text-muted-foreground">
              You have no open or past appeals.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
              If one of your uploads is rejected, open its moderation trail in Creator
              Studio and submit an appeal — it will appear here.
            </p>
            <Button asChild variant="outline" className="mt-4 h-11">
              <Link to="/studio">Go to Creator Studio</Link>
            </Button>
          </div>
        ) : (
          (appeals.data ?? []).map((appeal) => <AppealCard key={appeal.id} appeal={appeal} />)
        )}
      </div>
    </>
  );
}
