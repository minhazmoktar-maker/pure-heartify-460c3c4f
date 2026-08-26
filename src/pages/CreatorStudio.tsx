/**
 * /studio — Heartify Creator Studio.
 *
 * Mobile-first: single-column, 44px targets, one primary action per screen
 * section. Creators onboard once, then upload halal Islamic content that flows
 * into the same moderation pipeline as the curated corpus.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, FileQuestion, Loader2, RotateCcw, ShieldCheck, Upload, Video } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CaptionQualityPanel from "@/components/CaptionQualityPanel";
import CaptionReviewPanel from "@/components/CaptionReviewPanel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  UPLOAD_CATEGORIES,
  UPLOAD_LANGUAGES,
  useCreatorAccount,
  useCreatorUpload,
  useMyUploads,
  type UploadStatus,
} from "@/hooks/useCreatorStudio";
import {
  useCreatorAnalytics,
  useModerationTrail,
  useSubmitAppeal,
  useTelemetryHealth,
} from "@/hooks/useCreatorInsights";

const STATUS_TONE: Record<UploadStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  uploading: "bg-muted text-muted-foreground",
  pending_review: "bg-primary/10 text-primary",
  approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/10 text-destructive",
  removed: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<UploadStatus, string> = {
  draft: "Draft",
  uploading: "Incomplete upload",
  pending_review: "In review",
  approved: "Published",
  rejected: "Not accepted",
  removed: "Removed",
};

function CreatorOnboarding({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  const handleValid = /^[a-z0-9._-]{3,32}$/.test(handle);

  const submit = async () => {
    if (!user) return;
    if (displayName.trim().length < 2 || !handleValid) {
      toast({
        title: "Check your details",
        description: "Add a name and a handle of 3–32 lowercase letters, numbers, dot, dash or underscore.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("creator_accounts").insert({
      user_id: user.id,
      display_name: displayName.trim(),
      handle: handle.trim().toLowerCase(),
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({
        title: "Couldn't create your creator profile",
        description: error.message.includes("duplicate")
          ? "That handle is already taken."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Creator profile ready", description: "You can publish your first video now." });
    onCreated();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Become a Heartify creator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Publish beneficial Islamic content to a community that came here to learn, not to scroll.
          Every upload passes the same halal review as the rest of Heartify.
        </p>
        <div className="space-y-2">
          <Label htmlFor="creator-name">Creator name</Label>
          <Input
            id="creator-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Madrasah Al-Huda"
            maxLength={80}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="creator-handle">Handle</Label>
          <Input
            id="creator-handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            placeholder="al-huda"
            className="h-11"
          />
          {handle.length > 0 && !handleValid && (
            <p className="text-xs text-destructive">
              3–32 characters: lowercase letters, numbers, dot, dash, underscore.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="creator-bio">About you</Label>
          <Textarea
            id="creator-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What you teach, and who you learned from."
            maxLength={600}
            rows={3}
          />
        </div>
        <Button onClick={submit} disabled={saving} className="h-11 w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create creator profile
        </Button>
      </CardContent>
    </Card>
  );
}

function UploadForm() {
  const { toast } = useToast();
  const { upload, retry, cancel, progress, reset, canResume } = useCreatorUpload();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("bn");
  const [category, setCategory] = useState("dawah");
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const busy = progress.phase === "validating" || progress.phase === "uploading" || progress.phase === "submitting";

  const submit = async () => {
    if (!file) {
      toast({ title: "Choose a video first", variant: "destructive" });
      return;
    }
    const result = await upload({ title, description, language, category, file, thumbnail });
    toast({
      title: result.ok ? "Submitted for review" : "Upload not accepted",
      description: result.message,
      variant: result.ok ? undefined : "destructive",
    });
    if (result.ok) {
      setTitle("");
      setDescription("");
      setFile(null);
      setThumbnail(null);
      reset();
    }
  };

  const retryUpload = async () => {
    const result = await retry();
    toast({
      title: result.ok ? "Upload resumed" : "Still interrupted",
      description: result.message,
      variant: result.ok ? undefined : "destructive",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Upload className="h-4 w-4" /> Upload a video
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="upload-title">Title</Label>
          <Input
            id="upload-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="The manners of seeking knowledge"
            maxLength={160}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-desc">Description</Label>
          <Textarea
            id="upload-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="What the viewer will learn, and any sources you cite."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UPLOAD_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UPLOAD_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-file">Video file (mp4, mov or webm — up to 2GB)</Label>
          <Input
            id="upload-file"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-thumb">Thumbnail (optional)</Label>
          <Input
            id="upload-thumb"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setThumbnail(e.target.files?.[0] ?? null)}
            className="h-11"
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/40 p-3">
          <p className="flex items-center gap-2 text-xs font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Halal publishing rules
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            <li>No music or instrumentation, no female voices or imagery.</li>
            <li>Cite the scholar or source you are transmitting from.</li>
            <li>No clickbait titles, no political agitation, no fundraising appeals.</li>
            <li>Every upload is reviewed by a human before it becomes visible.</li>
          </ul>
        </div>

        {busy && (
          <div className="space-y-1.5">
            <Progress value={progress.percent} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {progress.message}{progress.resumed ? " Resumed from the last saved chunk." : ""}
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={cancel} className="h-8 shrink-0">
                Pause
              </Button>
            </div>
          </div>
        )}
        {progress.phase === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-xs text-destructive">{progress.message}</p>
            {progress.retryable && canResume && (
              <Button type="button" size="sm" variant="outline" onClick={retryUpload} className="mt-2 h-9">
                <RotateCcw className="mr-2 h-4 w-4" /> Resume upload
              </Button>
            )}
          </div>
        )}

        <Button onClick={submit} disabled={busy || !title.trim()} className="h-11 w-full">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {busy ? "Uploading…" : "Submit for review"}
        </Button>
      </CardContent>
    </Card>
  );
}

function UploadModerationActions({ upload }: { upload: { id: string; status: UploadStatus; title: string } }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const trail = useModerationTrail(open ? upload.id : null);
  const appeal = useSubmitAppeal();
  const canAppeal = upload.status === "rejected" || upload.status === "removed";

  const submitAppeal = async () => {
    try {
      await appeal.mutateAsync({ uploadId: upload.id, message });
      toast({
        title: "Appeal opened",
        description: "Track it any time under Studio → Appeals.",
      });
      setMessage("");
      setOpen(false);
    } catch (error) {
      toast({ title: "Could not open appeal", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-2 h-9">
          <FileQuestion className="mr-2 h-4 w-4" /> Moderation trail
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{upload.title}</DialogTitle>
          <DialogDescription>Review status, policy reason, notes and appeal history.</DialogDescription>
        </DialogHeader>
        {trail.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : trail.data ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border/60 p-3">
              <p className="font-medium">{trail.data.reason?.label ?? trail.data.upload.status.replace("_", " ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {trail.data.reason?.guidance ?? trail.data.upload.review_notes ?? "No reviewer notes yet."}
              </p>
            </div>
            <div className="space-y-2">
              {trail.data.events.slice(0, 6).map((event) => (
                <p key={event.id} className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  {event.event.replace(/_/g, " ")} · {new Date(event.created_at).toLocaleString()}
                </p>
              ))}
            </div>
            {trail.data.appeals.length > 0 && (
              <div className="rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
                Latest appeal: {trail.data.appeals[0].status} · {new Date(trail.data.appeals[0].created_at).toLocaleDateString()}
              </div>
            )}
            {canAppeal && (trail.data.reason?.appealable ?? true) && (
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Explain why this should receive a second review."
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No moderation trail found.</p>
        )}
        <DialogFooter>
          {canAppeal && trail.data && (trail.data.reason?.appealable ?? true) && (
            <Button onClick={submitAppeal} disabled={appeal.isPending || message.trim().length < 10} className="h-10">
              {appeal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit appeal
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CreatorStudio() {
  const { user, loading: authLoading } = useAuth();
  const account = useCreatorAccount();
  const uploads = useMyUploads();
  // 7-day window is enough to tell "no one watched" from "telemetry broke".
  const analytics = useCreatorAnalytics(7);
  const telemetry = useTelemetryHealth(uploads.data, analytics.data);

  const stats = useMemo(() => {
    const rows = uploads.data ?? [];
    return {
      published: rows.filter((r) => r.status === "approved").length,
      inReview: rows.filter((r) => r.status === "pending_review").length,
      views: rows.reduce((sum, r) => sum + (r.view_count ?? 0), 0),
    };
  }, [uploads.data]);

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <SEO
          path="/studio"
          title="Creator Studio — publish halal Islamic content on Heartify"
          description="Upload beneficial Islamic videos to Heartify. Human-reviewed, halal-verified, and served to a community that came to learn."
        />
        <PageHeader title="Creator Studio" subtitle="Publish beneficial Islamic content on Heartify." />
        <div className="container mx-auto max-w-md px-4 pb-16 text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to open your creator profile.
          </p>
          <Button asChild className="mt-4 h-11 w-full">
            <Link to="/login">Sign in</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        path="/studio"
        title="Creator Studio — publish halal Islamic content on Heartify"
        description="Upload beneficial Islamic videos to Heartify. Human-reviewed, halal-verified, and served to a community that came to learn."
      />
      <PageHeader
        title="Creator Studio"
        subtitle="Upload beneficial Islamic content. Every video is human-reviewed before it goes live."
        icon={Video}
      />
      <div className="container mx-auto max-w-2xl space-y-5 px-4 pb-24">
        {account.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : !account.data ? (
          <CreatorOnboarding onCreated={() => account.refetch()} />
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div>
                  <p className="font-semibold text-foreground">{account.data.display_name}</p>
                  <p className="text-xs text-muted-foreground">@{account.data.handle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline" className="h-9">
                    <Link to={`/c/${account.data.handle}`}>Public profile</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-9">
                    <Link to="/studio/appeals">Appeals</Link>
                  </Button>
                  <Button asChild size="sm" className="h-9">
                    <Link to="/studio/analytics"><BarChart3 className="mr-2 h-4 w-4" /> Analytics</Link>
                  </Button>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <p className="text-lg font-semibold tabular-nums">{stats.published}</p>
                    <p className="text-[11px] text-muted-foreground">Published</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums">{stats.inReview}</p>
                    <p className="text-[11px] text-muted-foreground">In review</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold tabular-nums">{stats.views}</p>
                    <p className="text-[11px] text-muted-foreground">Views</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {telemetry.status === "stalled" && (
              <div
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
                data-testid="telemetry-stalled-alert"
                role="status"
              >
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  Views are stuck at zero
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You have {telemetry.publishedCount} published{" "}
                  {telemetry.publishedCount === 1 ? "video" : "videos"} live for more than a
                  day, but Heartify has recorded no plays at all. That usually means playback
                  telemetry is being blocked rather than that nobody watched. Open one of your
                  videos below and let it play for a few seconds — if the count still does not
                  move, contact us and we will investigate.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3 h-9">
                  <Link to="/contact">Report this</Link>
                </Button>
              </div>
            )}

            {account.data.status !== "active" ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">
                    Your creator account is {account.data.status}. Uploading is paused.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="h-11">
                      <a href="#creator-uploads">Review upload decisions</a>
                    </Button>
                    <Button asChild variant="ghost" className="h-11">
                      <Link to="/studio/appeals">Appeal status</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <UploadForm />
            )}

            <section id="creator-uploads">
              <h2 className="mb-2 text-sm font-semibold text-foreground">Your uploads</h2>
              {uploads.isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (uploads.data ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                  Nothing uploaded yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {(uploads.data ?? []).map((u) => (
                    <li key={u.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{u.title}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {u.language.toUpperCase()} · {u.category ?? "uncategorised"} ·{" "}
                            {new Date(u.created_at).toLocaleDateString()}
                          </p>
                          {u.moderation_reason && (
                            <p className="mt-1 text-[11px] text-destructive">
                              Reason: {u.moderation_reason}
                            </p>
                          )}
                          {u.review_notes && (
                            <p className="mt-1 text-[11px] text-muted-foreground">{u.review_notes}</p>
                          )}
                        </div>
                        <Badge className={`shrink-0 ${STATUS_TONE[u.status]}`} variant="secondary">
                          {STATUS_LABEL[u.status]}
                        </Badge>
                      </div>
                      {(u.status === "pending_review" || u.status === "approved") && (
                        <CaptionQualityPanel uploadId={u.id} durationSeconds={u.duration_seconds} />
                      )}
                      {u.status === "approved" && (
                        <Link
                          to={`/u/${u.id}`}
                          className="mt-2 inline-block text-xs text-primary underline"
                        >
                          View on Heartify
                        </Link>
                      )}
                      {(u.status === "rejected" || u.status === "removed" || u.status === "pending_review") && (
                        <UploadModerationActions upload={{ id: u.id, status: u.status, title: u.title }} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
