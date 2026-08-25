/**
 * /u/:id — watch a native Heartify upload.
 *
 * Playback uses a short-lived signed URL minted server-side; unapproved rows
 * are only ever resolvable by their owner or a moderator.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUploadPlayback } from "@/hooks/useCreatorStudio";

interface Row {
  id: string;
  title: string;
  description: string | null;
  language: string;
  category: string | null;
  status: string;
  view_count: number;
  published_at: string | null;
  creator: { display_name: string; handle: string } | null;
}

export default function WatchUpload() {
  const { id } = useParams<{ id: string }>();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const playback = useUploadPlayback(id);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("creator_uploads")
        .select(
          "id,title,description,language,category,status,view_count,published_at,creator:creator_accounts(display_name,handle)",
        )
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      setRow((data as unknown as Row) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!row) {
    return (
      <>
        <SEO path={`/u/${id}`} title="Video not available — Heartify" description="This Heartify upload is not available." />
        <PageHeader title="Not available" subtitle="This video isn't published on Heartify." />
        <div className="container mx-auto max-w-md px-4 pb-16 text-center">
          <Button asChild className="h-11">
            <Link to="/originals">Browse Heartify Originals</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        path={`/u/${row.id}`}
        title={`${row.title} — Heartify Originals`}
        description={(row.description ?? row.title).slice(0, 155)}
      />
      <div className="container mx-auto max-w-3xl px-4 pb-24 pt-4">
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          {playback.loading ? (
            <div className="flex aspect-video items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : playback.url ? (
            <video
              key={playback.url}
              src={playback.url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {playback.error ?? "Playback unavailable."}
            </div>
          )}
        </div>

        <h1 className="mt-4 text-lg font-semibold text-foreground">{row.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{row.creator?.display_name ?? "Heartify creator"}</span>
          <span>·</span>
          <span>{row.view_count} views</span>
          <span className="uppercase">{row.language}</span>
          {row.category && (
            <Badge variant="secondary" className="capitalize">
              {row.category}
            </Badge>
          )}
          {row.status === "approved" && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Halal reviewed
            </span>
          )}
        </div>
        {row.status !== "approved" && (
          <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            This upload is {row.status.replace("_", " ")} and is only visible to you and the review team.
          </p>
        )}
        {row.description && (
          <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{row.description}</p>
        )}
      </div>
    </>
  );
}
