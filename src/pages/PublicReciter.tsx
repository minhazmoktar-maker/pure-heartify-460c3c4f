import { useParams, Link, Navigate } from "react-router-dom";
import { useMemo } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, Mic, MapPin, PlayCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { RECITERS, reciterById } from "@/data/reciters";
import { reciterHasAudio, reciterQuranTracks } from "@/data/reciterCatalog";
import { SURAHS } from "@/data/surahs";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";
import DownloadTrackButton from "@/components/DownloadTrackButton";
import ReciterDownloadAllButton from "@/components/offline/ReciterDownloadAllButton";


/**
 * R4 — Programmatic-SEO landing for every reciter in the catalog.
 * URL: /reciter/:id. Emits its own title, meta description, canonical,
 * MusicGroup JSON-LD, and links directly into the Listen player.
 */
export default function PublicReciter() {
  const { id = "" } = useParams();
  const idx = RECITERS.findIndex((r) => r.id === id);
  const r = idx >= 0 ? RECITERS[idx] : null;
  const prev = idx > 0 ? RECITERS[idx - 1] : null;
  const next = idx >= 0 && idx < RECITERS.length - 1 ? RECITERS[idx + 1] : null;

  const hasAudio = useMemo(() => (r ? reciterHasAudio(r) : false), [r]);
  const quranTracks = useMemo(() => (r ? reciterQuranTracks(r.id) : []), [r]);


  if (!r) return <Navigate to="/listen" replace />;

  const path = `/reciter/${r.id}`;
  const url = `https://heartifyapp.com${path}`;
  const title = `${r.name} — Full Qur'an Recitation · Heartify`;
  const description = `Listen to the complete Qur'an recited by ${r.name}${r.location ? ` (${r.location})` : ""} — 114 surahs, streamed from a verified public mount.`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `reciter:${r.id}`,
      title: `${r.name} · Heartify`,
      text: `🎧 Full Qur'an recitation by ${r.name} on Heartify.`,
      url,
    });
    await track("reciter.shared", { id: r.id });
  };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      name: r.name,
      url,
      genre: "Qur'an recitation",
      ...(r.location ? { location: { "@type": "Place", name: r.location } } : {}),
    },
    hasAudio
      ? {
          "@context": "https://schema.org",
          "@type": "MusicAlbum",
          name: `Complete Qur'an — ${r.name}`,
          byArtist: { "@type": "MusicGroup", name: r.name },
          numTracks: 114,
          url,
        }
      : null,
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        type="profile"
        title={title}
        description={description}
        path={path}
        jsonLd={jsonLd}
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
          <CardContent className="pt-8 pb-8 space-y-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-micro uppercase tracking-widest text-muted-foreground">
              <Mic className="h-4 w-4 text-primary" />
              Reciter {idx + 1} of {RECITERS.length}
            </div>
            <h1 className="text-title md:text-display font-semibold">{r.name}</h1>
            {r.location && (
              <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {r.location}
              </p>
            )}
            <p className="text-base md:text-heading text-muted-foreground max-w-prose mx-auto">
              {hasAudio
                ? `Complete 114-surah mus'haf recited by ${r.name}, streamed from a verified public mount. Tap any surah below to play instantly.`
                : `${r.name} is on our roster — a verified public recording is coming soon. Follow Heartify to be notified when it goes live.`}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {hasAudio && (
                <Button asChild size="lg">
                  <Link
                    to={`/listen?reciter=${r.id}`}
                    onClick={() => track("reciter.play_opened", { id: r.id })}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" /> Play recitation
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to="/listen">All reciters</Link>
              </Button>
              <Button variant="outline" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {hasAudio && (
          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                114 surahs
              </h2>
              <ReciterDownloadAllButton
                reciterId={r.id}
                reciterName={r.name}
                tracks={quranTracks}
              />
            </div>
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
              {SURAHS.map((s, i) => {
                const t = quranTracks[i];
                return (
                  <li key={s.number}>
                    <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card/40 pr-1 hover:border-primary/40 hover:bg-card">
                      <Link
                        to={`/listen?reciter=${r.id}&surah=${s.number}`}
                        className="flex min-h-[44px] flex-1 items-center gap-2 px-3 py-2 text-sm"
                      >
                        <span className="w-8 tabular-nums text-muted-foreground">
                          {s.number}
                        </span>
                        <span className="flex-1 truncate">{s.nameEn}</span>
                        <span
                          dir="rtl"
                          lang="ar"
                          className="ml-2 text-primary/80"
                          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                        >
                          {s.nameAr}
                        </span>
                      </Link>
                      {t && <DownloadTrackButton track={t} className="shrink-0" />}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}


        <div className="mt-8 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" disabled={!prev}>
            <Link to={prev ? `/reciter/${prev.id}` : "#"}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {prev ? prev.name : "Previous"}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" disabled={!next}>
            <Link to={next ? `/reciter/${next.id}` : "#"}>
              {next ? next.name : "Next"} <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
