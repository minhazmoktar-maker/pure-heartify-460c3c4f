/**
 * /originals — Heartify Originals: native, community-uploaded halal content.
 *
 * Only rows that are `approved` AND visually verified `clean` are readable by
 * RLS, so this surface can never show unreviewed uploads.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PlayCircle, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { UPLOAD_LANGUAGES } from "@/hooks/useCreatorStudio";
import { useUploadCaptionsIndex } from "@/hooks/useUploadCaptions";
import { resolveCaptionTrack } from "@/lib/captionFallback";
import CaptionPicker from "@/components/CaptionPicker";
import { useLocale } from "@/contexts/LocaleContext";
import { useNavigate } from "react-router-dom";

interface OriginalRow {
  id: string;
  title: string;
  description: string | null;
  language: string;
  category: string | null;
  duration_seconds: number | null;
  view_count: number;
  published_at: string | null;
  creator: { display_name: string; handle: string } | null;
}

function duration(seconds: number | null) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Per-card caption picker: defaults to the native lane, falls back gracefully. */
function CaptionRow({
  uploadId,
  contentLanguage,
  tracks,
  loading,
  nativeLanguage,
  uiLanguage,
  onPick,
}: {
  uploadId: string;
  contentLanguage: string;
  tracks: Array<{ language: string; source: string }>;
  loading: boolean;
  nativeLanguage: string | undefined;
  uiLanguage: string;
  onPick: (language: string) => void;
}) {
  const { track } = resolveCaptionTrack(tracks, {
    nativeLanguage,
    uiLanguage,
    contentLanguage,
  });
  return (
    <div className="mt-2">
      <CaptionPicker
        compact
        tracks={tracks}
        selected={track?.language ?? null}
        reason="native"
        loading={loading}
        onSelect={onPick}
        testId={`originals-caption-picker-${uploadId}`}
      />
    </div>
  );
}

export default function Originals() {
  const [language, setLanguage] = useState<string>("all");
  const navigate = useNavigate();
  const { preferences, locale: uiLanguage } = useLocale();
  const primaryLanguage = preferences.content_languages?.[0];

  const query = useQuery({
    queryKey: ["heartify-originals", language],
    staleTime: 60_000,
    queryFn: async (): Promise<OriginalRow[]> => {
      let q = supabase
        .from("creator_uploads")
        .select(
          "id,title,description,language,category,duration_seconds,view_count,published_at,creator:creator_accounts(display_name,handle)",
        )
        .eq("status", "approved")
        .eq("visual_state", "clean")
        .order("published_at", { ascending: false })
        .limit(60);
      if (language !== "all") q = q.eq("language", language);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OriginalRow[];
    },
  });

  const languages = useMemo(
    () => [{ code: "all", label: "All languages" }, ...UPLOAD_LANGUAGES],
    [],
  );

  const rows = query.data ?? [];
  // One batched lookup keeps the per-card caption pickers cheap.
  const captionIndex = useUploadCaptionsIndex(rows.map((r) => r.id));

  return (
    <>
      <SEO
        path="/originals"
        title="Heartify Originals — community-uploaded halal Islamic videos"
        description="Beneficial Islamic videos uploaded directly to Heartify by teachers, students and institutions. Human-reviewed and halal-verified before publishing."
      />
      <PageHeader
        title="Heartify Originals"
        subtitle="Uploaded directly to Heartify by teachers, students and institutions — reviewed before publishing."
        icon={Sparkles}
        actions={
          <Button asChild size="sm" className="h-9">
            <Link to="/studio">Upload</Link>
          </Button>
        }
      />
      <div className="container mx-auto max-w-4xl px-4 pb-24">
        <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`min-h-[36px] shrink-0 rounded-full border px-3 text-xs ${
                language === l.code
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {query.isLoading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No published originals in this language yet.
            </p>
            <Button asChild className="mt-4 h-11">
              <Link to="/studio">Be the first to publish</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/40"
              >
                <Link to={`/u/${row.id}`} className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    <span className="uppercase">{row.language}</span>
                    {row.category && <Badge variant="secondary" className="capitalize">{row.category}</Badge>}
                    {duration(row.duration_seconds) && <span>{duration(row.duration_seconds)}</span>}
                  </div>
                  <h2 className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">
                    {row.title}
                  </h2>
                  {row.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {row.description}
                    </p>
                  )}
                </Link>
                <CaptionRow
                  uploadId={row.id}
                  contentLanguage={row.language}
                  tracks={captionIndex.data?.[row.id] ?? []}
                  loading={captionIndex.isLoading}
                  nativeLanguage={primaryLanguage}
                  uiLanguage={uiLanguage}
                  onPick={(lang) => navigate(`/u/${row.id}?cc=${lang}`)}
                />
                {/* Creator link is a sibling of the video link, never nested —
                    nested anchors are invalid and swallow the inner tap. */}
                <p className="mt-auto flex flex-wrap items-center gap-1 pt-3 text-[11px] text-muted-foreground">
                  {row.creator?.handle ? (
                    <Link
                      to={`/c/${row.creator.handle}`}
                      data-testid="originals-creator-link"
                      className="min-h-[24px] font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {row.creator.display_name}
                    </Link>
                  ) : (
                    <span>Heartify creator</span>
                  )}
                  <span>·</span>
                  <span>{row.view_count} views</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
