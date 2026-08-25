/**
 * /admin/creator-review — human review queue for native creator uploads.
 *
 * Approving requires the reviewer to explicitly confirm they watched the video
 * and it contains no women, no music and no inappropriate imagery. The DB
 * trigger refuses to publish anything whose visual_state is not `clean`.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, RefreshCcw, XCircle } from "lucide-react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useUploadPlayback } from "@/hooks/useCreatorStudio";

interface QueueRow {
  id: string;
  title: string;
  description: string | null;
  language: string;
  category: string | null;
  status: string;
  duration_seconds: number | null;
  created_at: string;
  creator: { display_name: string; handle: string; strikes: number } | null;
}

interface Summary {
  pending: number;
  approved: number;
  rejected: number;
  drafts: number;
  creators: number;
  oldest_pending_minutes: number;
}

function ReviewCard({ row, onDone }: { row: QueueRow; onDone: () => void }) {
  const { toast } = useToast();
  const playback = useUploadPlayback(row.id);
  const [verified, setVerified] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async (decision: "approve" | "reject") => {
    if (decision === "approve" && !verified) {
      toast({
        title: "Confirm the visual check first",
        description: "Approval requires an explicit halal imagery confirmation.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("creator-upload-review", {
      body: {
        upload_id: row.id,
        decision,
        visual_verified: decision === "approve" ? true : undefined,
        notes: notes || undefined,
        reason: decision === "reject" ? notes || "policy" : undefined,
      },
    });
    setBusy(false);
    if (error || !data?.ok) {
      toast({
        title: "Decision failed",
        description: error?.message ?? (data as { error?: string } | null)?.error ?? "Try again.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: decision === "approve" ? "Published" : "Rejected" });
    onDone();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{row.title}</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          {row.creator?.display_name ?? "unknown"} (@{row.creator?.handle ?? "—"}) ·{" "}
          {row.language.toUpperCase()} · {row.category ?? "uncategorised"} ·{" "}
          {new Date(row.created_at).toLocaleString()}
          {(row.creator?.strikes ?? 0) > 0 && (
            <Badge variant="destructive" className="ml-2">
              {row.creator?.strikes} strikes
            </Badge>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-lg bg-black">
          {playback.url ? (
            <video src={playback.url} controls playsInline className="aspect-video w-full" />
          ) : (
            <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">
              {playback.loading ? "Loading preview…" : playback.error ?? "No preview"}
            </div>
          )}
        </div>
        {row.description && (
          <p className="whitespace-pre-line text-xs text-muted-foreground">{row.description}</p>
        )}
        <label className="flex items-start gap-2 text-xs text-foreground">
          <Checkbox checked={verified} onCheckedChange={(v) => setVerified(v === true)} />
          <span>
            I watched this video: no women, no music or instrumentation, no inappropriate imagery,
            and the content is beneficial.
          </span>
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Notes shown to the creator (required for rejections)."
        />
        <div className="flex gap-2">
          <Button onClick={() => decide("approve")} disabled={busy} className="h-10 flex-1">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Approve
          </Button>
          <Button
            onClick={() => decide("reject")}
            disabled={busy}
            variant="destructive"
            className="h-10 flex-1"
          >
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminCreatorReview() {
  const { isModerator, loading: roleLoading } = useRole();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: queue }, { data: sum }] = await Promise.all([
      supabase
        .from("creator_uploads")
        .select(
          "id,title,description,language,category,status,duration_seconds,created_at,creator:creator_accounts(display_name,handle,strikes)",
        )
        .eq("status", "pending_review")
        .order("created_at", { ascending: true })
        .limit(40),
      supabase.rpc("creator_review_summary"),
    ]);
    setRows((queue ?? []) as unknown as QueueRow[]);
    setSummary((sum as unknown as Summary) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isModerator) void load();
  }, [isModerator, load]);

  if (roleLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isModerator) {
    return (
      <div className="container mx-auto max-w-md px-4 py-20 text-center">
        <SEO path="/admin/creator-review" title="Creator review — Heartify" description="Moderation queue." noindex />
        <p className="text-sm text-muted-foreground">You don't have access to this page.</p>
        <Button asChild variant="outline" className="mt-4 h-11">
          <Link to="/">Back home</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEO
        path="/admin/creator-review"
        title="Creator upload review — Heartify"
        description="Human review queue for native creator uploads."
        noindex
      />
      <div className="container mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Creator upload review</h1>
          <Button variant="outline" size="sm" onClick={load} className="h-9">
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Pending", summary.pending],
              ["Published", summary.approved],
              ["Rejected", summary.rejected],
              ["Creators", summary.creators],
              ["Oldest (min)", summary.oldest_pending_minutes],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Queue is empty — nothing awaiting review.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <ReviewCard key={row.id} row={row} onDone={load} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
