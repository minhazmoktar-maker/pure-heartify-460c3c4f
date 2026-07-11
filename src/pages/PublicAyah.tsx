import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Share2, Play, Pause, BookX } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";

interface AyahPayload {
  text: string;
  numberInSurah: number;
  audio?: string;
  surah: { number: number; englishName: string; name: string; englishNameTranslation: string; numberOfAyahs: number };
}

async function fetchEdition(surah: number, verse: number, edition: string): Promise<AyahPayload | null> {
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${verse}/${edition}`);
    if (!res.ok) return null;
    const body = await res.json();
    if (body.code !== 200) return null;
    return body.data as AyahPayload;
  } catch { return null; }
}

export default function PublicAyah() {
  const { surah = "1", verse = "1" } = useParams();
  const surahN = Math.max(1, Math.min(114, parseInt(surah, 10) || 1));
  const verseN = Math.max(1, parseInt(verse, 10) || 1);
  const [arabic, setArabic] = useState<AyahPayload | null>(null);
  const [english, setEnglish] = useState<AyahPayload | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setNotFound(false);
      const [ar, en, aud] = await Promise.all([
        fetchEdition(surahN, verseN, "quran-uthmani"),
        fetchEdition(surahN, verseN, "en.sahih"),
        fetchEdition(surahN, verseN, "ar.alafasy"),
      ]);
      if (!mounted) return;
      if (!ar || !en) { setNotFound(true); setLoading(false); return; }
      setArabic(ar); setEnglish(en);
      if (aud?.audio) setAudio(new Audio(aud.audio));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [surahN, verseN]);

  useEffect(() => () => { audio?.pause(); }, [audio]);

  const toggle = () => {
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      audio.onended = () => setPlaying(false);
    }
  };

  const ref = arabic ? `${arabic.surah.englishName} ${arabic.surah.number}:${arabic.numberInSurah}` : `${surahN}:${verseN}`;
  const excerpt = english?.text ? english.text.slice(0, 140) : "A verse from the Noble Qur'an";
  const url = `${window.location.origin}/ayah/${surahN}/${verseN}`;

  const onShare = async () => {
    await shareContent({
      kind: "badge_earned",
      refId: `${surahN}:${verseN}`,
      title: `Qur'an ${ref} — Heartify`,
      text: `📖 ${ref}: "${excerpt}${excerpt.length >= 140 ? '…' : ''}"`,
      url,
    });
    await track("ayah.shared", { surah: surahN, verse: verseN });
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`Qur'an ${ref} — Heartify`}
        description={`${ref}: ${excerpt}${excerpt.length >= 140 ? '…' : ''}`}
        path={`/ayah/${surahN}/${verseN}`}
      />
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : notFound || !arabic ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <h1 className="text-xl font-semibold">Verse not found</h1>
              <p className="text-sm text-muted-foreground">
                Sūrah {surahN}, verse {verseN} could not be loaded.
              </p>
              <Button asChild variant="outline"><Link to="/quran">Browse the Qur'an</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
              <CardContent className="pt-8 pb-8 space-y-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Sūrah {arabic.surah.englishName} · {arabic.surah.number}:{arabic.numberInSurah}
                  </span>
                  <span>{arabic.surah.englishNameTranslation}</span>
                </div>

                <p
                  dir="rtl"
                  lang="ar"
                  className="text-3xl md:text-4xl leading-loose text-right font-arabic text-foreground"
                  style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
                >
                  {arabic.text}
                </p>

                {english && (
                  <p className="text-base md:text-lg leading-relaxed text-muted-foreground border-l-2 border-primary/40 pl-4">
                    {english.text}
                  </p>
                )}

                {audio && (
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={toggle} className="gap-2">
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {playing ? "Pause" : "Listen"} — Mishary Alafasy
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to={`/quran/${surahN}`}>Read full sūrah</Link>
              </Button>
              <Button variant="outline" onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button asChild variant="ghost">
                <Link to="/signup">Join Heartify</Link>
              </Button>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Translation: Saheeh International · Recitation: Mishary Alafasy
            </p>
          </>
        )}
      </main>
    </div>
  );
}
