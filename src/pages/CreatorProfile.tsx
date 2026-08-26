/**
 * /c/:handle — public creator profile for native Heartify creators.
 *
 * Public viewers see only approved, clean uploads. The creator and moderators
 * also see moderation status so rejected/pending videos are auditable.
 */
import { Link, useParams } from "react-router-dom";
import { Loader2, ShieldCheck, Users, Video } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCreatorProfile, useSubscribeToCreator, type ProfileUpload } from "@/hooks/useCreatorInsights";
import { formatDuration } from "@/lib/uploadMedia";

const statusLabel: Record<string, string> = {
  approved: "Published",
  pending_review: "In review",
  rejected: "Not accepted",
  removed: "Removed",
  uploading: "Incomplete",
  draft: "Draft",
};

function UploadCard({ upload, isOwner }: { upload: ProfileUpload; isOwner: boolean }) {
  const duration = formatDuration(upload.duration_seconds);
  const isLive = upload.status === "approved" && upload.visual_state === "clean";
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-sm font-semibold text-foreground">{upload.title}</h2>
          <p className="mt-1 text-[11px] uppercase text-muted-foreground">
            {upload.language} {upload.category ? `· ${upload.category}` : ""} {duration ? `· ${duration}` : ""}
          </p>
        </div>
        <Badge variant={isLive ? "outline" : "secondary"} className="shrink-0 text-[10px]">
          {statusLabel[upload.status] ?? upload.status}
        </Badge>
      </div>
      {upload.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{upload.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{upload.view_count.toLocaleString()} views</span>
        {upload.published_at && <span>{new Date(upload.published_at).toLocaleDateString()}</span>}
        {upload.review_notes && isOwner && <span>Reviewer notes available</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {isLive && (
          <Button asChild size="sm" className="h-9">
            <Link to={`/u/${upload.id}`}>Watch</Link>
          </Button>
        )}
        {isOwner && (
          <Button asChild size="sm" variant="outline" className="h-9">
            <Link to="/studio">Open in Studio</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

export default function CreatorProfile() {
  const { handle } = useParams<{ handle: string }>();
  const profile = useCreatorProfile(handle);
  const subscribe = useSubscribeToCreator(handle);
  const data = profile.data;

  if (profile.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <SEO path={`/c/${handle ?? ""}`} title="Creator not found — Heartify" description="This Heartify creator profile is not available." />
        <h1 className="text-xl font-semibold text-foreground">Creator not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This profile is not available.</p>
        <Button asChild className="mt-4 h-11">
          <Link to="/originals">Browse Heartify Originals</Link>
        </Button>
      </main>
    );
  }

  const title = `${data.display_name} — Heartify creator`;
  const description = (data.bio || `Watch halal Islamic videos from ${data.display_name} on Heartify.`).slice(0, 155);

  return (
    <>
      <SEO path={`/c/${data.handle}`} title={title} description={description} />
      <PageHeader title={data.display_name} subtitle={`@${data.handle}`} icon={Video} />
      <main className="container mx-auto max-w-3xl space-y-5 px-4 pb-24">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {data.bio && <p className="text-sm leading-relaxed text-muted-foreground">{data.bio}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {data.subscriber_count.toLocaleString()} subscribers</span>
                <span>{data.published_count.toLocaleString()} uploads</span>
                <span>{data.total_views.toLocaleString()} views</span>
                {data.country && <span>{data.country}</span>}
              </div>
            </div>
            {data.status === "active" ? (
              <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> Active</Badge>
            ) : (
              <Badge variant="secondary" className="capitalize">{data.status}</Badge>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.is_owner && (
              <Button asChild className="h-10">
                <Link to="/studio/analytics">Analytics</Link>
              </Button>
            )}
            {!data.is_owner && (
              <Button
                className="h-10"
                variant={data.viewer_subscribed ? "outline" : "default"}
                disabled={!subscribe.canSubscribe || subscribe.isPending}
                onClick={() => subscribe.mutate(data.id)}
              >
                {subscribe.isPending ? "Saving…" : data.viewer_subscribed ? "Subscribed" : "Subscribe"}
              </Button>
            )}
          </div>
        </section>

        <section>
          <h1 className="sr-only">{data.display_name} Heartify creator profile</h1>
          <h2 className="mb-2 text-sm font-semibold text-foreground">Latest uploads</h2>
          {data.uploads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No published uploads yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.uploads.map((upload) => <UploadCard key={upload.id} upload={upload} isOwner={data.is_owner} />)}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}