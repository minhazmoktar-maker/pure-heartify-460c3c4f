/**
 * /u/:id — watch a native Heartify upload.
 *
 * Playback uses a short-lived signed URL minted server-side; unapproved rows
 * are only ever resolvable by their owner or a moderator. Captions come from
 * `creator_upload_captions` (auto-generated on approval) and are attached as
 * WebVTT tracks; viewers can request a translation into their own language.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Captions, Loader2, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUploadPlayback } from "@/hooks/useCreatorStudio";
import { useUploadTelemetry } from "@/hooks/useCreatorInsights";
import {
  usePrefetchUploadCaptions,
  useRequestCaptions,
  useUploadCaptions,
  useVttUrls,
} from "@/hooks/useUploadCaptions";
import { useLocale } from "@/contexts/LocaleContext";
import CaptionPicker, { isRtlCaption } from "@/components/CaptionPicker";
import CaptionOverlay from "@/components/CaptionOverlay";
import CaptionSettingsSheet from "@/components/CaptionSettingsSheet";
import CaptionLoadProgress from "@/components/CaptionLoadProgress";
import { captionPerfSummary, captionNetworkClass } from "@/lib/captionPerf";
import { resolveCaptionTrack } from "@/lib/captionFallback";
import { isNativeItem, languageLabel } from "@/components/LaneToggle";
import { trackLaneEvent, flushLaneEvents } from "@/lib/laneTelemetry";
import { toast } from "@/hooks/use-toast";

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
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const playback = useUploadPlayback(id);
  const telemetry = useUploadTelemetry(id);
  const { preferences, locale: uiLanguage } = useLocale();
  const primaryLanguage = preferences.content_languages?.[0];

  const captions = useUploadCaptions(id);
  const requestCaptions = useRequestCaptions(id);
  const vttUrls = useVttUrls(captions.data);

  // Warm the caption tracks of the uploads queued behind this one, so pressing
  // "next" on a 3G connection does not mean waiting for subtitles again. Ids are
  // resolved once per video and capped, so this never becomes a request storm.
  const [nextUpIds, setNextUpIds] = useState<string[]>([]);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("creator_uploads")
        .select("id")
        .eq("status", "approved")
        .neq("id", id)
        .order("published_at", { ascending: false })
        .limit(4);
      if (!cancelled) setNextUpIds(((data ?? []) as Array<{ id: string }>).map((r) => r.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);
  usePrefetchUploadCaptions(nextUpIds, 4);

  // ?cc=xx deep-links a caption language (used by Originals cards); otherwise
  // the fallback chain picks the native lane track and degrades gracefully.
  const [searchParams] = useSearchParams();
  const [preferredCaption, setPreferredCaption] = useState<string | null>(
    searchParams.get("cc"),
  );
  const tracks = captions.data ?? [];
  const { track: activeCaption, reason: captionReason } = useMemo(
    () =>
      resolveCaptionTrack(tracks, {
        preferred: preferredCaption,
        nativeLanguage: primaryLanguage,
        uiLanguage,
        contentLanguage: row?.language,
      }),
    [tracks, preferredCaption, primaryLanguage, uiLanguage, row?.language],
  );
  const hasPrimaryCaptions =
    !primaryLanguage ||
    tracks.some((t) => t.language.split("-")[0] === primaryLanguage);


  const lane = useMemo(
    () => (isNativeItem(row?.language, primaryLanguage) ? "native" : "diversified") as
      | "native"
      | "diversified",
    [row?.language, primaryLanguage],
  );

  // Watch-time per lane feeds the 80/20 validation dashboards.
  const watchRef = useRef({ watched: 0, duration: 0, last: 0 });
  useEffect(() => {
    if (!row) return;
    return () => {
      const { watched, duration } = watchRef.current;
      if (watched < 3) return;
      trackLaneEvent({
        kind: "watch",
        lane,
        video_id: row.id,
        country: preferences.country_code ?? preferences.detected_country ?? null,
        ui_language: uiLanguage,
        content_language: row.language,
        watched_seconds: Math.round(watched),
        duration_seconds: Math.round(duration),
      });
      void flushLaneEvents();
    };
  }, [row, lane, preferences.country_code, preferences.detected_country, uiLanguage]);

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
        <div className="relative overflow-hidden rounded-xl border border-border bg-black">
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
              crossOrigin="anonymous"
              className="aspect-video w-full"
              onTimeUpdate={(event) => {
                const video = event.currentTarget;
                telemetry.onTimeUpdate(video.currentTime, video.duration || 0);
                setPlayheadSeconds(video.currentTime);
                const state = watchRef.current;
                const delta = video.currentTime - state.last;
                if (delta > 0 && delta < 4) state.watched += delta;
                state.last = video.currentTime;
                state.duration = video.duration || state.duration;
              }}
              onPlay={() => telemetry.onAutoplayResult(true)}
              onError={() => telemetry.onAutoplayResult(false)}
            >
              {/* Tracks stay attached for native browser CC menus and for
                  downloads; on-screen rendering is handled by CaptionOverlay so
                  the viewer's size/background/RTL settings apply everywhere. */}
              {tracks.map((track) => (
                <track
                  key={track.language}
                  kind="captions"
                  src={vttUrls[track.language]}
                  srcLang={track.language}
                  label={`${languageLabel(track.language)}${track.source === "mt" ? " (translated)" : ""}`}
                />
              ))}

            </video>
          ) : null}
          {playback.url ? (
            <CaptionOverlay
              segments={activeCaption ? tracks.find((t) => t.language === activeCaption.language)?.segments : undefined}
              language={activeCaption?.language}
              currentTime={playheadSeconds}
              testId="watch-caption-overlay"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-muted-foreground">
              {playback.error ?? "Playback unavailable."}
            </div>
          )}
        </div>

        <h1 className="mt-4 text-lg font-semibold text-foreground">{row.title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {row.creator?.handle ? (
            <Link to={`/c/${row.creator.handle}`} data-testid="watch-upload-creator-link" className="text-primary underline-offset-4 hover:underline">
              {row.creator.display_name}
            </Link>
          ) : (
            <span>{row.creator?.display_name ?? "Heartify creator"}</span>
          )}
          <span>·</span>
          <span>{row.view_count} views</span>
          <span className="uppercase">{row.language}</span>
          {row.category && (
            <Badge variant="secondary" className="capitalize">
              {row.category}
            </Badge>
          )}
          {tracks.length > 0 && (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Captions className="h-3.5 w-3.5" /> CC · {tracks.length}
            </span>
          )}

          {row.status === "approved" && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Halal reviewed
            </span>
          )}
        </div>

        {/* Caption picker (native lane first) + on-demand translation */}
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {captions.isLoading ? (
            <>
              <CaptionLoadProgress loading testId="watch-caption-progress" />
              <CaptionPicker
                tracks={[]}
                selected={null}
                reason="none"
                loading
                onSelect={() => undefined}
                testId="watch-caption-picker"
              />
            </>
          ) : tracks.length === 0 ? (
            <span data-testid="watch-upload-captions-pending">
              Captions are generated automatically after review — check back shortly.
            </span>
          ) : (
            <>
              <span data-testid="watch-upload-captions-badge" className="sr-only">
                CC · {tracks.length}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <CaptionPicker
                  tracks={tracks}
                  selected={activeCaption?.language ?? null}
                  reason={captionReason}
                  onSelect={setPreferredCaption}
                  testId="watch-caption-picker"
                />
                <CaptionSettingsSheet previewRtl={isRtlCaption(activeCaption?.language)} testId="watch-caption-settings" />
              </div>
              <span data-testid="watch-caption-perf" className="block text-[11px] text-muted-foreground">
                {tracks.length} track{tracks.length > 1 ? "s" : ""} loaded in {captionPerfSummary().p50}ms (p50) ·{" "}
                {captionNetworkClass()}
              </span>
            </>
          )}
          {!hasPrimaryCaptions && primaryLanguage && (
            <div className="flex flex-wrap items-center gap-2">
              <span>No captions in {languageLabel(primaryLanguage)} yet.</span>
              <Button
                size="sm"
                variant="secondary"
                className="h-8"
                data-testid="watch-upload-translate-captions"
                disabled={requestCaptions.isPending}
                onClick={() =>
                  requestCaptions.mutate(primaryLanguage, {
                    onError: (err) =>
                      toast({
                        title: "Translation unavailable",
                        description: (err as Error).message,
                        variant: "destructive",
                      }),
                  })
                }
              >
                {requestCaptions.isPending ? "Translating…" : `Translate to ${languageLabel(primaryLanguage)}`}
              </Button>
            </div>
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
